import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import CSRF_HEADER_NAME, origin_allowed
from app.config import settings
from app.db.session import get_db
from app.services.admin_auth import (
    MAX_EMAIL_LENGTH,
    MAX_PASSWORD_LENGTH,
    authenticate,
    create_session,
    csrf_token_for,
    csrf_token_matches,
    login_retry_after,
    normalize_email,
    record_login_attempt,
    resolve_session,
    revoke_session,
    user_payload,
    utcnow,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
SESSION_COOKIE_NAME = settings.session_cookie_name
INVALID_CREDENTIALS = "Invalid email or password"


class LoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=MAX_EMAIL_LENGTH)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


def _safe_admin_path(path: str | None) -> str:
    if not path or not path.startswith("/admin") or path.startswith("//"):
        return "/admin"
    return path


def _frontend_login_url(redirect: str = "/admin") -> str:
    return f"{settings.frontend_url}/auth?redirect={quote(_safe_admin_path(redirect), safe='')}"


def _client_ip(request: Request) -> str | None:
    # Behind Nginx, uvicorn --proxy-headers sets request.client from X-Forwarded-For.
    return request.client.host if request.client else None


def _set_session_cookie(response, token: str) -> None:
    # Host-only (no Domain attribute): scoped to api.uhamboeastafrica.com.
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.session_max_age_seconds,
        path="/",
        httponly=True,
        secure=settings.session_https_only,
        samesite="lax",
    )


def _clear_session_cookie(response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.session_https_only,
        samesite="lax",
    )


def _unauthenticated_response(error: str, status_code: int = 401) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"authenticated": False, "user": None, "error": error},
        headers={"Cache-Control": "no-store"},
    )


def _authenticated_body(admin, token: str) -> dict:
    return {
        "authenticated": True,
        "user": user_payload(admin),
        "csrfToken": csrf_token_for(token),
    }


@router.post("/login")
async def login(payload: LoginPayload, request: Request, db: Session = Depends(get_db)):
    # Login CSRF protection: browsers always send Origin on cross-origin POSTs.
    if not origin_allowed(request):
        return _unauthenticated_response("Forbidden", status_code=403)

    email = normalize_email(payload.email)
    ip_address = _client_ip(request)

    retry_after = login_retry_after(db, email, ip_address)
    if retry_after:
        logger.warning("Admin login rate limited: ip=%s", ip_address)
        response = _unauthenticated_response(
            "Too many login attempts. Please try again later.", status_code=429
        )
        response.headers["Retry-After"] = str(retry_after)
        return response

    admin = authenticate(db, email, payload.password)
    if admin is None:
        record_login_attempt(db, email, ip_address, succeeded=False)
        db.commit()
        logger.info("Admin login failed: ip=%s", ip_address)
        return _unauthenticated_response(INVALID_CREDENTIALS)

    # Prevent session fixation / stale sessions: drop any session presented.
    revoke_session(db, request.cookies.get(SESSION_COOKIE_NAME))
    record_login_attempt(db, email, ip_address, succeeded=True)
    admin.last_login_at = utcnow()
    token = create_session(
        db,
        admin,
        ip_address=ip_address,
        user_agent=request.headers.get("user-agent"),
    )
    db.commit()
    logger.info("Admin login succeeded: sub=%s", admin.id)

    response = JSONResponse(
        content=_authenticated_body(admin, token),
        headers={"Cache-Control": "no-store"},
    )
    _set_session_cookie(response, token)
    return response


@router.get("/login")
async def login_page(request: Request):
    # Former Cognito entry point: send browsers to the frontend login form.
    return RedirectResponse(
        _frontend_login_url(request.query_params.get("redirect") or "/admin"),
        status_code=302,
    )


@router.get("/me")
async def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return _unauthenticated_response("Session cookie missing")

    lookup = resolve_session(db, token)
    if lookup.error or lookup.admin is None:
        reason = "expired" if lookup.error == "expired" else "invalid"
        logger.info("/auth/me unauthorized: reason=%s", reason)
        response = _unauthenticated_response(f"Session {reason}")
        _clear_session_cookie(response)
        return response

    return JSONResponse(
        content=_authenticated_body(lookup.admin, token),
        headers={"Cache-Control": "no-store"},
    )


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        lookup = resolve_session(db, token)
        if lookup.error is None:
            # A live session can only be ended by its own frontend (CSRF).
            if not origin_allowed(request) or not csrf_token_matches(
                token, request.headers.get(CSRF_HEADER_NAME)
            ):
                return JSONResponse(
                    status_code=403,
                    content={"success": False, "error": "Invalid CSRF token"},
                )
            revoke_session(db, token)
            db.commit()
            logger.info("Admin logged out: sub=%s", lookup.admin.id)

    response = JSONResponse(
        content={"success": True, "message": "Logged out"},
        headers={"Cache-Control": "no-store"},
    )
    _clear_session_cookie(response)
    return response


@router.get("/logout")
async def logout_page():
    # Former GET logout link. Ending a session is a state change, so it now
    # requires POST /auth/logout with a CSRF token; this only redirects.
    return RedirectResponse(_frontend_login_url(), status_code=302)
