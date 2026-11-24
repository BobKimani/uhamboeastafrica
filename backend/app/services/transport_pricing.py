"""Route-based transport pricing (KES).

Agreed business rule (see docs/superpowers/specs/2026-11-19-transport-route-pricing-design.md):

    legs       = 2 for both trip types: the vehicle always drives out and back
                 (return: with the customer, driver waits; one way: the vehicle
                 comes back empty after the drop-off)
    fuel       = distance_km / km_per_litre * fuel_price_kes * legs
    driver     = fuel / 2
    total_kes  = round_half_up((fuel + driver + margin_kes) * multiplier)
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

TRIP_LEGS: dict[str, Decimal] = {
    "return": Decimal("2"),
    "one_way": Decimal("2"),
}
DRIVER_ALLOWANCE_RATIO = Decimal("0.5")


@dataclass(frozen=True)
class PricingSettings:
    fuel_price_kes: Decimal
    margin_kes: Decimal
    multiplier: Decimal


@dataclass(frozen=True)
class TransportQuote:
    distance_km: Decimal
    km_per_litre: Decimal
    trip_type: str
    legs: Decimal
    fuel_price_kes: Decimal
    fuel_kes: Decimal
    driver_allowance_kes: Decimal
    margin_kes: Decimal
    multiplier: Decimal
    total_kes: int


def calculate_quote(
    *,
    distance_km: Decimal,
    km_per_litre: Decimal,
    settings: PricingSettings,
    trip_type: str,
) -> TransportQuote:
    if trip_type not in TRIP_LEGS:
        raise ValueError("trip_type must be 'one_way' or 'return'")
    if distance_km <= 0:
        raise ValueError("distance_km must be greater than 0")
    if km_per_litre <= 0:
        raise ValueError("km_per_litre must be greater than 0")

    legs = TRIP_LEGS[trip_type]
    fuel = distance_km / km_per_litre * settings.fuel_price_kes * legs
    driver = fuel * DRIVER_ALLOWANCE_RATIO
    total = ((fuel + driver + settings.margin_kes) * settings.multiplier).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    return TransportQuote(
        distance_km=distance_km,
        km_per_litre=km_per_litre,
        trip_type=trip_type,
        legs=legs,
        fuel_price_kes=settings.fuel_price_kes,
        fuel_kes=fuel,
        driver_allowance_kes=driver,
        margin_kes=settings.margin_kes,
        multiplier=settings.multiplier,
        total_kes=int(total),
    )
