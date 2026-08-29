from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.db.health import check_database_connection
from app.payments.kcb import (
    log_kcb_runtime_configuration,
    validate_kcb_runtime_configuration,
)
from app.routers import auth, bookings, catalog, currency, inquiries, payments

app = FastAPI(title="Uhambo API")

if not settings.session_secret:
    raise RuntimeError("SESSION_SECRET is required for admin authentication")

validate_kcb_runtime_configuration(settings)
log_kcb_runtime_configuration(settings)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.all_cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie=settings.oauth_state_cookie_name,
    path="/",
    same_site="lax",
    https_only=settings.session_https_only,
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
    )


@app.get("/health")
async def health():
    if check_database_connection():
        return {"status": "healthy", "database": "connected"}
    return JSONResponse(
        status_code=503,
        content={"status": "unavailable", "database": "unavailable"},
    )


app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(catalog.router)
app.include_router(currency.router)
app.include_router(inquiries.router)
app.include_router(payments.router)
