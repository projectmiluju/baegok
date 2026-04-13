FROM python:3.9-slim AS base
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 의존성 설치 (테스트 의존성 제외)
COPY apps/ai/requirements.txt .
# hadolint ignore=DL3013,SC2046
RUN grep -Ev '^(pytest|pytest-asyncio)' requirements.txt > requirements.prod.txt && \
    pip install --no-cache-dir -r requirements.prod.txt && \
    rm requirements.prod.txt

# 소스 복사
COPY apps/ai/src ./src

EXPOSE 8000

# 기본: FastAPI 서버. docker-compose에서 command 오버라이드로 celery 실행.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
