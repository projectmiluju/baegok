"""주간 자동 리포트 Celery 태스크 테스트."""

from __future__ import annotations

import datetime
from unittest.mock import AsyncMock, patch

import pytest

from src.tasks.weekly_report import _generate_weekly_reports_async, _last_monday_and_sunday


def test_last_monday_and_sunday_계산이_올바르다() -> None:
    """_last_monday_and_sunday가 직전 주 월~일을 반환한다."""
    # 2026-04-10은 금요일 → 직전 주: 3/30(월) ~ 4/5(일)
    with patch("src.tasks.weekly_report.datetime") as mock_dt:
        mock_dt.date.today.return_value = datetime.date(2026, 4, 10)
        mock_dt.timedelta = datetime.timedelta
        monday, sunday = _last_monday_and_sunday()

    assert monday == datetime.date(2026, 3, 30)
    assert sunday == datetime.date(2026, 4, 5)
    assert monday.weekday() == 0  # 월요일
    assert sunday.weekday() == 6  # 일요일


@pytest.mark.asyncio
async def test_활성_사용자_없으면_정상_종료() -> None:
    """활성 사용자가 없으면 에러 없이 종료한다."""
    with patch("src.tasks.weekly_report.get_all_active_user_ids", AsyncMock(return_value=[])):
        result = await _generate_weekly_reports_async()

    assert result == {"processed": 0, "skipped": 0, "failed": 0}


@pytest.mark.asyncio
async def test_이미_리포트_존재하면_스킵() -> None:
    """이미 해당 주 리포트가 있으면 스킵한다."""
    with patch("src.tasks.weekly_report.get_all_active_user_ids", AsyncMock(return_value=["u1"])):
        with patch(
            "src.tasks.weekly_report.check_period_report_exists", AsyncMock(return_value=True)
        ):
            result = await _generate_weekly_reports_async()

    assert result["skipped"] == 1
    assert result["processed"] == 0


@pytest.mark.asyncio
async def test_리포트_정상_생성() -> None:
    """리포트가 없는 사용자에 대해 생성 및 저장한다."""
    summaries = [
        {"date": "2026-03-30", "summary_text": "React 학습", "commit_count": 3, "tags": ["React"]},
    ]
    report_result = {
        "summary": {
            "strengths": ["꾸준한 학습"],
            "weaknesses": [],
            "stats": {"totalCommits": 3, "activeDays": 1, "topTags": ["React"]},
        },
        "roadmap": {
            "recommended_topics": ["테스트"],
            "reasoning": "테스트 추천",
            "next_steps": ["Jest"],
        },
    }

    mock_save = AsyncMock()

    with patch("src.tasks.weekly_report.get_all_active_user_ids", AsyncMock(return_value=["u1"])):
        with patch(
            "src.tasks.weekly_report.check_period_report_exists", AsyncMock(return_value=False)
        ):
            with patch(
                "src.tasks.weekly_report.get_daily_summaries_for_period",
                AsyncMock(return_value=summaries),
            ):
                with patch(
                    "src.tasks.weekly_report.generate_report_and_roadmap",
                    AsyncMock(return_value=report_result),
                ):
                    with patch("src.tasks.weekly_report.save_period_report", mock_save):
                        result = await _generate_weekly_reports_async()

    assert result["processed"] == 1
    assert result["skipped"] == 0
    assert result["failed"] == 0
    mock_save.assert_called_once()
    call_kwargs = mock_save.call_args.kwargs
    assert call_kwargs["user_id"] == "u1"
    assert call_kwargs["report_type"] == "weekly_auto"
    assert call_kwargs["summary"] == report_result["summary"]
    assert call_kwargs["roadmap"] == report_result["roadmap"]


@pytest.mark.asyncio
async def test_개별_사용자_실패시_다른_사용자_계속_처리() -> None:
    """한 사용자가 실패해도 나머지 사용자는 계속 처리한다."""
    summaries = [
        {"date": "2026-03-30", "summary_text": "학습", "commit_count": 1, "tags": ["Python"]},
    ]
    report_result = {
        "summary": {
            "strengths": [],
            "weaknesses": [],
            "stats": {"totalCommits": 1, "activeDays": 1, "topTags": []},
        },
        "roadmap": {"recommended_topics": [], "reasoning": "", "next_steps": []},
    }

    call_count = 0

    async def mock_check(user_id, start_date, end_date, report_type):
        return False

    async def mock_get_summaries(user_id, start_date, end_date):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("DB 장애")
        return summaries

    with patch(
        "src.tasks.weekly_report.get_all_active_user_ids", AsyncMock(return_value=["u1", "u2"])
    ):
        with patch("src.tasks.weekly_report.check_period_report_exists", side_effect=mock_check):
            with patch(
                "src.tasks.weekly_report.get_daily_summaries_for_period",
                side_effect=mock_get_summaries,
            ):
                with patch(
                    "src.tasks.weekly_report.generate_report_and_roadmap",
                    AsyncMock(return_value=report_result),
                ):
                    with patch("src.tasks.weekly_report.save_period_report", AsyncMock()):
                        result = await _generate_weekly_reports_async()

    assert result["failed"] == 1
    assert result["processed"] == 1
