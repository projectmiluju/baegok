"""Claude API를 사용한 커밋 diff 분석."""

from __future__ import annotations

import json
import logging

import anthropic

from ..config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 소프트웨어 개발 학습 분석 전문가입니다.
주어진 커밋 메시지와 diff를 분석하여 학습 관점에서 요약합니다.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "summary": "한 줄 한국어 요약 (50자 이내)",
  "tags": ["기술/주제 태그 최대 5개"]
}

규칙:
- summary는 "무엇을 했는지"가 아니라 "무엇을 학습/연습했는지" 관점으로 작성
- tags는 사용된 기술, 패턴, 개념을 영문으로 (예: React, API, 버그수정, 리팩터링)
- diff가 단순 typo/포맷팅이면 summary에 "사소한 수정"으로, tags에 "style" 하나만
- JSON 외의 텍스트를 포함하지 마세요"""

MAX_DIFF_CHARS = 8000  # Claude 토큰 절약


def _truncate_diff(diff: str) -> str:
    if len(diff) <= MAX_DIFF_CHARS:
        return diff
    return diff[:MAX_DIFF_CHARS] + "\n\n... (diff 일부 생략)"


async def analyze_commit(
    commit_message: str,
    diff: str,
) -> dict[str, str | list[str]]:
    """커밋 메시지 + diff를 Claude로 분석한다.

    반환: {"summary": str, "tags": list[str]}
    실패 시 기본 응답 반환 (예외를 던지지 않음).
    """
    default = {"summary": commit_message[:50], "tags": []}

    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY 미설정 — 분석 건너뜀")
        return default

    truncated_diff = _truncate_diff(diff)
    user_message = f"커밋 메시지: {commit_message}\n\ndiff:\n{truncated_diff}"

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=256,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        text = response.content[0].text.strip()
        parsed = json.loads(text)

        summary = str(parsed.get("summary", commit_message[:50]))
        tags = parsed.get("tags", [])
        if not isinstance(tags, list):
            tags = []
        tags = [str(t) for t in tags[:5]]

        return {"summary": summary, "tags": tags}

    except json.JSONDecodeError:
        logger.error("Claude 응답 JSON 파싱 실패: %s", text if "text" in dir() else "N/A")
        return default
    except Exception:
        logger.exception("Claude API 호출 실패")
        return default
