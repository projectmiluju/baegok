"""Celery 앱 설정 및 Beat 스케줄 정의.

NOTE: docker-compose 서비스(celery-worker, celery-beat)는 #12에서 추가 예정.
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from .config import settings

celery_app = Celery(
    "baegok",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.timezone = settings.celery_timezone
celery_app.conf.beat_schedule = {
    "weekly-report": {
        "task": "src.tasks.weekly_report.generate_weekly_reports",
        "schedule": crontab(hour=0, minute=0, day_of_week=1),  # Mon 00:00 UTC = Mon 09:00 KST
    },
}
celery_app.autodiscover_tasks(["src.tasks"])
