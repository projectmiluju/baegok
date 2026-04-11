"""GitHub API 커밋 diff 조회."""

from __future__ import annotations

import httpx

GITHUB_API_BASE = "https://api.github.com"


async def fetch_commit_diff(
    access_token: str,
    full_name: str,
    sha: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> str:
    """특정 커밋의 diff를 조회한다. diff가 없으면 빈 문자열.

    외부에서 httpx.AsyncClient를 전달하면 재사용하고,
    없으면 내부에서 생성한다.
    """
    url = f"{GITHUB_API_BASE}/repos/{full_name}/commits/{sha}"
    headers = {
        "Accept": "application/vnd.github.diff",
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "baegok-ai",
    }

    async def _do_request(c: httpx.AsyncClient) -> str:
        res = await c.get(url, headers=headers, timeout=30.0)
        if res.status_code != 200:
            return ""
        return res.text

    if client is not None:
        return await _do_request(client)

    async with httpx.AsyncClient() as new_client:
        return await _do_request(new_client)
