#!/usr/bin/env bash
# Build and run the whole stack (redis + postgres + celery worker/beat).
set -euo pipefail

cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "Docker Compose not found. Install Docker Desktop first." >&2
  exit 1
fi

[ -f .env ] || cp .env.example .env

cmd="${1:-up}"

case "$cmd" in
  up)
    $DC up --build -d
    echo
    echo "Stack is up. Services:"
    $DC ps
    echo
    echo "Follow logs with:   ./run.sh logs"
    echo "Run a check now:    ./run.sh check"
    echo "See stored results: ./run.sh results"
    ;;
  build)   $DC build ;;
  logs)    $DC logs -f worker beat ;;
  ps)      $DC ps ;;
  stop)    $DC stop ;;
  down)    $DC down ;;
  clean)   $DC down -v ;;
  check)   # trigger the task immediately instead of waiting for the next tick
    $DC exec worker python -c \
      "from app.tasks import check_google; print(check_google.delay().get(timeout=60))"
    ;;
  results) $DC exec worker python show_results.py "${2:-20}" ;;
  psql)    $DC exec postgres psql -U "${POSTGRES_USER:-checker}" -d "${POSTGRES_DB:-checker}" ;;
  *)
    echo "usage: $0 {up|build|logs|ps|stop|down|clean|check|results|psql}" >&2
    exit 1
    ;;
esac
