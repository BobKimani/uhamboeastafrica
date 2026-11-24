"""Local administrator authentication: Argon2id passwords, DB-backed sessions,
per-session CSRF tokens and login rate limiting. Replaces AWS Cognito."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.db.admin_models import AdminLoginAttempt, AdminSession, AdminUser

# argon2-cffi defaults are Argon2id with the RFC 9106 "low memory" profile
# (t=3, m=64 MiB, p=4).
password_hasher = PasswordHasher()

MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 256  # bounds hashing cost for attacker-supplied input
MAX_EMAIL_LENGTH = 320
ADMIN_GROUPS = ["admin"]
SESSION_TOKEN_BYTES = 32
LAST_SEEN_UPDATE_INTERVAL = timedelta(minutes=5)

# Verified against when the email is unknown, so response time does not
# reveal whether an administrator account exists.
_DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(32))


class PasswordPolicyError(ValueError):
    pass


def utcnow() -> datetime:
    return datetime.now(UTC)


# ------------------------------------------------------------------ passwords
def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def validate_password_policy(password: str, email: str | None = None) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise PasswordPolicyError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )
    if len(password) > MAX_PASSWORD_LENGTH:
        raise PasswordPolicyError(
            f"Password must be at most {MAX_PASSWORD_LENGTH} characters"
        )
    if password.strip() != password:
        raise PasswordPolicyError("Password must not start or end with whitespace")
    if email and normalize_email(password) == normalize_email(email):
        raise PasswordPolicyError("Password must not be the email address")
    if len(set(password)) < 5:
        raise PasswordPolicyError("Password is too repetitive")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# ------------------------------------------------------------------ sessions
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def csrf_token_for(session_token: str) -> str:
    """Per-session CSRF token: HMAC of the session token keyed by SESSION_SECRET.

    Bound to the session (changes on every login) and never stored. The frontend
    receives it from /auth/login or /auth/me and sends it as X-CSRF-Token.
    """
    if not settings.session_secret:
        raise RuntimeError("SESSION_SECRET is required")
    digest = hmac.new(
        settings.session_secret.encode("utf-8"),
        b"uhambo-admin-csrf:" + session_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def csrf_token_matches(session_token: str, candidate: str | None) -> bool:
    if not candidate:
        return False
    return hmac.compare_digest(csrf_token_for(session_token), candidate)


def create_session(
    db: Session,
    admin: AdminUser,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> str:
    token = secrets.token_urlsafe(SESSION_TOKEN_BYTES)
    now = utcnow()
    db.add(
        AdminSession(
            admin_user_id=admin.id,
            token_hash=hash_token(token),
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(seconds=settings.session_max_age_seconds),
            ip_address=(ip_address or None),
            user_agent=(user_agent or "")[:512] or None,
        )
    )
    db.flush()
    return token


@dataclass(frozen=True)
class SessionLookup:
    session: AdminSession | None
    admin: AdminUser | None
    error: str | None  # None when valid


def resolve_session(db: Session, token: str | None) -> SessionLookup:
    """Validate a raw session token from the cookie."""
    if not token:
        return SessionLookup(None, None, "missing")
    if len(token) > 128:
        return SessionLookup(None, None, "invalid")

    row = db.execute(
        select(AdminSession, AdminUser)
        .join(AdminUser, AdminUser.id == AdminSession.admin_user_id)
        .where(AdminSession.token_hash == hash_token(token))
    ).first()
    if row is None:
        return SessionLookup(None, None, "invalid")

    session, admin = row
    now = utcnow()
    if session.revoked_at is not None:
        return SessionLookup(None, None, "invalid")
    if session.expires_at <= now:
        return SessionLookup(None, None, "expired")
    if not admin.is_active:
        return SessionLookup(None, None, "invalid")

    if now - session.last_seen_at > LAST_SEEN_UPDATE_INTERVAL:
        session.last_seen_at = now
    return SessionLookup(session, admin, None)


def revoke_session(db: Session, token: str | None) -> bool:
    if not token or len(token) > 128:
        return False
    result = db.execute(
        update(AdminSession)
        .where(AdminSession.token_hash == hash_token(token))
        .where(AdminSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    return bool(result.rowcount)


def revoke_all_sessions(db: Session, admin_id: UUID) -> int:
    result = db.execute(
        update(AdminSession)
        .where(AdminSession.admin_user_id == admin_id)
        .where(AdminSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    return result.rowcount or 0


def purge_expired_sessions(db: Session, *, older_than: timedelta = timedelta(days=30)) -> int:
    cutoff = utcnow() - older_than
    result = db.execute(
        delete(AdminSession).where(
            (AdminSession.expires_at < cutoff)
            | (AdminSession.revoked_at.is_not(None) & (AdminSession.revoked_at < cutoff))
        )
    )
    attempts = db.execute(
        delete(AdminLoginAttempt).where(AdminLoginAttempt.attempted_at < cutoff)
    )
    return (result.rowcount or 0) + (attempts.rowcount or 0)


def user_payload(admin: AdminUser) -> dict:
    """Same shape the frontend received from the Cognito-based session."""
    return {
        "sub": str(admin.id),
        "email": admin.email,
        "name": admin.name or admin.email,
        "groups": list(ADMIN_GROUPS),
        "isAdmin": True,
    }


# ------------------------------------------------------------- rate limiting
def login_retry_after(db: Session, email: str, ip_address: str | None) -> int | None:
    """Seconds until another attempt is allowed, or None if allowed now."""
    window = timedelta(seconds=settings.admin_login_window_seconds)
    now = utcnow()
    window_start = now - window

    last_success = db.scalar(
        select(func.max(AdminLoginAttempt.attempted_at))
        .where(AdminLoginAttempt.email == email)
        .where(AdminLoginAttempt.succeeded.is_(True))
    )
    email_since = max(window_start, last_success) if last_success else window_start

    checks = [
        (
            AdminLoginAttempt.email == email,
            email_since,
            settings.admin_login_max_failures_per_email,
        )
    ]
    if ip_address:
        checks.append(
            (
                AdminLoginAttempt.ip_address == ip_address,
                window_start,
                settings.admin_login_max_failures_per_ip,
            )
        )

    retry_after = 0
    for condition, since, limit in checks:
        failures = db.execute(
            select(func.count(), func.min(AdminLoginAttempt.attempted_at))
            .where(condition)
            .where(AdminLoginAttempt.succeeded.is_(False))
            .where(AdminLoginAttempt.attempted_at > since)
        ).one()
        count, oldest = failures
        if count >= limit and oldest is not None:
            retry_after = max(retry_after, int((oldest + window - now).total_seconds()) + 1)

    return retry_after or None


def record_login_attempt(
    db: Session, email: str, ip_address: str | None, *, succeeded: bool
) -> None:
    db.add(
        AdminLoginAttempt(
            email=email[:MAX_EMAIL_LENGTH],
            ip_address=ip_address,
            succeeded=succeeded,
            attempted_at=utcnow(),
        )
    )


def authenticate(db: Session, email: str, password: str) -> AdminUser | None:
    """Return the active admin for valid credentials, else None (constant-ish time)."""
    admin = db.scalar(select(AdminUser).where(AdminUser.email == email))
    if admin is None:
        verify_password(_DUMMY_HASH, password)
        return None
    if not verify_password(admin.password_hash, password):
        return None
    if not admin.is_active:
        return None
    if password_hasher.check_needs_rehash(admin.password_hash):
        admin.password_hash = hash_password(password)
    return admin
