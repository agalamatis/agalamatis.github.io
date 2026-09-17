# Google connectivity checker (Celery + Redis + Postgres)

A Celery beat task runs every 10 minutes, requests `https://www.google.com`
with `requests`, and writes the timestamp plus the outcome into Postgres via
SQLAlchemy.

## Layout

```
app/celery_app.py   Celery app + beat schedule (600s)
app/tasks.py        check_google() - does the request, stores the row
app/models.py       SQLAlchemy engine/session + CheckResult table
app/config.py       settings from environment variables
show_results.py     prints the latest rows
Dockerfile          image for worker and beat
docker-compose.yml  redis, postgres, worker, beat
run.sh              build/run helper
.env                configuration (copied from .env.example)
```

## Run

```bash
./run.sh up        # build images and start everything
./run.sh logs      # follow worker + beat logs
./run.sh check     # run the check immediately, don't wait for the next tick
./run.sh results   # print stored rows
./run.sh psql      # psql shell
./run.sh down      # stop  (./run.sh clean also drops the DB volume)
```

## Table

`check_results`: `id`, `checked_at` (UTC, timezone-aware), `url`, `success`
(bool), `status_code`, `response_ms`, `error`.

The table is created automatically when the worker starts.

## Configuration

Edit `.env`. Useful knobs: `CHECK_URL`, `CHECK_TIMEOUT`,
`CHECK_INTERVAL_SECONDS` (default 600 = 10 minutes), and the Postgres
credentials. `POSTGRES_PORT_HOST` / `REDIS_PORT` change the host-side port
mappings if 5432 or 6379 are already taken on your machine.

Running outside Docker: set `POSTGRES_HOST=localhost` and
`REDIS_URL=redis://localhost:6379/0`, then
`celery -A app.celery_app:celery_app worker --loglevel=info` and
`celery -A app.celery_app:celery_app beat --loglevel=info`.
