from decimal import Decimal, ROUND_HALF_UP


USD_TO_KES = Decimal("130")

# Keep this server-owned catalog aligned with frontend/lib/data/vehicles.ts.
VEHICLE_DAILY_RATES_USD = {
    "4x4 Land Cruiser": Decimal("250"),
    "Alphard": Decimal("180"),
    "10-seater Van": Decimal("210"),
    "Coaster": Decimal("360"),
    "Noah": Decimal("140"),
    "Truck": Decimal("420"),
}


class UnknownVehicleError(ValueError):
    pass


def transport_amount_kes(vehicle_type: str, days: int) -> int:
    try:
        daily_rate = VEHICLE_DAILY_RATES_USD[vehicle_type]
    except KeyError as exc:
        raise UnknownVehicleError("Selected vehicle cannot be priced") from exc

    amount = daily_rate * Decimal(days) * USD_TO_KES
    return int(amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
