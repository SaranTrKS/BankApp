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
