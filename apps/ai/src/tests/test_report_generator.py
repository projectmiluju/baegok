"""기간별 학습 리포트 생성 서비스 테스트."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.report_generator import _build_fallback_report, generate_report_and_roadmap


@pytest.mark.asyncio
async def test_빈_요약이면_기본_빈_리포트를_반환한다() -> None:
    """summaries가 빈 리스트이면 빈 리포트를 반환한다."""
    result = await generate_report_and_roadmap([], "2026-04-01", "2026-04-07")

    assert result["summary"]["strengths"] == []
    assert result["summary"]["weaknesses"] == []
    assert result["summary"]["stats"]["totalCommits"] == 0
    assert result["summary"]["stats"]["activeDays"] == 0
    assert result["summary"]["stats"]["topTags"] == []
    assert result["roadmap"]["recommended_topics"] == []
    assert result["roadmap"]["reasoning"] == "해당 기간에 학습 기록이 없습니다."
    assert result["roadmap"]["next_steps"] == []


@pytest.mark.asyncio
async def test_API키_없으면_기본_리포트를_반환한다() -> None:
    """ANTHROPIC_API_KEY가 없으면 fallback 리포트를 반환한다."""
    summaries = [
        {
            "date": "2026-04-01",
            "summary_text": "React 학습",
            "commit_count": 3,
            "tags": ["React", "TypeScript"],
        },
    ]

    with patch("src.services.report_generator.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        result = await generate_report_and_roadmap(summaries, "2026-04-01", "2026-04-07")

    assert result["summary"]["stats"]["totalCommits"] == 3
    assert result["summary"]["stats"]["activeDays"] == 1
    assert "React" in result["summary"]["stats"]["topTags"]


@pytest.mark.asyncio
async def test_Claude_정상_응답을_파싱한다() -> None:
    """Claude가 정상 JSON을 반환하면 파싱하여 결과를 반환한다."""
    summaries = [
        {
            "date": "2026-04-01",
            "summary_text": "React 학습",
            "commit_count": 3,
            "tags": ["React"],
        },
        {
            "date": "2026-04-02",
            "summary_text": "API 개발",
            "commit_count": 5,
            "tags": ["Node.js", "API"],
        },
    ]

    claude_response_json = """{
        "summary": {
            "strengths": ["프론트엔드와 백엔드를 균형 있게 학습"],
            "weaknesses": ["테스트 코드 부족"],
            "stats": {
                "totalCommits": 8,
                "activeDays": 2,
                "topTags": ["React", "Node.js", "API"]
            }
        },
        "roadmap": {
            "recommended_topics": ["테스트 주도 개발", "CI/CD"],
            "reasoning": "테스트 코드가 부족하여 TDD를 추천합니다.",
            "next_steps": ["Jest 학습", "GitHub Actions 설정"]
        }
    }"""

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=claude_response_json)]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("src.services.report_generator.settings") as mock_settings:
        mock_settings.anthropic_api_key = "test-key"
        with patch(
            "src.services.report_generator.anthropic.AsyncAnthropic",
            return_value=mock_client,
        ):
            result = await generate_report_and_roadmap(summaries, "2026-04-01", "2026-04-07")

    assert result["summary"]["strengths"] == ["프론트엔드와 백엔드를 균형 있게 학습"]
    assert result["summary"]["weaknesses"] == ["테스트 코드 부족"]
    assert result["summary"]["stats"]["totalCommits"] == 8
    assert result["roadmap"]["recommended_topics"] == ["테스트 주도 개발", "CI/CD"]
    assert "TDD" in result["roadmap"]["reasoning"]


@pytest.mark.asyncio
async def test_Claude_실패시_기본_리포트를_반환한다() -> None:
    """Claude API 호출 실패 시 fallback 리포트를 반환한다."""
    summaries = [
        {
            "date": "2026-04-01",
            "summary_text": "Python 학습",
            "commit_count": 2,
            "tags": ["Python"],
        },
    ]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(side_effect=RuntimeError("API 장애"))

    with patch("src.services.report_generator.settings") as mock_settings:
        mock_settings.anthropic_api_key = "test-key"
        with patch(
            "src.services.report_generator.anthropic.AsyncAnthropic",
            return_value=mock_client,
        ):
            result = await generate_report_and_roadmap(summaries, "2026-04-01", "2026-04-07")

    # fallback 결과 확인
    assert result["summary"]["stats"]["totalCommits"] == 2
    assert result["summary"]["stats"]["activeDays"] == 1
    assert "Python" in result["summary"]["stats"]["topTags"]


def test_fallback_리포트_통계_계산() -> None:
    """_build_fallback_report가 올바른 통계를 계산하는지 확인한다."""
    summaries = [
        {"date": "2026-04-01", "summary_text": "학습1", "commit_count": 3, "tags": ["React", "TS"]},
        {
            "date": "2026-04-02",
            "summary_text": "학습2",
            "commit_count": 5,
            "tags": ["React", "API"],
        },
    ]
    result = _build_fallback_report(summaries, "2026-04-01", "2026-04-02")

    assert result["summary"]["stats"]["totalCommits"] == 8
    assert result["summary"]["stats"]["activeDays"] == 2
    # React가 가장 많으므로 첫 번째
    assert result["summary"]["stats"]["topTags"][0] == "React"
