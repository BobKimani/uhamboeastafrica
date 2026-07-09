from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.routers import bookings, currency, inquiries, payments

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


app.include_router(bookings.router)
app.include_router(currency.router)
app.include_router(inquiries.router)
app.include_router(payments.router)
