"""Local admin authentication tests.

Pure-logic tests always run. Database-backed tests need an empty, disposable
PostgreSQL database and are skipped unless UHAMBO_TEST_DATABASE_URL is set, e.g.
    UHAMBO_TEST_DATABASE_URL=postgresql+psycopg://user:pass@127.0.0.1:5432/uhambo_test
"""

import io
import os
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text, update
from sqlalchemy.orm import sessionmaker

from app import admin_cli
from app.config import settings
from app.db.admin_models import AdminLoginAttempt, AdminSession, AdminUser
from app.db.session import get_db
from app.main import app
from app.services import admin_auth
from app.services.admin_auth import (
    PasswordPolicyError,
    csrf_token_for,
    csrf_token_matches,
    hash_password,
    hash_token,
    validate_password_policy,
    verify_password,
)

FRONTEND = "https://www.uhamboeastafrica.com"
EMAIL = "admin.one@uhamboeastafrica.com"
PASSWORD = "Correct-Horse-Battery-42"
COOKIE = "uhambo_admin_session"


# ------------------------------------------------------------ pure logic
def test_passwords_are_hashed_with_argon2id():
    hashed = hash_password(PASSWORD)
    assert hashed.startswith("$argon2id$")
    assert PASSWORD not in hashed
    assert verify_password(hashed, PASSWORD)
    assert not verify_password(hashed, PASSWORD + "x")
    assert not verify_password("not-a-hash", PASSWORD)


@pytest.mark.parametrize(
    "password",
    ["short", "a" * 300, " leading-space-password", "aaaaaaaaaaaaaaaa", EMAIL],
)
def test_password_policy_rejects_weak_passwords(password):
    with pytest.raises(PasswordPolicyError):
        validate_password_policy(password, EMAIL)


def test_password_policy_accepts_strong_password():
    validate_password_policy(PASSWORD, EMAIL)


def test_csrf_token_is_bound_to_session_and_secret(monkeypatch):
    token = csrf_token_for("session-a")
    assert csrf_token_matches("session-a", token)
    assert not csrf_token_matches("session-b", token)
    assert not csrf_token_matches("session-a", None)
    assert not csrf_token_matches("session-a", "")
    monkeypatch.setattr(settings, "session_secret", "x" * 40)
    assert not csrf_token_matches("session-a", token)


def test_session_token_hash_is_sha256_hex():
    digest = hash_token("abc")
    assert len(digest) == 64 and all(c in "0123456789abcdef" for c in digest)


# ------------------------------------------------------------ database
TEST_DB_URL = os.environ.get("UHAMBO_TEST_DATABASE_URL")
needs_db = pytest.mark.skipif(not TEST_DB_URL, reason="UHAMBO_TEST_DATABASE_URL not set")
BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def session_factory():
    engine = create_engine(TEST_DB_URL)
    # Apply SQL files over the raw psycopg connection (like psql), so literal
    # '%' characters are not treated as parameter placeholders.
    with engine.begin() as conn:
        raw = conn.connection.driver_connection
        raw.execute((BACKEND / "db/schema.sql").read_text())
        for migration in sorted((BACKEND / "db/migrations").glob("*.sql")):
            raw.execute(migration.read_text())
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    yield factory
    engine.dispose()


@pytest.fixture
def db_factory(session_factory, monkeypatch):
    with session_factory() as db:
        db.execute(text("TRUNCATE admin_login_attempts, admin_sessions, admin_users CASCADE"))
        db.commit()

    def override_get_db():
        db = session_factory()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(settings, "cors_allowed_origins", [FRONTEND])
    monkeypatch.setattr(settings, "frontend_url", FRONTEND)
    monkeypatch.setattr(settings, "session_https_only", True)
    monkeypatch.setattr(settings, "session_max_age_seconds", 8 * 3600)
    monkeypatch.setattr(settings, "admin_login_max_failures_per_email", 5)
    monkeypatch.setattr(settings, "admin_login_max_failures_per_ip", 20)
    monkeypatch.setattr(settings, "admin_login_window_seconds", 900)
    yield session_factory
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def admin(db_factory):
    return create_admin(db_factory, EMAIL, PASSWORD, name="Admin One")


def create_admin(factory, email, password, name=None):
    out = io.StringIO(password + "\n")
    args = ["create", "--email", email, "--password-stdin"] + (["--name", name] if name else [])
    assert admin_cli.run(args, session_factory=factory, stdin=out) == 0
    with factory() as db:
        return db.scalar(select(AdminUser).where(AdminUser.email == email.lower()))


def client():
    # https base URL so the Secure cookie is stored and sent back.
    return TestClient(app, base_url="https://api.uhamboeastafrica.com")


def login(c, email=EMAIL, password=PASSWORD, origin=FRONTEND):
    headers = {"Origin": origin} if origin else {}
    return c.post("/auth/login", json={"email": email, "password": password}, headers=headers)


def auth_headers(csrf):
    return {"Origin": FRONTEND, "X-CSRF-Token": csrf}


@needs_db
def test_successful_login_sets_secure_session_cookie(admin, db_factory):
    c = client()
    response = login(c)

    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["user"] == {
        "sub": str(admin.id),
        "email": EMAIL,
        "name": "Admin One",
        "groups": ["admin"],
        "isAdmin": True,
    }
    assert body["csrfToken"]

    cookie_header = response.headers["set-cookie"]
    assert cookie_header.startswith(f"{COOKIE}=")
    lowered = cookie_header.lower()
    assert "httponly" in lowered
    assert "secure" in lowered
    assert "samesite=lax" in lowered
    assert "path=/" in lowered
    assert "max-age=28800" in lowered
    assert "domain=" not in lowered  # host-only

    raw_token = c.cookies.get(COOKIE)
    with db_factory() as db:
        sessions = db.scalars(select(AdminSession)).all()
        assert len(sessions) == 1
        assert sessions[0].token_hash == hash_token(raw_token)
        assert raw_token not in sessions[0].token_hash
        remaining = sessions[0].expires_at - sessions[0].created_at
        assert remaining == timedelta(hours=8)


@needs_db
def test_email_is_case_insensitive(admin):
    assert login(client(), email="  Admin.One@UhamboEastAfrica.com ").status_code == 200


@needs_db
@pytest.mark.parametrize(
    "email,password",
    [(EMAIL, "Wrong-Password-1234"), ("nobody@uhamboeastafrica.com", PASSWORD)],
)
def test_failed_login_returns_generic_401(admin, email, password):
    c = client()
    response = login(c, email, password)
    assert response.status_code == 401
    assert response.json() == {
        "authenticated": False,
        "user": None,
        "error": "Invalid email or password",
    }
    assert COOKIE not in c.cookies


@needs_db
def test_login_from_untrusted_origin_is_rejected(admin):
    response = login(client(), origin="https://evil.example.com")
    assert response.status_code == 403


@needs_db
def test_session_persists_and_me_returns_user(admin):
    c = client()
    csrf = login(c).json()["csrfToken"]

    for _ in range(3):
        me = c.get("/auth/me")
        assert me.status_code == 200
        assert me.json()["authenticated"] is True
        assert me.json()["user"]["email"] == EMAIL
        assert me.json()["csrfToken"] == csrf
        assert me.headers["cache-control"] == "no-store"


@needs_db
def test_me_without_cookie_is_unauthenticated():
    response = client().get("/auth/me")
    assert response.status_code == 401
    assert response.json() == {
        "authenticated": False,
        "user": None,
        "error": "Session cookie missing",
    }


@needs_db
def test_forged_session_cookie_is_rejected(admin):
    c = client()
    c.cookies.set(COOKIE, "forged-token", domain="api.uhamboeastafrica.com")
    assert c.get("/auth/me").status_code == 401
    assert c.get("/api/bookings").status_code == 401


@needs_db
def test_logout_invalidates_session_server_side(admin, db_factory):
    c = client()
    csrf = login(c).json()["csrfToken"]
    stolen_token = c.cookies.get(COOKIE)

    response = c.post("/auth/logout", headers=auth_headers(csrf))
    assert response.status_code == 200
    assert response.json() == {"success": True, "message": "Logged out"}
    assert COOKIE not in c.cookies

    # Replaying the old cookie no longer works.
    replay = client()
    replay.cookies.set(COOKIE, stolen_token, domain="api.uhamboeastafrica.com")
    assert replay.get("/auth/me").status_code == 401
    assert replay.get("/api/bookings").status_code == 401
    with db_factory() as db:
        assert db.scalar(select(AdminSession.revoked_at)) is not None


@needs_db
def test_logout_requires_csrf_for_live_session(admin):
    c = client()
    login(c)
    assert c.post("/auth/logout", headers={"Origin": FRONTEND}).status_code == 403
    assert c.get("/auth/me").status_code == 200  # still logged in


@needs_db
def test_get_logout_does_not_end_session(admin):
    c = client()
    login(c)
    response = c.get("/auth/logout", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == f"{FRONTEND}/auth?redirect=%2Fadmin"
    assert c.get("/auth/me").status_code == 200


@needs_db
def test_get_login_redirects_to_frontend_form(db_factory):
    response = client().get("/auth/login?redirect=/admin/hotels", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == f"{FRONTEND}/auth?redirect=%2Fadmin%2Fhotels"
    evil = client().get("/auth/login?redirect=https://evil.example.com", follow_redirects=False)
    assert evil.headers["location"] == f"{FRONTEND}/auth?redirect=%2Fadmin"


@needs_db
def test_expired_session_is_rejected(admin, db_factory):
    c = client()
    login(c)
    with db_factory() as db:
        db.execute(update(AdminSession).values(expires_at=admin_auth.utcnow() - timedelta(seconds=1)))
        db.commit()
    protected = c.get("/api/bookings")
    assert protected.status_code == 401
    assert protected.json()["error"] == "Session expired"
    me = c.get("/auth/me")
    assert me.status_code == 401
    assert me.json()["error"] == "Session expired"
    assert COOKIE not in c.cookies  # expired cookie is cleared


@needs_db
def test_disabling_admin_invalidates_sessions_and_blocks_login(admin, db_factory):
    c = client()
    login(c)
    assert admin_cli.run(["disable", "--email", EMAIL], session_factory=db_factory) == 0

    assert c.get("/auth/me").status_code == 401
    assert c.get("/api/bookings").status_code == 401
    assert login(client()).status_code == 401

    assert admin_cli.run(["enable", "--email", EMAIL], session_factory=db_factory) == 0
    assert c.get("/auth/me").status_code == 401  # old session stays revoked
    assert login(client()).status_code == 200


@needs_db
def test_inactive_flag_alone_blocks_existing_session(admin, db_factory):
    # Even if sessions were not revoked, is_active=false is checked per request.
    c = client()
    login(c)
    with db_factory() as db:
        db.execute(update(AdminUser).values(is_active=False))
        db.commit()
    assert c.get("/auth/me").status_code == 401


@needs_db
def test_password_change_signs_out_sessions(admin, db_factory):
    c = client()
    login(c)
    new_password = "Another-Strong-Pass-77"
    assert admin_cli.run(
        ["set-password", "--email", EMAIL, "--password-stdin"],
        session_factory=db_factory,
        stdin=io.StringIO(new_password + "\n"),
    ) == 0
    assert c.get("/auth/me").status_code == 401
    assert login(client()).status_code == 401
    assert login(client(), password=new_password).status_code == 200


@needs_db
def test_login_replaces_presented_session(admin, db_factory):
    c = client()
    login(c)
    first = c.cookies.get(COOKIE)
    login(c)
    second = c.cookies.get(COOKIE)
    assert first != second
    with db_factory() as db:
        old = db.scalar(select(AdminSession).where(AdminSession.token_hash == hash_token(first)))
        assert old.revoked_at is not None


# ------------------------------------------------------- protected routes
PROTECTED = [
    ("get", "/api/bookings"),
    ("get", "/api/bookings/00000000-0000-0000-0000-000000000000"),
    ("patch", "/api/bookings/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/bookings/00000000-0000-0000-0000-000000000000"),
    ("get", "/api/inquiries"),
    ("patch", "/api/inquiries/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/inquiries/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/hotels"),
    ("patch", "/api/hotels/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/hotels/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/vehicles"),
    ("patch", "/api/vehicles/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/vehicles/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/uploads/catalog-image"),
]


def test_every_admin_route_uses_the_auth_dependency():
    import re

    from app.auth import require_authenticated_admin

    def normalize(path):
        path = re.sub(r"\{[^}]+\}", "{id}", path)
        return path.replace("00000000-0000-0000-0000-000000000000", "{id}")

    from app.routers import auth, bookings, catalog, currency, inquiries, payments

    routes = [
        route
        for module in (auth, bookings, catalog, currency, inquiries, payments)
        for route in module.router.routes
    ]
    assert routes, "no routes discovered"

    protected = set()
    for route in routes:
        dependant = getattr(route, "dependant", None)
        if dependant and any(d.call is require_authenticated_admin for d in dependant.dependencies):
            protected |= {(m.lower(), normalize(route.path)) for m in route.methods}

    expected = {(m, normalize(p)) for m, p in PROTECTED}
    assert expected == protected


@needs_db
@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_reject_anonymous_requests(db_factory, method, path):
    response = getattr(client(), method)(path, headers={"Origin": FRONTEND})
    assert response.status_code == 401
    assert response.json() == {"success": False, "error": "Unauthorized"}


@needs_db
@pytest.mark.parametrize("method,path", [p for p in PROTECTED if p[0] != "get"])
def test_state_changing_requests_require_csrf_token(admin, method, path):
    c = client()
    login(c)
    response = getattr(c, method)(path, headers={"Origin": FRONTEND})
    assert response.status_code == 403
    assert response.json() == {"success": False, "error": "Invalid CSRF token"}

    wrong = getattr(c, method)(path, headers=auth_headers("not-the-token"))
    assert wrong.status_code == 403


@needs_db
def test_state_changing_requests_reject_foreign_origin(admin):
    c = client()
    csrf = login(c).json()["csrfToken"]
    response = c.delete(
        "/api/hotels/00000000-0000-0000-0000-000000000000",
        headers={"Origin": "https://evil.example.com", "X-CSRF-Token": csrf},
    )
    assert response.status_code == 403


@needs_db
def test_authenticated_admin_can_use_protected_routes(admin):
    c = client()
    csrf = login(c).json()["csrfToken"]

    assert c.get("/api/bookings").status_code == 200
    assert c.get("/api/inquiries").status_code == 200

    hotel = {
        "name": "Auth Test Lodge", "country": "kenya", "region": "Mara",
        "destination": "Maasai Mara", "pricePerNight": 100, "rating": 4.5,
        "image": "assets/hotels/mara.jpg",
    }
    created = c.post("/api/hotels", json=hotel, headers=auth_headers(csrf))
    assert created.status_code == 200, created.text
    hotel_id = created.json()["hotel"]["id"]
    assert c.patch(f"/api/hotels/{hotel_id}", json=hotel, headers=auth_headers(csrf)).status_code == 200
    assert c.delete(f"/api/hotels/{hotel_id}", headers=auth_headers(csrf)).json()["success"] is True


@needs_db
def test_public_endpoints_need_no_session_or_csrf(db_factory):
    assert client().get("/api/hotels").status_code == 200
    assert client().get("/api/vehicles").status_code == 200


# --------------------------------------------------------- rate limiting
@needs_db
def test_login_is_rate_limited_per_email(admin, db_factory):
    c = client()
    for _ in range(5):
        assert login(c, password="Wrong-Password-1234").status_code == 401
    blocked = login(c)  # even the correct password is refused while locked
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) > 0
    assert blocked.json()["authenticated"] is False

    # Window passes -> allowed again
    with db_factory() as db:
        db.execute(
            update(AdminLoginAttempt).values(
                attempted_at=admin_auth.utcnow() - timedelta(seconds=901)
            )
        )
        db.commit()
    assert login(c).status_code == 200


@needs_db
def test_successful_login_resets_email_failure_count(admin):
    c = client()
    for _ in range(4):
        login(c, password="Wrong-Password-1234")
    assert login(c).status_code == 200
    for _ in range(4):
        assert login(c, password="Wrong-Password-1234").status_code == 401
    assert login(c).status_code == 200


@needs_db
def test_login_is_rate_limited_per_ip(admin, db_factory, monkeypatch):
    monkeypatch.setattr(settings, "admin_login_max_failures_per_ip", 3)
    c = client()
    for i in range(3):
        login(c, email=f"guess{i}@example.com", password="Wrong-Password-1234")
    assert login(c).status_code == 429


@needs_db
def test_failed_attempts_are_persisted(admin, db_factory):
    login(client(), password="Wrong-Password-1234")
    with db_factory() as db:
        attempt = db.scalar(select(AdminLoginAttempt))
        assert attempt.email == EMAIL and attempt.succeeded is False


# -------------------------------------------------------------------- CLI
@needs_db
def test_cli_never_creates_duplicate_or_weak_accounts(admin, db_factory, capsys):
    assert admin_cli.run(
        ["create", "--email", EMAIL, "--password-stdin"],
        session_factory=db_factory, stdin=io.StringIO(PASSWORD + "\n"),
    ) == 1
    assert admin_cli.run(
        ["create", "--email", "two@uhamboeastafrica.com", "--password-stdin"],
        session_factory=db_factory, stdin=io.StringIO("short\n"),
    ) == 1
    assert admin_cli.run(
        ["create", "--email", "not-an-email", "--password-stdin"],
        session_factory=db_factory, stdin=io.StringIO(PASSWORD + "\n"),
    ) == 1
    with db_factory() as db:
        assert len(db.scalars(select(AdminUser)).all()) == 1


@needs_db
def test_cli_interactive_password_must_match(db_factory):
    answers = iter([PASSWORD, PASSWORD + "typo"])
    assert admin_cli.run(
        ["create", "--email", "two@uhamboeastafrica.com"],
        session_factory=db_factory, prompt=lambda _: next(answers),
    ) == 1


@needs_db
def test_two_administrators_are_independent(admin, db_factory, capsys):
    create_admin(db_factory, "admin.two@uhamboeastafrica.com", "Second-Admin-Pass-99")
    one, two = client(), client()
    login(one)
    login(two, email="admin.two@uhamboeastafrica.com", password="Second-Admin-Pass-99")

    assert admin_cli.run(["revoke-sessions", "--email", EMAIL], session_factory=db_factory) == 0
    assert one.get("/auth/me").status_code == 401
    assert two.get("/auth/me").status_code == 200

    capsys.readouterr()
    assert admin_cli.run(["list"], session_factory=db_factory) == 0
    listing = capsys.readouterr().out
    assert EMAIL in listing and "admin.two@uhamboeastafrica.com" in listing
    assert "$argon2" not in listing


def test_session_lifetime_is_capped_at_eight_hours(monkeypatch):
    import importlib

    import app.config as config_module

    monkeypatch.setenv("SESSION_MAX_AGE_SECONDS", "86400")
    try:
        assert importlib.reload(config_module).Settings.session_max_age_seconds == 8 * 3600
        monkeypatch.setenv("SESSION_MAX_AGE_SECONDS", "3600")
        assert importlib.reload(config_module).Settings.session_max_age_seconds == 3600
    finally:
        monkeypatch.undo()
        importlib.reload(config_module)
