#!/usr/bin/env python3
"""Print the most recent check results from Postgres."""
import sys

from sqlalchemy import select

from app.models import CheckResult, SessionLocal, init_db


def main(limit: int = 20) -> None:
    init_db()
    with SessionLocal() as session:
        rows = session.scalars(
            select(CheckResult).order_by(CheckResult.checked_at.desc()).limit(limit)
        ).all()

    if not rows:
        print("No results yet.")
        return

    print(f"{'checked_at':32} {'ok':5} {'code':5} {'ms':>6}  error")
    for row in rows:
        print(f"{row.checked_at.isoformat():32} "
              f"{str(row.success):5} {str(row.status_code or '-'):5} "
              f"{row.response_ms or 0:>6}  {row.error or ''}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 20)
