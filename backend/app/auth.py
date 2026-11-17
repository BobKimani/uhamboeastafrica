from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.services.admin_auth import csrf_token_matches, resolve_session, user_payload

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
CSRF_HEADER_NAME = "X-CSRF-Token"


def origin_allowed(request: Request) -> bool:
    """Reject browser requests whose Origin is not an allowed frontend origin.

    Requests without an Origin header (non-browser clients) pass this check;
    they still need a valid session cookie and CSRF token.
    """
    origin = request.headers.get("origin")
    if origin is None:
        return True
    return origin.rstrip("/") in settings.all_cors_allowed_origins


def require_authenticated_admin(request: Request, db: Session = Depends(get_db)) -> dict:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    lookup = resolve_session(db, token)
    if lookup.error == "expired":
        raise HTTPException(status_code=401, detail="Session expired")
    if lookup.error or lookup.admin is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    if request.method not in SAFE_METHODS:
        if not origin_allowed(request):
            raise HTTPException(status_code=403, detail="Forbidden")
        if not csrf_token_matches(token, request.headers.get(CSRF_HEADER_NAME)):
            raise HTTPException(status_code=403, detail="Invalid CSRF token")

    return user_payload(lookup.admin)
