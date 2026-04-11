from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .consumer import run_consumer
from .routes.reports import router as reports_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Kafka Consumer를 background task로 시작
    consumer_task = asyncio.create_task(run_consumer())
    logger.info("Kafka Consumer background task 시작")
    yield
    # 종료 시 consumer 취소
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        logger.info("Kafka Consumer background task 종료")


app = FastAPI(
    title="Baegok AI Server",
    description="커밋 분석, 학습 요약, 로드맵 생성 AI 서버",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:4000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(reports_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
