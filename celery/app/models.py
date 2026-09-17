"""SQLAlchemy model and session handling."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import DATABASE_URL

Base = declarative_base()

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True)
    checked_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc), index=True)
    url = Column(String(512), nullable=False)
    success = Column(Boolean, nullable=False)
    status_code = Column(Integer, nullable=True)
    response_ms = Column(Integer, nullable=True)
    error = Column(String(512), nullable=True)

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return (f"<CheckResult {self.checked_at.isoformat()} "
                f"{self.url} success={self.success}>")


def init_db() -> None:
    """Create tables if they do not exist yet."""
    Base.metadata.create_all(engine)
