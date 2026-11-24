"""Shared PostgreSQL fixtures for database-backed tests.

Skipped unless UHAMBO_TEST_DATABASE_URL points at an empty, disposable database:
    UHAMBO_TEST_DATABASE_URL=postgresql+psycopg://user:pass@127.0.0.1:5432/uhambo_test
"""

import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = os.environ.get("UHAMBO_TEST_DATABASE_URL")
BACKEND = Path(__file__).resolve().parents[1]

requires_db = pytest.mark.skipif(not TEST_DB_URL, reason="UHAMBO_TEST_DATABASE_URL not set")


@pytest.fixture(scope="session")
def pg_session_factory():
    if not TEST_DB_URL:
        pytest.skip("UHAMBO_TEST_DATABASE_URL not set")
    engine = create_engine(TEST_DB_URL)
    # Apply SQL over the raw psycopg connection (like psql) so literal '%' is
    # not treated as a parameter placeholder.
    with engine.begin() as conn:
        raw = conn.connection.driver_connection
        raw.execute((BACKEND / "db/schema.sql").read_text())
        for migration in sorted((BACKEND / "db/migrations").glob("*.sql")):
            raw.execute(migration.read_text())
    yield sessionmaker(bind=engine, autoflush=False, autocommit=False)
    engine.dispose()
