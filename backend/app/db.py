import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

connect_args = {}
if sys.platform == "win32" and "neon.tech" in settings.DATABASE_URL:
    # Pin IPv4 address on Windows to bypass Windows IPv6 drops and intermittent DNS resolution
    connect_args["hostaddr"] = "52.14.39.200"

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception as e:
        print(f"Warning: Could not create vector extension: {e}")

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Base.metadata.create_all failed: {e}")

    try:
        with engine.begin() as conn:
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_submissions_user_id ON submissions (user_id)"
            ))
            user_columns = {column["name"] for column in inspect(conn).get_columns("users")}
            if "password_hash" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)"))
            if "token_version" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"))
            if conn.dialect.name == "postgresql":
                for table in ("organizations", "users"):
                    conn.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table}), 1), "
                        f"(SELECT MAX(id) IS NOT NULL FROM {table}))"
                    ))
    except Exception as e:
        print(f"Warning: DB migration/indexes failed: {e}")
