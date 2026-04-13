from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://baegok:baegok@localhost:5432/baegok"


    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_group_id: str = "ai-analyzer"
    kafka_topic: str = "commit-analysis"

    # Claude API
    anthropic_api_key: str = ""

    # Token encryption (Node.js API와 동일 키 — access_token 복호화용)
    token_encryption_key: str = ""

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    celery_timezone: str = "Asia/Seoul"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
