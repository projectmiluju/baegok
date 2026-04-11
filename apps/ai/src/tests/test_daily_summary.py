"""일일 학습 요약 생성 서비스 테스트."""

from __future__ import annotations

import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.daily_summary import generate_daily_summary


@pytest.mark.asyncio
async def test_커밋_없으면_빈_요약을_저장한다() -> None:
    """커밋이 0개이면 '오늘은 커밋 기록이 없습니다' 요약을 생성한다."""
    mock_upsert = AsyncMock()
    with patch(
        "src.services.daily_summary.get_commit_analyses_for_date", AsyncMock(return_value=[])
    ):
        with patch("src.services.daily_summary.upsert_daily_summary", mock_upsert):
            await generate_daily_summary("user_1", datetime.date(2026, 4, 10))

    mock_upsert.assert_called_once()
    call_kwargs = mock_upsert.call_args.kwargs
    assert call_kwargs["summary_text"] == "오늘은 커밋 기록이 없습니다"
    assert call_kwargs["commit_count"] == 0
    assert call_kwargs["tags"] == []


@pytest.mark.asyncio
async def test_커밋_있으면_Claude로_요약을_생성한다() -> None:
    """커밋이 있으면 Claude를 호출하여 통합 요약을 생성한다."""
    analyses = [
        {
            "commit_sha": "abc123",
            "commit_message": "feat: 기능 추가",
            "diff_summary": "React 컴포넌트를 작성하는 연습",
            "tags": ["React", "TypeScript"],
            "committed_at": datetime.datetime(2026, 4, 10, 12, 0, 0),
        },
        {
            "commit_sha": "def456",
            "commit_message": "fix: 버그 수정",
            "diff_summary": "상태 관리 버그를 수정하는 연습",
            "tags": ["React", "state-management"],
            "committed_at": datetime.datetime(2026, 4, 10, 14, 0, 0),
        },
    ]

    mock_response = MagicMock()
    mock_response.content = [
        MagicMock(text="오늘은 React 컴포넌트 작성과 상태 관리를 학습했습니다.")
    ]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    mock_upsert = AsyncMock()

    with patch(
        "src.services.daily_summary.get_commit_analyses_for_date", AsyncMock(return_value=analyses)
    ):
        with patch("src.services.daily_summary.upsert_daily_summary", mock_upsert):
            with patch("src.services.daily_summary.settings") as mock_settings:
                mock_settings.anthropic_api_key = "test-key"
                with patch(
                    "src.services.daily_summary.anthropic.AsyncAnthropic",
                    return_value=mock_client,
                ):
                    await generate_daily_summary("user_1", datetime.date(2026, 4, 10))

    mock_upsert.assert_called_once()
    call_kwargs = mock_upsert.call_args.kwargs
    assert call_kwargs["summary_text"] == "오늘은 React 컴포넌트 작성과 상태 관리를 학습했습니다."
    assert call_kwargs["commit_count"] == 2
    # 중복 제거된 태그
    assert "React" in call_kwargs["tags"]
    assert "TypeScript" in call_kwargs["tags"]
    assert "state-management" in call_kwargs["tags"]
    # React는 한 번만
    assert call_kwargs["tags"].count("React") == 1


@pytest.mark.asyncio
async def test_Claude_실패시_기본_요약을_반환한다() -> None:
    """Claude API 실패 시 기본 요약 텍스트로 저장한다."""
    analyses = [
        {
            "commit_sha": "abc123",
            "commit_message": "feat: 기능",
            "diff_summary": "기능 구현 연습",
            "tags": ["Python"],
            "committed_at": datetime.datetime(2026, 4, 10, 12, 0, 0),
        },
    ]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(side_effect=RuntimeError("API 장애"))

    mock_upsert = AsyncMock()

    with patch(
        "src.services.daily_summary.get_commit_analyses_for_date", AsyncMock(return_value=analyses)
    ):
        with patch("src.services.daily_summary.upsert_daily_summary", mock_upsert):
            with patch("src.services.daily_summary.settings") as mock_settings:
                mock_settings.anthropic_api_key = "test-key"
                with patch(
                    "src.services.daily_summary.anthropic.AsyncAnthropic",
                    return_value=mock_client,
                ):
                    await generate_daily_summary("user_1", datetime.date(2026, 4, 10))

    mock_upsert.assert_called_once()
    call_kwargs = mock_upsert.call_args.kwargs
    assert "기능 구현 연습" in call_kwargs["summary_text"]
    assert call_kwargs["commit_count"] == 1
