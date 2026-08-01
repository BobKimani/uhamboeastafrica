import base64
import json
import logging
from collections.abc import Mapping
from urllib.parse import quote, urlparse

from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from itsdangerous import BadSignature, SignatureExpired

from app.auth import session_serializer
from app.cognito import oauth
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
SESSION_COOKIE_NAME = settings.session_cookie_name


def _safe_frontend_redirect(path: str = "/admin") -> str:
    if not path.startswith("/admin"):
        path = "/admin"
    return f"{settings.frontend_url}{path}"


def _admin_auth_redirect() -> str:
    return f"{settings.frontend_url}/auth?redirect={quote('/admin', safe='')}"


def _allowed_forwarded_hosts() -> set[str]:
    hosts = set()
    for url in (settings.frontend_url, settings.cognito_redirect_uri):
        host = urlparse(url or "").netloc
        if host:
            hosts.add(host.lower())
    return hosts


def _callback_redirect_uri(request: Request) -> str:
    # Only honour X-Forwarded-Host when it matches a host we already trust
    # from configuration; otherwise an attacker-supplied header would steer
    # the OAuth redirect_uri.
    forwarded_host = (request.headers.get("x-forwarded-host") or "").strip().lower()
    if forwarded_host and forwarded_host in _allowed_forwarded_hosts():
        proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        return f"{proto}://{forwarded_host}/auth/callback"
    return settings.cognito_redirect_uri


def _create_session_value(user: dict) -> str:
    return session_serializer().dumps({"user": user})


def _load_session_user(session_value: str) -> tuple[dict | None, str | None]:
    try:
        payload = session_serializer().loads(
            session_value,
            max_age=settings.session_max_age_seconds,
        )
    except SignatureExpired:
        return None, "expired"
    except BadSignature:
        return None, "invalid_signature"

    if not isinstance(payload, dict):
        return None, "invalid_payload"
    user = payload.get("user")
    if not isinstance(user, dict):
        return None, "user_missing"
    if not user.get("sub"):
        return None, "subject_missing"
    if not user.get("isAdmin"):
        return None, "admin_missing"
    return user, None


def _unauthenticated_response(error: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"authenticated": False, "user": None, "error": error},
    )


def _groups(user_info: dict) -> list[str]:
    groups = user_info.get("cognito:groups") or user_info.get("groups") or []
    if isinstance(groups, list):
        return [str(group) for group in groups]
    if isinstance(groups, str):
        return [groups]
    return []


def _mapping(value: object) -> dict:
    return dict(value) if isinstance(value, Mapping) else {}


def _jwt_payload(token: object) -> dict:
    if not isinstance(token, str):
        return {}
    parts = token.split(".")
    if len(parts) < 2:
        return {}

    payload = parts[1]
    payload += "=" * (-len(payload) % 4)
    try:
        decoded = base64.urlsafe_b64decode(payload.encode("ascii"))
        data = json.loads(decoded)
    except (ValueError, TypeError, UnicodeDecodeError):
        return {}
    return _mapping(data)


def _merged_user_info(token: dict) -> dict:
    claims = {}
    claims.update(_jwt_payload(token.get("id_token")))
    claims.update(_jwt_payload(token.get("access_token")))
    claims.update(_mapping(token.get("id_token_claims")))
    claims.update(_mapping(token.get("claims")))
    claims.update(_mapping(token.get("userinfo")))
    return claims


def _session_user(user_info: dict) -> dict:
    email = user_info.get("email")
    name = user_info.get("name") or user_info.get("given_name") or email
    groups = _groups(user_info)
    is_admin = any(group in groups for group in settings.cognito_admin_groups)
    return {
        "sub": user_info.get("sub"),
        "email": email,
        "name": name,
        "groups": groups,
        "isAdmin": is_admin,
    }


def _forbidden_response() -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={"success": False, "error": "Admin access is required"},
    )


@router.get("/login")
async def login(request: Request):
    redirect = request.query_params.get("redirect") or "/admin"
    request.session["post_login_redirect"] = (
        redirect if redirect.startswith("/admin") else "/admin"
    )
    redirect_uri = _callback_redirect_uri(request)
    logger.info(
        "Starting Cognito login: redirect=%s redirect_uri=%s host=%s",
        request.session["post_login_redirect"],
        redirect_uri,
        request.headers.get("host"),
    )
    return await oauth.cognito.authorize_redirect(
        request,
        redirect_uri=redirect_uri,
        prompt="login",
    )


@router.get("/callback")
async def callback(request: Request):
    if "error" in request.query_params:
        detail = (
            request.query_params.get("error_description")
            or request.query_params["error"]
        )
        logger.warning("Cognito callback returned error: %s", detail)
        raise HTTPException(status_code=401, detail=detail)
    if "code" not in request.query_params:
        logger.warning("Cognito callback missing authorization code")
        raise HTTPException(status_code=400, detail="Missing OAuth authorization code")

    try:
        token = await oauth.cognito.authorize_access_token(request)
    except OAuthError as exc:
        logger.warning("Cognito token exchange failed: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=401, detail="Cognito authentication failed"
        ) from exc
    logger.info("Cognito authorization-code exchange succeeded")

    user_info = _merged_user_info(dict(token))
    if not user_info:
        user_info = _mapping(await oauth.cognito.userinfo(token=token))
    elif "sub" not in user_info or "email" not in user_info:
        profile = _mapping(await oauth.cognito.userinfo(token=token))
        user_info.update(
            {
                key: value
                for key, value in profile.items()
                if key not in user_info
            }
        )

    user = _session_user(dict(user_info))
    if not user.get("sub"):
        logger.warning("Cognito callback missing user subject")
        raise HTTPException(
            status_code=401, detail="Cognito user profile is missing subject"
        )
    if not user["isAdmin"]:
        logger.warning(
            "Cognito user rejected: admin_groups=%s user_groups=%s",
            settings.cognito_admin_groups,
            user["groups"],
        )
        request.session.clear()
        return _forbidden_response()

    redirect = request.session.pop("post_login_redirect", "/admin")
    request.session.clear()
    session_value = _create_session_value(user)
    response = RedirectResponse(
        url=_safe_frontend_redirect(redirect),
        status_code=302,
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_value,
        httponly=True,
        secure=settings.session_https_only,
        samesite="lax",
        path="/",
        max_age=settings.session_max_age_seconds,
    )
    logger.info(
        "Cognito callback succeeded: sub=%s email_present=%s groups=%s session_cookie=%s set_cookie_header_present=%s",
        user["sub"],
        bool(user.get("email")),
        user["groups"],
        SESSION_COOKIE_NAME,
        "set-cookie" in response.headers,
    )
    return response


@router.get("/me")
async def me(request: Request):
    session_value = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_value:
        logger.info(
            "/auth/me unauthorized: expected_cookie=%s cookie_present=false",
            SESSION_COOKIE_NAME,
        )
        return _unauthenticated_response("Session cookie missing")

    user, error = _load_session_user(session_value)
    if error:
        logger.info(
            "/auth/me unauthorized: expected_cookie=%s cookie_present=true reason=%s",
            SESSION_COOKIE_NAME,
            error,
        )
        response = _unauthenticated_response(f"Session {error.replace('_', ' ')}")
        response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
        return response

    logger.info("/auth/me authenticated: sub=%s", user.get("sub"))
    return {
        "authenticated": True,
        "user": {
            "sub": user.get("sub"),
            "email": user.get("email"),
            "name": user.get("name"),
            "groups": user.get("groups", []),
            "isAdmin": True,
        },
    }


@router.get("/logout")
async def logout(request: Request):
    logger.info(
        "Logging out admin session: expected_cookie=%s cookie_present=%s",
        SESSION_COOKIE_NAME,
        SESSION_COOKIE_NAME in request.cookies,
    )
    request.session.clear()
    response = RedirectResponse(_admin_auth_redirect())
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return response
