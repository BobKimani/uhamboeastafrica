# Python Backend / Next.js Frontend Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the repo into `frontend/` (existing Next.js app, behavior unchanged) and `backend/` (new FastAPI service that takes over the 4 API routes), connected by a Next.js rewrite proxy.

**Architecture:** The Next.js app moves wholesale into `frontend/`; its 4 `app/api/*` route handlers are deleted and replaced by a rewrite that proxies `/api/*` to a FastAPI service in `backend/`. FastAPI reproduces the exact same paths, status codes, JSON shapes, Firestore operations, and Firebase auth, using the `firebase-admin` Python SDK and Pydantic models ported from the Zod schemas.

**Tech Stack:** Next.js 16 / React 19 / TypeScript (frontend, unchanged); Python 3 + FastAPI + uvicorn + firebase-admin + pydantic[email] (backend); pytest + httpx (backend tests).

## Global Constraints

- **No behavior change.** Same routes, HTTP methods, status codes (201/200/400/401/500), and JSON shapes as the current TypeScript routes. Verbatim message strings (see Task 4/5 tables).
- **Scope:** Only `app/api/bookings/*` and `app/api/inquiries/*` move to Python. `lib/pricing`, `lib/data`, `lib/api/*`, `lib/firebase.ts`, hooks, and Zod form schemas stay in the frontend, untouched.
- **Same env var names:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (backend); `NEXT_PUBLIC_*` (frontend). New: `BACKEND_API_URL` (frontend, default `http://localhost:8000`).
- **Git:** The user commits/pushes themselves. Do NOT run `git commit`, `git mv`, branch, or push. Use plain filesystem `mv`/`cp`. Each task ends at a reviewable checkpoint left in the working tree.
- **Firestore field names stay camelCase** in stored documents (`createdAt`, `updatedAt`, `status`).

---

## File Structure

**Frontend (moved into `frontend/`):** `app/` (minus deleted api routes), `components/`, `lib/`, `public/`, `types/`, `stitch/`, `package.json`, `package-lock.json`, `node_modules/`, `tsconfig.json`, `tsconfig.tsbuildinfo`, `next.config.ts` (gets rewrite added), `next-env.d.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.local` (new, split from root `.env`), `.gitignore` (new, frontend-scoped).

**Backend (new `backend/`):**
- `app/main.py` — FastAPI app, router registration, HTTPException handler.
- `app/config.py` — env loading via python-dotenv.
- `app/firebase.py` — credential init + `get_db()` + `format_private_key()`.
- `app/auth.py` — `get_current_user` Bearer-token dependency.
- `app/schemas.py` — Pydantic models (ported Zod schemas).
- `app/routers/bookings.py`, `app/routers/inquiries.py` — endpoints.
- `tests/conftest.py`, `tests/test_bookings.py`, `tests/test_inquiries.py`.
- `requirements.txt`, `.env`, `.env.example`.

**Root:** `docs/`, `README.md` (updated), `CLAUDE.md`, `AGENTS.md`, `.gitignore` (updated for backend), `.git/`.

---

### Task 1: Move the frontend into `frontend/`

**Files:**
- Move: all Next.js app files from repo root into `frontend/`.
- Create: `frontend/.env.local`, `frontend/.gitignore`.
- Modify: root `.gitignore`.

**Interfaces:**
- Consumes: nothing.
- Produces: a working Next.js app rooted at `frontend/` that still builds and runs, with all `lib/*`, `components/*`, `app/*` (including the still-present `app/api/*` routes) intact.

- [ ] **Step 1: Create the frontend directory and move app files**

Run from repo root (plain `mv`, NOT `git mv`):

```bash
mkdir -p frontend
mv app components lib public types stitch frontend/
mv package.json package-lock.json tsconfig.json tsconfig.tsbuildinfo frontend/
mv next.config.ts next-env.d.ts eslint.config.mjs postcss.config.mjs frontend/
mv node_modules frontend/
rm -rf .next   # stale build output; will be regenerated under frontend/
```

- [ ] **Step 2: Split the root `.env` into frontend and backend env files**

The root `.env` holds both `NEXT_PUBLIC_*` (frontend) and `FIREBASE_*` admin creds (backend). Split without printing secrets:

```bash
# Frontend gets the public vars + the backend URL
grep '^NEXT_PUBLIC_' .env > frontend/.env.local
printf 'BACKEND_API_URL=http://localhost:8000\n' >> frontend/.env.local

# Backend gets the admin service-account creds (created in Task 2's dir; stage here)
mkdir -p backend
grep -E '^FIREBASE_(PROJECT_ID|CLIENT_EMAIL|PRIVATE_KEY)' .env > backend/.env

# Remove the old root .env (now split)
rm .env
```

Note: `FIREBASE_PRIVATE_KEY` may span context but is a single logical line in `.env`; if the value is multi-line/quoted, verify `backend/.env` captured the full key (it should, as a single `KEY=...` line). Do not echo the file contents.

- [ ] **Step 3: Create `frontend/.gitignore`**

```
# dependencies
/node_modules
/.pnp
.pnp.*

# next.js
/.next/
/out/

# production
/build

# env files
.env*
!.env.example

# typescript
*.tsbuildinfo
next-env.d.ts

# design
stitch/
```

- [ ] **Step 4: Replace root `.gitignore` with a repo-wide one**

```
# OS
.DS_Store
*.pem

# secrets
.env
.env.*
!.env.example
firebase-service-account.json

# backend (python)
backend/.venv/
backend/__pycache__/
**/__pycache__/
*.py[cod]
.pytest_cache/

# frontend build artifacts (also ignored in frontend/.gitignore)
frontend/node_modules/
frontend/.next/
frontend/out/

# vercel
.vercel
```

- [ ] **Step 5: Verify the frontend still builds and lints from its new location**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint passes and `next build` completes successfully (the `app/api/*` routes still compile — they are removed later in Task 7). If the build complains about a missing `.env` admin var, that is acceptable here since those routes are deleted in Task 7; confirm the build itself succeeds.

- [ ] **Step 6: Checkpoint**

Leave changes in the working tree for the user to review/commit. Report: frontend moved to `frontend/`, env split, builds green.

---

### Task 2: Scaffold the FastAPI backend (boots with a health check)

**Files:**
- Create: `backend/requirements.txt`, `backend/.env.example`, `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/firebase.py`, `backend/app/auth.py`, `backend/app/main.py`, `backend/app/routers/__init__.py`.

**Interfaces:**
- Produces:
  - `app.config.settings` with `.firebase_project_id`, `.firebase_client_email`, `.firebase_private_key`.
  - `app.firebase.format_private_key(key: str | None) -> str`.
  - `app.firebase.get_db()` → Firestore client (FastAPI dependency-compatible callable).
  - `app.auth.get_current_user(authorization: str | None) -> dict` (FastAPI dependency; raises `HTTPException(401, "Unauthorized")`).
  - `app.main.app` → FastAPI instance with an HTTPException handler returning `{"success": False, "error": <detail>}`.

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi
uvicorn[standard]
firebase-admin
pydantic[email]
python-dotenv
pytest
httpx
```

- [ ] **Step 2: Create the virtualenv and install**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
Expected: installs without errors.

- [ ] **Step 3: Create `backend/.env.example`**

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- [ ] **Step 4: Create `backend/app/__init__.py` and `backend/app/routers/__init__.py`**

Both empty files:

```python
```

- [ ] **Step 5: Create `backend/app/config.py`**

```python
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
    firebase_client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    firebase_private_key = os.environ.get("FIREBASE_PRIVATE_KEY")


settings = Settings()
```

- [ ] **Step 6: Create `backend/app/firebase.py` (port of `lib/firebase-admin.ts`)**

```python
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
```

- [ ] **Step 7: Create `backend/app/auth.py`**

```python
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
```

- [ ] **Step 8: Create `backend/app/main.py`**

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Uhambo API")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 9: Verify the app boots**

```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --port 8000 &
sleep 2 && curl -s http://localhost:8000/health
kill %1
```
Expected: `{"status":"ok"}`.

- [ ] **Step 10: Checkpoint**

Leave for user review. Report: backend scaffold boots, health check passes.

---

### Task 3: Pydantic schemas (TDD)

**Files:**
- Create: `backend/app/schemas.py`, `backend/tests/__init__.py`, `backend/tests/test_schemas.py`.

**Interfaces:**
- Produces:
  - `CreateBooking` (fields: `fullName, email, phone, destination, travelStartDate, travelEndDate, travellingWith, bookingType, numberOfTravellers, numberOfRooms, minimumBudget, maximumBudget`) with validators `maximumBudget >= minimumBudget` and `travelEndDate >= travelStartDate`.
  - `UpdateBookingStatus` (`status` Literal).
  - `CreateInquiry` (`fullName, contact, email, message`).
  - `UpdateInquiryStatus` (`status` Literal).
  - All raise `pydantic.ValidationError` on bad input.

- [ ] **Step 1: Write failing tests `backend/tests/test_schemas.py`**

```python
import pytest
from pydantic import ValidationError

from app.schemas import (
    CreateBooking,
    UpdateBookingStatus,
    CreateInquiry,
    UpdateInquiryStatus,
)

VALID_BOOKING = {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "1234567",
    "destination": "Serengeti",
    "travelStartDate": "2026-07-01",
    "travelEndDate": "2026-07-10",
    "travellingWith": "couple",
    "bookingType": "both",
    "numberOfTravellers": "2",   # string -> coerced to int
    "numberOfRooms": "1",
    "minimumBudget": "1000",
    "maximumBudget": "2000",
}


def test_create_booking_valid_coerces_numbers():
    m = CreateBooking.model_validate(VALID_BOOKING)
    assert m.numberOfTravellers == 2
    assert m.maximumBudget == 2000


def test_create_booking_rejects_short_name():
    bad = {**VALID_BOOKING, "fullName": "J"}
    with pytest.raises(ValidationError):
        CreateBooking.model_validate(bad)


def test_create_booking_rejects_bad_email():
    bad = {**VALID_BOOKING, "email": "nope"}
    with pytest.raises(ValidationError):
        CreateBooking.model_validate(bad)


def test_create_booking_rejects_max_below_min():
    bad = {**VALID_BOOKING, "minimumBudget": "3000", "maximumBudget": "1000"}
    with pytest.raises(ValidationError):
        CreateBooking.model_validate(bad)


def test_create_booking_rejects_end_before_start():
    bad = {**VALID_BOOKING, "travelStartDate": "2026-07-10", "travelEndDate": "2026-07-01"}
    with pytest.raises(ValidationError):
        CreateBooking.model_validate(bad)


def test_update_booking_status_enum():
    assert UpdateBookingStatus.model_validate({"status": "confirmed"}).status == "confirmed"
    with pytest.raises(ValidationError):
        UpdateBookingStatus.model_validate({"status": "bogus"})


def test_create_inquiry_valid():
    m = CreateInquiry.model_validate(
        {"fullName": "Jo", "contact": "1234567", "email": "j@x.com", "message": "Hello there!"}
    )
    assert m.email == "j@x.com"


def test_create_inquiry_rejects_short_message():
    with pytest.raises(ValidationError):
        CreateInquiry.model_validate(
            {"fullName": "Jo", "contact": "1234567", "email": "j@x.com", "message": "short"}
        )


def test_update_inquiry_status_enum():
    assert UpdateInquiryStatus.model_validate({"status": "read"}).status == "read"
    with pytest.raises(ValidationError):
        UpdateInquiryStatus.model_validate({"status": "bogus"})
```

Also create empty `backend/tests/__init__.py`.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/test_schemas.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas'`.

- [ ] **Step 3: Implement `backend/app/schemas.py`**

```python
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


class CreateBooking(BaseModel):
    fullName: str = Field(min_length=2)
    email: EmailStr
    phone: str = Field(min_length=7)
    destination: str = Field(min_length=2)
    travelStartDate: str = Field(min_length=1)
    travelEndDate: str = Field(min_length=1)
    travellingWith: Literal["solo", "couple", "family", "group"]
    bookingType: Literal["accommodation", "transport", "both"]
    numberOfTravellers: int = Field(ge=1)
    numberOfRooms: int = Field(ge=0)
    minimumBudget: float = Field(ge=0)
    maximumBudget: float = Field(ge=0)

    @model_validator(mode="after")
    def _check_budget_and_dates(self):
        if self.maximumBudget < self.minimumBudget:
            raise ValueError(
                "Maximum budget must be greater than or equal to minimum budget"
            )
        if date.fromisoformat(self.travelEndDate) < date.fromisoformat(
            self.travelStartDate
        ):
            raise ValueError(
                "Travel end date must be after or equal to travel start date"
            )
        return self


class UpdateBookingStatus(BaseModel):
    status: Literal[
        "new", "contacted", "quoted", "confirmed", "cancelled", "completed"
    ]


class CreateInquiry(BaseModel):
    fullName: str = Field(min_length=2)
    contact: str = Field(min_length=7)
    email: EmailStr
    message: str = Field(min_length=10)


class UpdateInquiryStatus(BaseModel):
    status: Literal["new", "read", "replied", "archived"]
```

Note: the date validator uses `date.fromisoformat`; the original TS uses `new Date(...)`. Both accept the `YYYY-MM-DD` strings the frontend sends. If a date fails to parse, the resulting `ValueError` still surfaces as a 400 (acceptable — invalid date input was never valid).

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/test_schemas.py -v
```
Expected: all PASS.

- [ ] **Step 5: Checkpoint** — leave for user review.

---

### Task 4: Bookings router (TDD)

**Files:**
- Create: `backend/app/routers/bookings.py`, `backend/tests/conftest.py`, `backend/tests/test_bookings.py`.
- Modify: `backend/app/main.py` (register router).

**Interfaces:**
- Consumes: `get_db` (from `app.firebase`), `get_current_user` (from `app.auth`), schemas from Task 3.
- Produces router with:
  - `POST /api/bookings` → `201 {"success": True, "message": "Booking submitted successfully", "id": <id>}`
  - `GET /api/bookings` (auth) → `200 {"success": True, "bookings": [...]}`
  - `PATCH /api/bookings/{id}` (auth) → `200 {"success": True, "message": "Booking status updated successfully"}`
  - `DELETE /api/bookings/{id}` (auth) → `200 {"success": True, "message": "Booking deleted successfully"}`

**Behavior parity table:**

| Endpoint | Bad input | Missing/invalid auth | Failure |
|---|---|---|---|
| POST | `400 {"success":false,"error":"Invalid booking data","details":...}` | n/a | `500 {"success":false,"error":"Failed to submit booking"}` |
| GET | n/a | `401 {"success":false,"error":"Unauthorized"}` | `500 {"success":false,"error":"Failed to fetch bookings"}` |
| PATCH | `400 ... "Invalid status"` | `401 Unauthorized` | `500 ... "Failed to update booking status"` |
| DELETE | n/a | `401 Unauthorized` | `500 ... "Failed to delete booking"` |

- [ ] **Step 1: Create `backend/tests/conftest.py` (shared fakes + overrides)**

```python
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.firebase import get_db
from app.auth import get_current_user


@pytest.fixture
def fake_db():
    """A MagicMock Firestore client. Configure per test."""
    return MagicMock()


@pytest.fixture
def client(fake_db):
    app.dependency_overrides[get_db] = lambda: fake_db
    app.dependency_overrides[get_current_user] = lambda: {"uid": "test-admin"}
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client(fake_db):
    """Client WITHOUT the auth override, to exercise the real 401 guard."""
    app.dependency_overrides[get_db] = lambda: fake_db
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write failing tests `backend/tests/test_bookings.py`**

```python
from unittest.mock import MagicMock

VALID_BOOKING = {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "1234567",
    "destination": "Serengeti",
    "travelStartDate": "2026-07-01",
    "travelEndDate": "2026-07-10",
    "travellingWith": "couple",
    "bookingType": "both",
    "numberOfTravellers": 2,
    "numberOfRooms": 1,
    "minimumBudget": 1000,
    "maximumBudget": 2000,
}


def test_create_booking_success(client, fake_db):
    doc_ref = MagicMock()
    doc_ref.id = "abc123"
    # Python firestore .add() returns (update_time, DocumentReference)
    fake_db.collection.return_value.add.return_value = (None, doc_ref)

    res = client.post("/api/bookings", json=VALID_BOOKING)

    assert res.status_code == 201
    assert res.json() == {
        "success": True,
        "message": "Booking submitted successfully",
        "id": "abc123",
    }
    written = fake_db.collection.return_value.add.call_args[0][0]
    assert written["status"] == "new"
    assert "createdAt" in written and "updatedAt" in written


def test_create_booking_invalid(client):
    res = client.post("/api/bookings", json={**VALID_BOOKING, "email": "nope"})
    assert res.status_code == 400
    body = res.json()
    assert body["success"] is False
    assert body["error"] == "Invalid booking data"
    assert "details" in body


def test_list_bookings_requires_auth(unauth_client):
    res = unauth_client.get("/api/bookings")
    assert res.status_code == 401
    assert res.json() == {"success": False, "error": "Unauthorized"}


def test_list_bookings_success(client, fake_db):
    doc = MagicMock()
    doc.id = "b1"
    doc.to_dict.return_value = {"fullName": "Jane", "status": "new"}
    fake_db.collection.return_value.order_by.return_value.stream.return_value = [doc]

    res = client.get("/api/bookings")

    assert res.status_code == 200
    assert res.json() == {
        "success": True,
        "bookings": [{"id": "b1", "fullName": "Jane", "status": "new"}],
    }


def test_patch_booking_status(client, fake_db):
    res = client.patch("/api/bookings/b1", json={"status": "confirmed"})
    assert res.status_code == 200
    assert res.json() == {
        "success": True,
        "message": "Booking status updated successfully",
    }
    update_arg = fake_db.collection.return_value.document.return_value.update.call_args[0][0]
    assert update_arg["status"] == "confirmed"
    assert "updatedAt" in update_arg


def test_patch_booking_invalid_status(client):
    res = client.patch("/api/bookings/b1", json={"status": "bogus"})
    assert res.status_code == 400
    assert res.json()["error"] == "Invalid status"


def test_delete_booking(client, fake_db):
    res = client.delete("/api/bookings/b1")
    assert res.status_code == 200
    assert res.json() == {"success": True, "message": "Booking deleted successfully"}
    fake_db.collection.return_value.document.return_value.delete.assert_called_once()


def test_patch_booking_requires_auth(unauth_client):
    res = unauth_client.patch("/api/bookings/b1", json={"status": "confirmed"})
    assert res.status_code == 401
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/test_bookings.py -v
```
Expected: FAIL (router not registered / 404s).

- [ ] **Step 4: Implement `backend/app/routers/bookings.py`**

```python
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from firebase_admin import firestore
from pydantic import ValidationError

from app.auth import get_current_user
from app.firebase import get_db
from app.schemas import CreateBooking, UpdateBookingStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("")
async def create_booking(request: Request, db=Depends(get_db)):
    body = await request.json()
    try:
        data = CreateBooking.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Invalid booking data",
                "details": e.errors(),
            },
        )
    try:
        booking = {
            **data.model_dump(),
            "status": "new",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        _, doc_ref = db.collection("bookings").add(booking)
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Booking submitted successfully",
                "id": doc_ref.id,
            },
        )
    except Exception:
        logger.exception("Create booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to submit booking"},
        )


@router.get("")
async def list_bookings(db=Depends(get_db), user=Depends(get_current_user)):
    try:
        docs = (
            db.collection("bookings")
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .stream()
        )
        bookings = [{"id": d.id, **d.to_dict()} for d in docs]
        return {"success": True, "bookings": bookings}
    except Exception:
        logger.exception("Fetch bookings error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch bookings"},
        )


@router.patch("/{booking_id}")
async def update_booking_status(
    booking_id: str, request: Request, db=Depends(get_db), user=Depends(get_current_user)
):
    body = await request.json()
    try:
        data = UpdateBookingStatus.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid status", "details": e.errors()},
        )
    try:
        db.collection("bookings").document(booking_id).update(
            {"status": data.status, "updatedAt": firestore.SERVER_TIMESTAMP}
        )
        return {"success": True, "message": "Booking status updated successfully"}
    except Exception:
        logger.exception("Update booking status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to update booking status"},
        )


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: str, db=Depends(get_db), user=Depends(get_current_user)
):
    try:
        db.collection("bookings").document(booking_id).delete()
        return {"success": True, "message": "Booking deleted successfully"}
    except Exception:
        logger.exception("Delete booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to delete booking"},
        )
```

Note: the auth dependency runs before the body is read, so the 401 guard fires ahead of validation — matching the TS order (auth check first in PATCH).

- [ ] **Step 5: Register the router in `backend/app/main.py`**

Add after the health route:

```python
from app.routers import bookings

app.include_router(bookings.router)
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/test_bookings.py -v
```
Expected: all PASS.

- [ ] **Step 7: Checkpoint** — leave for user review.

---

### Task 5: Inquiries router (TDD)

**Files:**
- Create: `backend/app/routers/inquiries.py`, `backend/tests/test_inquiries.py`.
- Modify: `backend/app/main.py` (register router).

**Interfaces:**
- Consumes: `get_db`, `get_current_user`, `CreateInquiry`, `UpdateInquiryStatus`.
- Produces router with:
  - `POST /api/inquiries` → `201 {"success": True, "message": "Inquiry submitted successfully", "id": <id>}`
  - `GET /api/inquiries` (auth) → `200 {"success": True, "inquiries": [...]}`
  - `PATCH /api/inquiries/{id}` (auth) → `200 {"success": True, "message": "Inquiry status updated successfully"}`

| Endpoint | Bad input | Missing/invalid auth | Failure |
|---|---|---|---|
| POST | `400 {"error":"Invalid inquiry data","details":...}` | n/a | `500 "Failed to submit inquiry"` |
| GET | n/a | `401 "Unauthorized"` | `500 "Failed to fetch inquiries"` |
| PATCH | `400 "Invalid status"` | `401 "Unauthorized"` | `500 "Failed to update inquiry status"` |

- [ ] **Step 1: Write failing tests `backend/tests/test_inquiries.py`**

```python
from unittest.mock import MagicMock

VALID_INQUIRY = {
    "fullName": "Jo Traveler",
    "contact": "1234567",
    "email": "jo@example.com",
    "message": "I would like to plan a safari trip.",
}


def test_create_inquiry_success(client, fake_db):
    doc_ref = MagicMock()
    doc_ref.id = "inq1"
    fake_db.collection.return_value.add.return_value = (None, doc_ref)

    res = client.post("/api/inquiries", json=VALID_INQUIRY)

    assert res.status_code == 201
    assert res.json() == {
        "success": True,
        "message": "Inquiry submitted successfully",
        "id": "inq1",
    }
    written = fake_db.collection.return_value.add.call_args[0][0]
    assert written["status"] == "new"


def test_create_inquiry_invalid(client):
    res = client.post("/api/inquiries", json={**VALID_INQUIRY, "message": "short"})
    assert res.status_code == 400
    assert res.json()["error"] == "Invalid inquiry data"


def test_list_inquiries_requires_auth(unauth_client):
    res = unauth_client.get("/api/inquiries")
    assert res.status_code == 401
    assert res.json() == {"success": False, "error": "Unauthorized"}


def test_list_inquiries_success(client, fake_db):
    doc = MagicMock()
    doc.id = "i1"
    doc.to_dict.return_value = {"fullName": "Jo", "status": "new"}
    fake_db.collection.return_value.order_by.return_value.stream.return_value = [doc]

    res = client.get("/api/inquiries")

    assert res.status_code == 200
    assert res.json() == {
        "success": True,
        "inquiries": [{"id": "i1", "fullName": "Jo", "status": "new"}],
    }


def test_patch_inquiry_status(client, fake_db):
    res = client.patch("/api/inquiries/i1", json={"status": "read"})
    assert res.status_code == 200
    assert res.json() == {
        "success": True,
        "message": "Inquiry status updated successfully",
    }
    update_arg = fake_db.collection.return_value.document.return_value.update.call_args[0][0]
    assert update_arg["status"] == "read"


def test_patch_inquiry_invalid_status(client):
    res = client.patch("/api/inquiries/i1", json={"status": "bogus"})
    assert res.status_code == 400
    assert res.json()["error"] == "Invalid status"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/test_inquiries.py -v
```
Expected: FAIL (404s — router not registered).

- [ ] **Step 3: Implement `backend/app/routers/inquiries.py`**

```python
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from firebase_admin import firestore
from pydantic import ValidationError

from app.auth import get_current_user
from app.firebase import get_db
from app.schemas import CreateInquiry, UpdateInquiryStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.post("")
async def create_inquiry(request: Request, db=Depends(get_db)):
    body = await request.json()
    try:
        data = CreateInquiry.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Invalid inquiry data",
                "details": e.errors(),
            },
        )
    try:
        inquiry = {
            **data.model_dump(),
            "status": "new",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        _, doc_ref = db.collection("inquiries").add(inquiry)
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Inquiry submitted successfully",
                "id": doc_ref.id,
            },
        )
    except Exception:
        logger.exception("Create inquiry error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to submit inquiry"},
        )


@router.get("")
async def list_inquiries(db=Depends(get_db), user=Depends(get_current_user)):
    try:
        docs = (
            db.collection("inquiries")
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .stream()
        )
        inquiries = [{"id": d.id, **d.to_dict()} for d in docs]
        return {"success": True, "inquiries": inquiries}
    except Exception:
        logger.exception("Fetch inquiries error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch inquiries"},
        )


@router.patch("/{inquiry_id}")
async def update_inquiry_status(
    inquiry_id: str, request: Request, db=Depends(get_db), user=Depends(get_current_user)
):
    body = await request.json()
    try:
        data = UpdateInquiryStatus.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid status", "details": e.errors()},
        )
    try:
        db.collection("inquiries").document(inquiry_id).update(
            {"status": data.status, "updatedAt": firestore.SERVER_TIMESTAMP}
        )
        return {"success": True, "message": "Inquiry status updated successfully"}
    except Exception:
        logger.exception("Update inquiry status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to update inquiry status"},
        )
```

- [ ] **Step 4: Register the router in `backend/app/main.py`**

```python
from app.routers import bookings, inquiries

app.include_router(bookings.router)
app.include_router(inquiries.router)
```

- [ ] **Step 5: Run the full backend test suite**

```bash
cd backend && source .venv/bin/activate && python -m pytest -v
```
Expected: all tests across schemas/bookings/inquiries PASS.

- [ ] **Step 6: Checkpoint** — leave for user review.

---

### Task 6: Connect frontend to backend + remove old API routes

**Files:**
- Modify: `frontend/next.config.ts` (add rewrite).
- Delete: `frontend/app/api/bookings/`, `frontend/app/api/inquiries/` (the whole `frontend/app/api/` dir if empty afterward).

**Interfaces:**
- Consumes: `BACKEND_API_URL` from `frontend/.env.local`.
- Produces: same-origin `/api/*` requests proxied to FastAPI.

- [ ] **Step 1: Add the rewrite to `frontend/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_API_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Delete the now-replaced Next.js API routes**

```bash
rm -rf frontend/app/api/bookings frontend/app/api/inquiries
# remove frontend/app/api entirely if nothing else lives there
[ -z "$(ls -A frontend/app/api 2>/dev/null)" ] && rmdir frontend/app/api
```

- [ ] **Step 3: Verify the frontend builds without the old routes**

```bash
cd frontend && npm run build
```
Expected: build succeeds; no references to `lib/firebase-admin` remain in the build (the deleted routes were its only importer). If the build errors on an unused `lib/firebase-admin.ts` import elsewhere, confirm via `grep -rn "firebase-admin" frontend/app frontend/components frontend/lib` that nothing else imports it (expected: only `frontend/lib/firebase-admin.ts` itself).

- [ ] **Step 4: Checkpoint** — leave for user review.

---

### Task 7: End-to-end verification + README

**Files:**
- Modify: `README.md` (root) — monorepo run instructions.

**Interfaces:** none (verification + docs).

- [ ] **Step 1: Start both services**

Terminal A:
```bash
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```
Terminal B:
```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify the public (unauthenticated) flows through the proxy**

```bash
# Booking submit (via the Next.js dev server origin, proxied to FastAPI)
curl -s -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"t@example.com","phone":"1234567","destination":"Serengeti","travelStartDate":"2026-07-01","travelEndDate":"2026-07-10","travellingWith":"solo","bookingType":"both","numberOfTravellers":1,"numberOfRooms":1,"minimumBudget":100,"maximumBudget":200}'
```
Expected: `{"success":true,"message":"Booking submitted successfully","id":"..."}` and the doc appears in Firestore `bookings`.

```bash
# Auth guard
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/bookings
```
Expected: `401`.

```bash
# Validation guard
curl -s -X POST http://localhost:3000/api/inquiries -H "Content-Type: application/json" -d '{"fullName":"x"}'
```
Expected: `400` with `{"success":false,"error":"Invalid inquiry data",...}`.

- [ ] **Step 3: Verify the authenticated admin flows in the browser**

In the running app: log in as admin, open the admin dashboard, confirm bookings and inquiries lists load (GET with Bearer token), change a status (PATCH), and delete a booking (DELETE). Confirm each behaves exactly as before the migration.

- [ ] **Step 4: Update root `README.md` with monorepo run instructions**

Add a section documenting:
- `frontend/`: `cd frontend && npm install && npm run dev` (needs `frontend/.env.local`).
- `backend/`: `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000` (needs `backend/.env`).
- Note that the frontend proxies `/api/*` to `BACKEND_API_URL` (default `http://localhost:8000`), so both must run together in development.

- [ ] **Step 5: Final checkpoint** — leave all changes in the working tree for the user to review and commit.

---

## Self-Review

**Spec coverage:**
- Repo layout (`frontend/` + `backend/`) → Task 1, Task 2. ✓
- Proxy connection → Task 6. ✓
- 4 routes → Python with parity → Tasks 4, 5. ✓
- Firebase init + private-key port → Task 2 (Step 6). ✓
- Auth dependency → Task 2 (Step 7), exercised in Tasks 4/5. ✓
- Zod → Pydantic mapping incl. both refines → Task 3. ✓
- requirements.txt + venv → Task 2. ✓
- Error/status parity (400/401/500 + message strings) → Tasks 4/5 tables + main.py handler (Task 2). ✓
- Testing (pytest + manual e2e) → Tasks 3–5 (unit), Task 7 (manual). ✓
- Out-of-scope (pricing/data/api wrappers stay) → enforced by only deleting `app/api/*` in Task 6. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command shows expected output. ✓

**Type consistency:** Schema class names (`CreateBooking`, `UpdateBookingStatus`, `CreateInquiry`, `UpdateInquiryStatus`), `get_db`, `get_current_user`, and `format_private_key` are used consistently across Tasks 2–5. The `.add()` tuple-return (`_, doc_ref`) is handled identically in both routers and mirrored in tests. ✓

**Note on git:** Per user preference, no commit steps are included; each task ends at a working-tree checkpoint for the user to commit.
