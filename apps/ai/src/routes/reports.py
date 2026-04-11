"""기간별 학습 리포트 생성 라우터."""

from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.report_generator import generate_report_and_roadmap

logger = logging.getLogger(__name__)

router = APIRouter()


class SummaryItem(BaseModel):
    date: str
    summary_text: str
    commit_count: int
    tags: list[str]


class GenerateReportRequest(BaseModel):
    summaries: list[SummaryItem]
    start_date: str
    end_date: str


@router.post("/ai/generate-report")
async def generate_report(request: GenerateReportRequest) -> dict:
    """Node.js API 서버에서 호출 — 기간 학습 리포트 + 로드맵 생성."""
    summaries = [s.model_dump() for s in request.summaries]

    result = await generate_report_and_roadmap(
        summaries=summaries,
        start_date=request.start_date,
        end_date=request.end_date,
    )
    return result
