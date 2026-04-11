"""일일 학습 요약 자동 생성 서비스."""

from __future__ import annotations

import datetime
import logging

import anthropic

from ..config import settings
from ..db import get_commit_analyses_for_date, upsert_daily_summary

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 소프트웨어 개발 학습 분석 전문가입니다.
여러 커밋의 분석 요약을 종합하여, 오늘 하루 동안의 학습 활동을 한국어 문단으로 요약합니다.

규칙:
- 3~5문장의 자연스러운 한국어 문단으로 작성
- "무엇을 학습/연습했는지" 관점으로 작성
- 기술적 세부사항보다 학습 방향과 성장 포인트를 강조
- JSON이 아닌 순수 텍스트로만 응답"""


async def generate_daily_summary(user_id: str, date: datetime.date) -> None:
    """주어진 사용자/날짜의 일일 학습 요약을 생성하고 DB에 저장한다."""
    analyses = await get_commit_analyses_for_date(user_id, date)

    if not analyses:
        await upsert_daily_summary(
            user_id=user_id,
            date=datetime.datetime.combine(date, datetime.time.min),
            summary_text="오늘은 커밋 기록이 없습니다",
            commit_count=0,
            tags=[],
        )
        return

    # 커밋 요약 텍스트 수집
    diff_summaries = [a["diff_summary"] for a in analyses if a.get("diff_summary")]

    # 태그 수집 및 중복 제거
    all_tags: list[str] = []
    for a in analyses:
        tags = a.get("tags", [])
        if isinstance(tags, list):
            all_tags.extend(tags)
    unique_tags = list(dict.fromkeys(all_tags))

    commit_count = len(analyses)

    # Claude로 통합 요약 생성
    summary_text = await _call_claude_for_summary(diff_summaries)

    await upsert_daily_summary(
        user_id=user_id,
        date=datetime.datetime.combine(date, datetime.time.min),
        summary_text=summary_text,
        commit_count=commit_count,
        tags=unique_tags,
    )
    logger.info(
        "일일 요약 생성 완료 (user: %s, date: %s, commits: %d)", user_id, date, commit_count
    )


async def _call_claude_for_summary(diff_summaries: list[str]) -> str:
    """Claude API를 호출하여 통합 학습 요약을 생성한다."""
    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY 미설정 — 기본 요약 반환")
        return "오늘의 학습 활동: " + "; ".join(diff_summaries[:5])

    user_message = "오늘의 커밋 분석 요약들:\n" + "\n".join(f"- {s}" for s in diff_summaries)

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text.strip()
    except Exception:
        logger.exception("Claude API 호출 실패 — 기본 요약 반환")
        return "오늘의 학습 활동: " + "; ".join(diff_summaries[:5])
