from typing import TypedDict

from app.services.currency import convert_usd_to_kes

# Keep this server-owned catalog aligned with frontend/lib/data/vehicles.ts.
VEHICLE_DAILY_RATES_USD: dict[str, float] = {
    "4x4 Land Cruiser": 250,
    "Alphard": 180,
    "10-seater Van": 210,
    "Coaster": 360,
    "Noah": 140,
    "Truck": 420,
}


class UnknownVehicleError(ValueError):
    pass


class TransportPrice(TypedDict):
    amountUsd: float
    exchangeRate: float
    amountKes: int
    source: str
    rateDate: str


async def transport_price(vehicle_type: str, days: int) -> TransportPrice:
    try:
        daily_rate = VEHICLE_DAILY_RATES_USD[vehicle_type]
    except KeyError as exc:
        raise UnknownVehicleError("Selected vehicle cannot be priced") from exc

    amount_usd = daily_rate * days
    return await convert_usd_to_kes(amount_usd)
