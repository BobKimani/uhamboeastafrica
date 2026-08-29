import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, TypedDict

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

PRIMARY_USD_API = (
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/"
    "currencies/usd.min.json"
)
FALLBACK_USD_API = "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json"


class ExchangeRate(TypedDict):
    rate: float
    source: str
    date: str
    cached: bool


class ConversionResult(TypedDict):
    amountUsd: float
    exchangeRate: float
    amountKes: int
    source: str
    rateDate: str


_cache: dict[str, Any] = {
    "expires_at": None,
    "data": None,
}


def _cache_seconds() -> int:
    return max(0, int(getattr(settings, "currency_cache_seconds", 21600) or 21600))


def _default_rate() -> float:
    return float(getattr(settings, "default_usd_to_kes_rate", 129.0) or 129.0)


def _now() -> datetime:
    return datetime.now(UTC)


def _cached_rate() -> ExchangeRate | None:
    data = _cache.get("data")
    expires_at = _cache.get("expires_at")

    if not data or not isinstance(expires_at, datetime):
        return None

    if expires_at <= _now():
        return None

    return {**data, "cached": True}


def _store_cache(rate: ExchangeRate, *, cached: bool = False) -> ExchangeRate:
    cached_rate: ExchangeRate = {**rate, "cached": cached}
    _cache["data"] = cached_rate
    _cache["expires_at"] = _now() + timedelta(seconds=_cache_seconds())
    return cached_rate


async def _fetch_rate(url: str, source: str) -> ExchangeRate:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers={"Accept": "application/json"})

    response.raise_for_status()
    data = response.json()
    rate = data.get("usd", {}).get("kes")

    if rate is None:
        raise ValueError("Currency API response did not include usd.kes")

    return {
        "rate": float(rate),
        "source": source,
        "date": str(data.get("date") or _now().date().isoformat()),
        "cached": False,
    }


async def get_usd_to_kes_rate() -> ExchangeRate:
    cached = _cached_rate()
    if cached:
        return cached

    for url, source in (
        (PRIMARY_USD_API, "fawazahmed0-jsdelivr"),
        (FALLBACK_USD_API, "fawazahmed0-cloudflare"),
    ):
        try:
            rate = await _fetch_rate(url, source)
            logger.info("USD to KES rate fetched successfully from %s", source)
            return _store_cache(rate)
        except Exception:
            if source == "fawazahmed0-jsdelivr":
                logger.exception("Currency primary API failed")
            else:
                logger.exception("Currency fallback API failed")

    logger.warning("Using env fallback exchange rate")
    return _store_cache(
        {
            "rate": _default_rate(),
            "source": "env-fallback",
            "date": _now().date().isoformat(),
            "cached": False,
        }
    )


async def convert_usd_to_kes(amount_usd: float) -> ConversionResult:
    rate = await get_usd_to_kes_rate()
    amount_kes = int(
        (Decimal(str(amount_usd)) * Decimal(str(rate["rate"]))).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )

    return {
        "amountUsd": amount_usd,
        "exchangeRate": rate["rate"],
        "amountKes": amount_kes,
        "source": rate["source"],
        "rateDate": rate["date"],
    }
