import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.health import check_database_connection
from app.payments.kcb import (
    log_kcb_runtime_configuration,
    validate_kcb_runtime_configuration,
)
from app.routers import auth, bookings, catalog, currency, inquiries, payments

app = FastAPI(title="Uhambo API")

if not settings.session_secret or len(settings.session_secret) < 32:
    raise RuntimeError(
        "SESSION_SECRET (at least 32 characters) is required for admin authentication"
    )

if int(os.environ.get("SESSION_MAX_AGE_SECONDS", "0") or 0) > settings.session_max_age_limit_seconds:
    logging.getLogger(__name__).warning(
        "SESSION_MAX_AGE_SECONDS exceeds the 8-hour maximum; using %s seconds",
        settings.session_max_age_seconds,
    )

validate_kcb_runtime_configuration(settings)
log_kcb_runtime_configuration(settings)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.all_cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
