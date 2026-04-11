"""기간별 학습 리포트 + 로드맵 생성 서비스."""

from __future__ import annotations

import json
import logging
from collections import Counter

import anthropic

from ..config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 소프트웨어 개발 학습 분석 전문가입니다.
주어진 기간 동안의 일일 학습 요약 데이터를 분석하여 종합 리포트와 학습 로드맵을 생성합니다.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "summary": {
    "strengths": ["강점 1", "강점 2", ...],
    "weaknesses": ["약점/개선점 1", "약점/개선점 2", ...],
    "stats": {
      "totalCommits": 숫자,
      "activeDays": 숫자,
      "topTags": ["태그1", "태그2", ...]
    }
  },
  "roadmap": {
    "recommended_topics": ["추천 학습 주제 1", "추천 학습 주제 2", ...],
    "reasoning": "추천 이유를 한국어로 설명",
    "next_steps": ["다음 단계 1", "다음 단계 2", ...]
  }
}

규칙:
- 모든 텍스트는 한국어로 작성
- strengths, weaknesses는 각 2~4개
- recommended_topics, next_steps는 각 3~5개
- reasoning은 2~3문장으로 간결하게
- JSON 외의 텍스트를 포함하지 마세요"""


def _build_fallback_report(
    summaries: list[dict],
    start_date: str,
    end_date: str,
) -> dict:
    """Claude 호출 없이 입력 데이터에서 기본 통계를 계산한다."""
    total_commits = sum(s.get("commit_count", 0) for s in summaries)
    active_days = len(summaries)

    tag_counter: Counter[str] = Counter()
    for s in summaries:
        for tag in s.get("tags", []):
            tag_counter[tag] += 1
    top_tags = [tag for tag, _ in tag_counter.most_common(5)]

    return {
        "summary": {
            "strengths": ["꾸준한 커밋 활동"] if total_commits > 0 else [],
            "weaknesses": ["분석 데이터가 부족합니다"],
            "stats": {
                "totalCommits": total_commits,
                "activeDays": active_days,
                "topTags": top_tags,
            },
        },
        "roadmap": {
            "recommended_topics": top_tags[:3] if top_tags else ["기본기 다지기"],
            "reasoning": (
                f"{start_date}~{end_date} 기간 동안의 학습 데이터를 기반으로 한 기본 분석입니다."
            ),
            "next_steps": ["현재 학습 주제를 더 깊이 탐구하기"],
        },
    }


async def generate_report_and_roadmap(
    summaries: list[dict],
    start_date: str,
    end_date: str,
) -> dict:
    """기간 학습 요약 데이터를 바탕으로 리포트 + 로드맵을 생성한다."""
    if not summaries:
        return {
            "summary": {
                "strengths": [],
                "weaknesses": [],
                "stats": {
                    "totalCommits": 0,
                    "activeDays": 0,
                    "topTags": [],
                },
            },
            "roadmap": {
                "recommended_topics": [],
                "reasoning": "해당 기간에 학습 기록이 없습니다.",
                "next_steps": [],
            },
        }

    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY 미설정 — 기본 리포트 반환")
        return _build_fallback_report(summaries, start_date, end_date)

    # Claude 프롬프트 구성
    summary_lines = []
    for s in summaries:
        summary_lines.append(
            f"- [{s['date']}] 커밋 {s['commit_count']}건 | "
            f"태그: {', '.join(s.get('tags', []))} | "
            f"요약: {s['summary_text']}"
        )

    user_message = f"기간: {start_date} ~ {end_date}\n\n" f"일일 학습 요약:\n" + "\n".join(
        summary_lines
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        text = response.content[0].text.strip()
        parsed = json.loads(text)

        # 필수 키 검증
        summary = parsed.get("summary", {})
        roadmap = parsed.get("roadmap", {})

        return {
            "summary": {
                "strengths": summary.get("strengths", []),
                "weaknesses": summary.get("weaknesses", []),
                "stats": summary.get(
                    "stats",
                    {
                        "totalCommits": 0,
                        "activeDays": 0,
                        "topTags": [],
                    },
                ),
            },
            "roadmap": {
                "recommended_topics": roadmap.get("recommended_topics", []),
                "reasoning": roadmap.get("reasoning", ""),
                "next_steps": roadmap.get("next_steps", []),
            },
        }

    except json.JSONDecodeError:
        logger.error("Claude 응답 JSON 파싱 실패")
        return _build_fallback_report(summaries, start_date, end_date)
    except Exception:
        logger.exception("Claude API 호출 실패 — 기본 리포트 반환")
        return _build_fallback_report(summaries, start_date, end_date)
