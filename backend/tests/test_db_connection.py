from app.config import Settings
from app.db import session


def make_settings(**overrides):
    settings = Settings()
    values = {
        "db_host": "db",
        "db_port": 5432,
        "db_name": "uhambo",
        "db_user": "uhambo_app",
        "db_password": "s3cret:p@ss/word",
    }
    values.update(overrides)
    for key, value in values.items():
        setattr(settings, key, value)
    return settings


def test_database_url_uses_password_auth_against_docker_db_service():
    url = make_settings().database_url

    assert url.drivername == "postgresql+psycopg"
    assert url.host == "db"
    assert url.port == 5432
    assert url.database == "uhambo"
    assert url.username == "uhambo_app"
    assert url.password == "s3cret:p@ss/word"


def test_database_url_escapes_password_and_masks_it_in_logs():
    url = make_settings().database_url

    rendered = url.render_as_string(hide_password=False)
    assert "s3cret%3Ap%40ss%2Fword" in rendered
    assert "s3cret" not in str(url)
    assert "s3cret" not in repr(url)


def test_database_url_requires_host_name_and_user():
    for missing in ("db_host", "db_name", "db_user"):
        settings = make_settings(**{missing: None})
        try:
            settings.database_url
        except ValueError as exc:
            assert "DB_HOST, DB_NAME, and DB_USER" in str(exc)
        else:
            raise AssertionError(f"expected ValueError when {missing} is missing")


def test_engine_authenticates_with_configured_password():
    # No IAM token hook: the password comes straight from DB_PASSWORD.
    assert session.engine.url.password == (session.settings.db_password or None)
    assert session.engine.url.drivername == "postgresql+psycopg"


def test_engine_uses_stale_connection_protection():
    assert session.engine.pool._pre_ping is True
    assert session.engine.pool._recycle == 600
