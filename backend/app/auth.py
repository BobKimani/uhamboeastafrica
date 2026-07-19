from fastapi import Header, HTTPException
from firebase_admin import auth as fb_auth

from app.firebase import _get_app


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Bearer-token dependency. Mirrors the TS verifyIdToken guard."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split("Bearer ")[1]
    try:
        _get_app()  # ensure firebase app initialized
        return fb_auth.verify_id_token(token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
