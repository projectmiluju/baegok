"""Kafka Consumer — commit-analysis 토픽을 구독하고 처리한다."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import httpx
from aiokafka import AIOKafkaConsumer

from .config import settings
from .crypto import decrypt_token
from .db import (
    check_analysis_exists,
    get_access_token_for_repo,
    get_user_id_for_repo,
    save_commit_analysis,
)
from .services.claude_analyzer import analyze_commit
from .services.daily_summary import generate_daily_summary
from .services.github_client import fetch_commit_diff

logger = logging.getLogger(__name__)

MAX_COMMITS_TO_ANALYZE = 50  # PRD §4: 대량 커밋 제한


async def process_message(data: dict) -> None:
    """Kafka 메시지 하나를 처리한다.

    1. DB에서 access_token 조회 + 복호화
    2. 각 commit에 대해 GitHub diff 조회 → Claude 분석 → DB 저장
    3. 50+ 커밋 시 상위 50개만 분석
    """
    repository_id: str = data.get("repository_id", "")
    full_name: str = data.get("full_name", "")
    commits: list[dict] = data.get("commits", [])

    if not repository_id or not full_name:
        logger.warning("메시지에 repository_id 또는 full_name 누락: %s", data)
        return

    # access_token 조회
    encrypted_token = await get_access_token_for_repo(repository_id)
    if not encrypted_token:
        logger.warning("레포 %s의 access_token을 찾을 수 없음", repository_id)
        return

    try:
        access_token = decrypt_token(encrypted_token)
    except Exception:
        logger.exception("access_token 복호화 실패 (repo: %s)", repository_id)
        return

    # 대량 커밋 제한
    commits_to_process = commits[:MAX_COMMITS_TO_ANALYZE]
    if len(commits) > MAX_COMMITS_TO_ANALYZE:
        logger.info(
            "커밋 %d개 중 상위 %d개만 분석 (repo: %s)",
            len(commits),
            MAX_COMMITS_TO_ANALYZE,
            full_name,
        )

    async with httpx.AsyncClient() as http_client:
        for commit in commits_to_process:
            sha: str = commit.get("sha", "")
            message: str = commit.get("message", "")
            timestamp_str: str = commit.get("timestamp", "")

            if not sha:
                continue

            try:
                # 0. 중복 체크 — Claude API 호출 전에 확인하여 비용 절약
                if await check_analysis_exists(repository_id, sha):
                    logger.info("커밋 %s 이미 분석됨 — 건너뜀 (%s)", sha[:7], full_name)
                    continue

                # 1. diff 조회
                diff = await fetch_commit_diff(access_token, full_name, sha, client=http_client)

                # 2. Claude 분석
                analysis = await analyze_commit(message, diff)

                # 3. DB 저장
                committed_at = (
                    datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    if timestamp_str
                    else datetime.now(timezone.utc)
                )
                await save_commit_analysis(
                    repository_id=repository_id,
                    commit_sha=sha,
                    commit_message=message,
                    committed_at=committed_at,
                    diff_summary=analysis["summary"],
                    tags=analysis["tags"],
                )
                logger.info("커밋 %s 분석 완료 (%s)", sha[:7], full_name)

            except Exception:
                logger.exception("커밋 %s 분석 실패 — 건너뜀 (PRD §4: 재시도 없음)", sha[:7])
                continue

    # 커밋 처리 완료 후 일일 요약 생성 (커밋이 여러 날짜에 걸칠 수 있으므로 모든 날짜에 대해 생성)
    try:
        user_id = await get_user_id_for_repo(repository_id)
        if user_id and commits_to_process:
            distinct_dates: set[str] = set()
            for commit in commits_to_process:
                ts = commit.get("timestamp", "")
                if ts:
                    commit_date = datetime.fromisoformat(ts.replace("Z", "+00:00")).date()
                else:
                    commit_date = datetime.now(timezone.utc).date()
                distinct_dates.add(commit_date.isoformat())
            for date_str in distinct_dates:
                d = datetime.fromisoformat(date_str).date()
                await generate_daily_summary(user_id, d)
    except Exception:
        logger.exception("일일 요약 생성 실패 (repo: %s)", full_name)


async def run_consumer() -> None:
    """Kafka Consumer 루프. 서버 시작 시 background task로 실행된다."""
    consumer = AIOKafkaConsumer(
        settings.kafka_topic,
        bootstrap_servers=settings.kafka_brokers,
        group_id=settings.kafka_group_id,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    await consumer.start()
    logger.info(
        "Kafka Consumer 시작 (topic: %s, group: %s)",
        settings.kafka_topic,
        settings.kafka_group_id,
    )

    try:
        async for msg in consumer:
            try:
                await process_message(msg.value)
            except Exception:
                logger.exception("메시지 처리 중 예외 — 건너뜀")
    finally:
        await consumer.stop()
        logger.info("Kafka Consumer 종료")
