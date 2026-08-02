import logging

from sqlalchemy import text

from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def check_database_connection() -> bool:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("Database health check failed: %s", exc.__class__.__name__)
        return False
