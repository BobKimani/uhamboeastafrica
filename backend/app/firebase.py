import firebase_admin
from firebase_admin import credentials, firestore

from app.config import settings


def format_private_key(key: str | None) -> str:
    """Port of formatPrivateKey from lib/firebase-admin.ts."""
    if not key:
        raise ValueError("Missing FIREBASE_PRIVATE_KEY")

    k = key.strip()

    # Strip a single trailing comma left over from a misformatted .env line.
    if k.endswith(","):
        k = k[:-1].strip()

    # Strip wrapping quotes if a loader passed them through.
    if (k.startswith('"') and k.endswith('"')) or (
        k.startswith("'") and k.endswith("'")
    ):
        k = k[1:-1]

    # Convert literal "\n" escape sequences into real newlines.
    k = k.replace("\\n", "\n")

    if "BEGIN PRIVATE KEY" not in k:
        raise ValueError(
            "FIREBASE_PRIVATE_KEY does not look like a PEM key — check the .env value"
        )

    return k


_app = None
_db = None


def _get_app():
    global _app
    if _app is not None:
        return _app
    if firebase_admin._apps:
        _app = next(iter(firebase_admin._apps.values()))
        return _app
    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": format_private_key(settings.firebase_private_key),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    _app = firebase_admin.initialize_app(cred)
    return _app


def get_db():
    global _db
    if _db is None:
        _db = firestore.client(_get_app())
    return _db
