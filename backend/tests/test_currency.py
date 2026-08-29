import pytest

from app.services import currency


@pytest.mark.anyio
async def test_uses_env_fallback_when_apis_fail(monkeypatch):
    async def fail_fetch(url: str, source: str):
        raise RuntimeError("offline")

    monkeypatch.setattr(currency, "_fetch_rate", fail_fetch)
    monkeypatch.setattr(currency, "_default_rate", lambda: 129.0)
    currency._cache["data"] = None
    currency._cache["expires_at"] = None

    result = await currency.convert_usd_to_kes(250)

    assert result == {
        "amountUsd": 250,
        "exchangeRate": 129.0,
        "amountKes": 32250,
        "source": "env-fallback",
        "rateDate": result["rateDate"],
    }
