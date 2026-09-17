"""Celery application with the periodic (beat) schedule."""
from celery import Celery
from celery.signals import worker_ready

from app import config

celery_app = Celery(
    "checker",
    broker=config.REDIS_URL,
    backend=config.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=120,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "check-google-every-10-minutes": {
            "task": "app.tasks.check_google",
            "schedule": config.CHECK_INTERVAL_SECONDS,  # 600s = 10 minutes
        },
    },
)


@worker_ready.connect
def _create_tables(**_kwargs) -> None:
    """Make sure the table exists once the worker comes up."""
    from app.models import init_db
    init_db()
