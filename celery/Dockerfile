FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /srv

RUN adduser --disabled-password --gecos "" appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY show_results.py .

USER appuser

# Overridden by docker-compose for the worker / beat services.
CMD ["celery", "-A", "app.celery_app:celery_app", "worker", "--loglevel=info"]
