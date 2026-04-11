"""GitHub API 커밋 diff 조회."""

from __future__ import annotations

import httpx

GITHUB_API_BASE = "https://api.github.com"


async def fetch_commit_diff(access_token: str, full_name: str, sha: str) -> str:
    """특정 커밋의 diff를 조회한다. diff가 없으면 빈 문자열."""
    url = f"{GITHUB_API_BASE}/repos/{full_name}/commits/{sha}"
    async with httpx.AsyncClient() as client:
        res = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github.diff",
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "baegok-ai",
            },
            timeout=30.0,
        )
        if res.status_code != 200:
            return ""
        return res.text
