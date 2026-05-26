from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


def _engine():
    settings = get_settings()
    db_path = Path(settings.database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )


engine = _engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    from sqlalchemy import text

    from . import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)

    # SQLite-only "migrations" for new columns on existing tables.
    # create_all only creates missing tables; it never ALTERs existing ones.
    additions = [
        ("dates", "start_time", "TIME"),
        ("dates", "duration_minutes", "INTEGER"),
        ("preferences", "default_start_time", "TIME"),
        ("preferences", "default_duration_minutes", "INTEGER"),
    ]
    with engine.begin() as conn:
        for table, column, ddl_type in additions:
            existing = {
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            }
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
