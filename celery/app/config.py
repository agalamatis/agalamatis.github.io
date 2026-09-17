"""Central configuration, read from environment variables."""
import os


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


# --- Postgres ---------------------------------------------------------------
POSTGRES_USER = _env("POSTGRES_USER", "checker")
POSTGRES_PASSWORD = _env("POSTGRES_PASSWORD", "checker")
POSTGRES_DB = _env("POSTGRES_DB", "checker")
POSTGRES_HOST = _env("POSTGRES_HOST", "postgres")
POSTGRES_PORT = _env("POSTGRES_PORT", "5432")

DATABASE_URL = _env(
    "DATABASE_URL",
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}",
)

# --- Redis (broker + result backend) ----------------------------------------
REDIS_URL = _env("REDIS_URL", "redis://redis:6379/0")

# --- Check settings ---------------------------------------------------------
CHECK_URL = _env("CHECK_URL", "https://www.google.com")
CHECK_TIMEOUT = float(_env("CHECK_TIMEOUT", "10"))
CHECK_INTERVAL_SECONDS = float(_env("CHECK_INTERVAL_SECONDS", "600"))  # 10 minutes
