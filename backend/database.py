import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Falls back to a local SQLite file for development. In production, set DATABASE_URL
# to a Postgres connection string so data survives redeploys — see docs/deployment.md.
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./bankapp.db")

# Some hosts (Render, Heroku) hand out "postgres://" URLs, but SQLAlchemy's modern
# Postgres dialect requires the "postgresql://" scheme — normalize it here so
# whichever style the host gives us just works.
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# check_same_thread is a SQLite-only concept (FastAPI's threaded dev server would
# otherwise trip its single-thread default); Postgres doesn't need or accept it.
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations() -> None:
    """Add newly-introduced columns to an existing SQLite file without dropping data.

    SQLAlchemy's create_all() only creates missing tables, not missing columns on
    existing tables, so schema additions need a tiny manual ALTER TABLE step here.
    """
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    if "age" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN age INTEGER"))
    if "google_sub" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN google_sub VARCHAR(50)"))
    if "firebase_uid" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(64)"))
    if "email_verified" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))
    if "otp_hash" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN otp_hash VARCHAR(64)"))
    if "otp_expires_at" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP"))
    if "otp_attempts" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0"))
    if "pending_full_name" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_full_name VARCHAR(120)"))
    if "pending_age" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_age INTEGER"))
    if "pending_mobile" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_mobile VARCHAR(15)"))
    if "branch_code" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN branch_code INTEGER"))
    if "pending_branch_code" not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_branch_code INTEGER"))
