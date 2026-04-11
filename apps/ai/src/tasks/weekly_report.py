"""주간 자동 리포트 생성 Celery 태스크."""

from __future__ import annotations

import asyncio
import datetime
import logging

from ..celery_app import celery_app
from ..db import (
    check_period_report_exists,
    get_all_active_user_ids,
    get_daily_summaries_for_period,
    save_period_report,
)
from ..services.report_generator import generate_report_and_roadmap

logger = logging.getLogger(__name__)


def _last_monday_and_sunday() -> tuple[datetime.date, datetime.date]:
    """직전 주의 월요일(start)과 일요일(end)을 반환한다."""
    today = datetime.date.today()
    # today.weekday(): 0=Mon … 6=Sun
    days_since_monday = today.weekday()  # 오늘이 월요일이면 0
    last_monday = today - datetime.timedelta(days=days_since_monday + 7)
    last_sunday = last_monday + datetime.timedelta(days=6)
    return last_monday, last_sunday


@celery_app.task(name="src.tasks.weekly_report.generate_weekly_reports")
def generate_weekly_reports() -> dict:
    """모든 활성 사용자에 대해 주간 리포트를 생성한다."""
    return asyncio.run(_generate_weekly_reports_async())


async def _generate_weekly_reports_async() -> dict:
    start_date, end_date = _last_monday_and_sunday()
    report_type = "weekly_auto"

    logger.info("주간 리포트 생성 시작: %s ~ %s", start_date, end_date)

    user_ids = await get_all_active_user_ids()
    if not user_ids:
        logger.info("활성 사용자 없음 — 태스크 종료")
        return {"processed": 0, "skipped": 0, "failed": 0}

    processed = 0
    skipped = 0
    failed = 0

    for user_id in user_ids:
        try:
            # 이미 존재하면 스킵
            exists = await check_period_report_exists(user_id, start_date, end_date, report_type)
            if exists:
                logger.info("사용자 %s: 이미 리포트 존재 — 스킵", user_id)
                skipped += 1
                continue

            # DailySummary 조회
            summaries = await get_daily_summaries_for_period(user_id, start_date, end_date)

            # 리포트 생성
            result = await generate_report_and_roadmap(
                summaries,
                str(start_date),
                str(end_date),
            )

            # DB 저장
            await save_period_report(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
                report_type=report_type,
                summary=result["summary"],
                roadmap=result["roadmap"],
            )

            processed += 1
            logger.info("사용자 %s: 리포트 생성 완료", user_id)

        except Exception:
            failed += 1
            logger.exception("사용자 %s: 리포트 생성 실패", user_id)

    result_summary = {"processed": processed, "skipped": skipped, "failed": failed}
    logger.info("주간 리포트 생성 완료: %s", result_summary)
    return result_summary
