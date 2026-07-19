import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.currency import convert_usd_to_kes, get_usd_to_kes_rate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/currency", tags=["currency"])


class ConvertUsdToKesRequest(BaseModel):
    amountUsd: float = Field(gt=0)


@router.get("/usd-kes")
async def usd_kes_rate():
    try:
        return {"success": True, "data": await get_usd_to_kes_rate()}
    except Exception:
        logger.exception("USD to KES rate lookup failed")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch exchange rate"},
        )


@router.post("/convert-usd-to-kes")
async def convert_usd_to_kes_route(request: ConvertUsdToKesRequest):
    try:
        return {
            "success": True,
            "data": await convert_usd_to_kes(request.amountUsd),
        }
    except Exception:
        logger.exception("USD to KES conversion failed")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to convert currency"},
        )
