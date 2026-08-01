from fastapi import HTTPException, Request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

SESSION_COOKIE_SALT = "uhambo-admin-session"


def session_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        secret_key=settings.session_secret,
        salt=SESSION_COOKIE_SALT,
    )


def require_authenticated_admin(request: Request) -> dict:
    session_value = request.cookies.get(settings.session_cookie_name)
    if not session_value:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        payload = session_serializer().loads(
            session_value,
            max_age=settings.session_max_age_seconds,
        )
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Session expired") from None
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session") from None

    user = payload.get("user") if isinstance(payload, dict) else None
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    groups = user.get("groups") or []
    if not any(group in groups for group in settings.cognito_admin_groups):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
