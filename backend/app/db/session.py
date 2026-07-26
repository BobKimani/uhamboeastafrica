from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings
from app.db.auth import generate_iam_auth_token


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"sslmode": settings.db_sslmode},
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=3,
    pool_recycle=840,
    pool_timeout=10,
    echo=False,
)


@event.listens_for(engine, "do_connect")
def provide_iam_token(dialect, conn_rec, cargs, cparams):
    cparams["password"] = generate_iam_auth_token()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
