"""Kafka Consumer 메시지 처리 로직 테스트."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from src.consumer import process_message


@pytest.mark.asyncio
async def test_repository_id_누락이면_건너뛴다() -> None:
    """repository_id가 없는 메시지는 조용히 무시한다."""
    await process_message({"full_name": "user/repo", "commits": []})


@pytest.mark.asyncio
async def test_access_token_없으면_건너뛴다() -> None:
    mock_get = AsyncMock(return_value=None)
    with patch("src.consumer.get_access_token_for_repo", mock_get):
        await process_message(
            {
                "repository_id": "repo_1",
                "full_name": "user/repo",
                "commits": [{"sha": "abc", "message": "test", "timestamp": "2026-04-12T00:00:00Z"}],
            }
        )


@pytest.mark.asyncio
@patch("src.consumer.save_commit_analysis", new_callable=AsyncMock)
@patch(
    "src.consumer.analyze_commit",
    new_callable=AsyncMock,
    return_value={"summary": "요약", "tags": ["test"]},
)
@patch("src.consumer.fetch_commit_diff", new_callable=AsyncMock, return_value="diff")
@patch("src.consumer.decrypt_token", return_value="ghp_mock")
@patch("src.consumer.get_access_token_for_repo", new_callable=AsyncMock, return_value="enc")
@patch("src.consumer.check_analysis_exists", new_callable=AsyncMock, return_value=False)
async def test_정상_커밋_분석_및_저장(
    _check: AsyncMock,
    _get_token: AsyncMock,
    _decrypt: AsyncMock,
    _fetch: AsyncMock,
    _analyze: AsyncMock,
    mock_save: AsyncMock,
) -> None:
    await process_message(
        {
            "repository_id": "repo_1",
            "full_name": "user/repo",
            "commits": [
                {"sha": "abc123", "message": "feat: 기능", "timestamp": "2026-04-12T00:00:00Z"}
            ],
        }
    )
    mock_save.assert_called_once()
    assert mock_save.call_args.kwargs["commit_sha"] == "abc123"
    assert mock_save.call_args.kwargs["diff_summary"] == "요약"


@pytest.mark.asyncio
async def test_분석_실패해도_다음_커밋으로_진행한다() -> None:
    """PRD §4: Claude 실패 시 로그만 남기고 다음 커밋 처리."""
    call_count = 0

    async def mock_analyze(msg: str, diff: str) -> dict:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("Claude 장애")
        return {"summary": "요약", "tags": []}

    mock_save = AsyncMock()
    with patch("src.consumer.get_access_token_for_repo", AsyncMock(return_value="enc")):
        with patch("src.consumer.decrypt_token", return_value="ghp_mock"):
            with patch("src.consumer.check_analysis_exists", AsyncMock(return_value=False)):
                with patch("src.consumer.fetch_commit_diff", AsyncMock(return_value="diff")):
                    with patch("src.consumer.analyze_commit", side_effect=mock_analyze):
                        with patch("src.consumer.save_commit_analysis", mock_save):
                            await process_message(
                                {
                                    "repository_id": "repo_1",
                                    "full_name": "user/repo",
                                    "commits": [
                                        {
                                            "sha": "fail1",
                                            "message": "1st",
                                            "timestamp": "2026-04-12T00:00:00Z",
                                        },
                                        {
                                            "sha": "ok2",
                                            "message": "2nd",
                                            "timestamp": "2026-04-12T00:00:00Z",
                                        },
                                    ],
                                }
                            )
    assert mock_save.call_count == 1
    assert mock_save.call_args.kwargs["commit_sha"] == "ok2"


@pytest.mark.asyncio
async def test_50개_초과_커밋은_상위_50개만_처리한다() -> None:
    commits = [
        {"sha": f"sha{i}", "message": f"msg{i}", "timestamp": "2026-04-12T00:00:00Z"}
        for i in range(60)
    ]
    mock_save = AsyncMock()
    with patch("src.consumer.get_access_token_for_repo", AsyncMock(return_value="enc")):
        with patch("src.consumer.decrypt_token", return_value="ghp_mock"):
            with patch("src.consumer.check_analysis_exists", AsyncMock(return_value=False)):
                with patch("src.consumer.fetch_commit_diff", AsyncMock(return_value="diff")):
                    with patch(
                        "src.consumer.analyze_commit",
                        AsyncMock(return_value={"summary": "s", "tags": []}),
                    ):
                        with patch("src.consumer.save_commit_analysis", mock_save):
                            await process_message(
                                {
                                    "repository_id": "repo_1",
                                    "full_name": "user/repo",
                                    "commits": commits,
                                }
                            )
    assert mock_save.call_count == 50
