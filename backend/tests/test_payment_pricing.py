import pytest

from app.payments import pricing
from app.payments.pricing import UnknownVehicleError


@pytest.mark.anyio
async def test_prices_transport_in_kes_from_server_catalog(monkeypatch):
    async def fake_convert(amount_usd: float):
        return {
            "amountUsd": amount_usd,
            "exchangeRate": 129.25,
            "amountKes": 69_795,
            "source": "test",
            "rateDate": "2026-07-09",
        }

    monkeypatch.setattr(pricing, "convert_usd_to_kes", fake_convert)

    assert await pricing.transport_price("Alphard", 3) == {
        "amountUsd": 540,
        "exchangeRate": 129.25,
        "amountKes": 69_795,
        "source": "test",
        "rateDate": "2026-07-09",
    }


@pytest.mark.anyio
async def test_rejects_unknown_vehicle():
    with pytest.raises(UnknownVehicleError):
        await pricing.transport_price("Made-up vehicle", 2)
