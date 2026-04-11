"""Claude 분석 서비스 테스트."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.claude_analyzer import _truncate_diff, analyze_commit


def test_truncate_diff_short():
    diff = "a" * 8000
    assert _truncate_diff(diff) == diff


def test_truncate_diff_long():
    diff = "a" * 10000
    result = _truncate_diff(diff)
    assert len(result) < 10000


@pytest.mark.asyncio
async def test_no_api_key_returns_default():
    with patch("src.services.claude_analyzer.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        result = await analyze_commit("feat: add feature", "diff content")
        assert result["summary"] == "feat: add feature"
        assert result["tags"] == []


@pytest.mark.asyncio
async def test_valid_json_response_parsed():
    mock_response = MagicMock()
    response_json = '{"summary": "React component practice", "tags": ["React"]}'
    mock_response.content = [MagicMock(text=response_json)]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("src.services.claude_analyzer.settings") as s:
        with patch(
            "src.services.claude_analyzer.anthropic.AsyncAnthropic",
            return_value=mock_client,
        ):
            s.anthropic_api_key = "test-key"
            result = await analyze_commit("feat: React", "diff...")
            assert result["summary"] == "React component practice"
            assert "React" in result["tags"]


@pytest.mark.asyncio
async def test_invalid_json_response_returns_default():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="not json")]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("src.services.claude_analyzer.settings") as s:
        with patch(
            "src.services.claude_analyzer.anthropic.AsyncAnthropic",
            return_value=mock_client,
        ):
            s.anthropic_api_key = "test-key"
            result = await analyze_commit("fix: bug fix", "diff...")
            assert result["summary"] == "fix: bug fix"
