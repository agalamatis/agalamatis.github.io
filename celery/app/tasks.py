"""The periodic connectivity check task."""
import logging
import time
from datetime import datetime, timezone

import requests

from app import config
from app.celery_app import celery_app
from app.models import CheckResult, SessionLocal

log = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.check_google")
def check_google() -> dict:
    """Request CHECK_URL and record the outcome in Postgres."""
    checked_at = datetime.now(timezone.utc)
    started = time.monotonic()

    success = False
    status_code = None
    error = None

    try:
        response = requests.get(config.CHECK_URL, timeout=config.CHECK_TIMEOUT)
        status_code = response.status_code
        success = response.ok
        if not success:
            error = f"HTTP {status_code}"
    except Exception as exc:  # network error, DNS failure, timeout, ...
        error = f"{type(exc).__name__}: {exc}"[:512]

    response_ms = int((time.monotonic() - started) * 1000)

    record = CheckResult(
        checked_at=checked_at,
        url=config.CHECK_URL,
        success=success,
        status_code=status_code,
        response_ms=response_ms,
        error=error,
    )

    with SessionLocal() as session:
        session.add(record)
        session.commit()
        record_id = record.id

    log.info("check %s success=%s status=%s in %sms",
             config.CHECK_URL, success, status_code, response_ms)

    return {
        "id": record_id,
        "checked_at": checked_at.isoformat(),
        "url": config.CHECK_URL,
        "success": success,
        "status_code": status_code,
        "response_ms": response_ms,
        "error": error,
    }
