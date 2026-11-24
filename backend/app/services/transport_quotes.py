"""Database-backed transport quotes: resolve places, route, vehicle and settings,
then price with app.services.transport_pricing."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Vehicle
from app.db.transport_models import TransportPlace, TransportPricingSettings, TransportRoute
from app.services.transport_pricing import (
    TRIP_LEGS,
    PricingSettings,
    TransportQuote,
    calculate_quote,
)


class TransportQuoteError(Exception):
    """Base error; message is safe to show to customers."""


class RouteNotFound(TransportQuoteError):
    pass


class RouteNeedsReview(TransportQuoteError):
    pass


class VehicleNotQuotable(TransportQuoteError):
    pass


class InvalidTripType(TransportQuoteError):
    pass


class PricingUnavailable(TransportQuoteError):
    pass


@dataclass(frozen=True)
class RouteQuote:
    quote: TransportQuote
    from_place: TransportPlace
    to_place: TransportPlace
    vehicle: Vehicle
    route: TransportRoute


def parse_uuid(value: object) -> UUID | None:
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def normalize_place_name(name: str) -> str:
    """Collapse internal whitespace and trim (comparison is case-insensitive)."""
    return " ".join(name.split())


def find_place_by_name(db: Session, name: str) -> TransportPlace | None:
    return db.scalar(
        select(TransportPlace).where(
            func.lower(func.btrim(TransportPlace.name)) == normalize_place_name(name).lower()
        )
    )


def load_settings(db: Session) -> PricingSettings:
    row = db.get(TransportPricingSettings, 1)
    if row is None:
        raise PricingUnavailable("Transport pricing is not configured")
    return PricingSettings(
        fuel_price_kes=Decimal(row.fuel_price_kes),
        margin_kes=Decimal(row.margin_kes),
        multiplier=Decimal(row.multiplier),
    )


def find_route(db: Session, place_a: UUID, place_b: UUID) -> TransportRoute | None:
    return db.scalar(
        select(TransportRoute).where(
            or_(
                and_(TransportRoute.place_a_id == place_a, TransportRoute.place_b_id == place_b),
                and_(TransportRoute.place_a_id == place_b, TransportRoute.place_b_id == place_a),
            )
        )
    )


def quote_route(
    db: Session,
    from_place_id: UUID,
    to_place_id: UUID,
    vehicle_id: UUID,
    trip_type: str,
) -> RouteQuote:
    if trip_type not in TRIP_LEGS:
        raise InvalidTripType("Trip type must be one way or return")

    from_place = db.get(TransportPlace, from_place_id)
    to_place = db.get(TransportPlace, to_place_id)
    if (
        from_place is None
        or to_place is None
        or from_place.id == to_place.id
        or not from_place.is_active
        or not to_place.is_active
    ):
        raise RouteNotFound("This route is not on our price list")

    route = find_route(db, from_place.id, to_place.id)
    if route is None:
        raise RouteNotFound("This route is not on our price list")
    if route.needs_review:
        raise RouteNeedsReview("This route is priced on request")

    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or not vehicle.is_available or not vehicle.km_per_litre:
        raise VehicleNotQuotable("This vehicle cannot be priced online")

    quote = calculate_quote(
        distance_km=Decimal(route.distance_km),
        km_per_litre=Decimal(vehicle.km_per_litre),
        settings=load_settings(db),
        trip_type=trip_type,
    )
    return RouteQuote(quote, from_place, to_place, vehicle, route)


def _money(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01")))


def quote_to_api(result: RouteQuote) -> dict:
    q = result.quote
    return {
        "fromPlaceId": str(result.from_place.id),
        "fromPlace": result.from_place.name,
        "toPlaceId": str(result.to_place.id),
        "toPlace": result.to_place.name,
        "vehicleId": str(result.vehicle.id),
        "vehicleType": result.vehicle.type,
        "tripType": q.trip_type,
        "distanceKm": float(q.distance_km),
        "kmPerLitre": float(q.km_per_litre),
        "fuelPriceKes": _money(q.fuel_price_kes),
        "legs": float(q.legs),
        "fuelKes": _money(q.fuel_kes),
        "driverAllowanceKes": _money(q.driver_allowance_kes),
        "marginKes": _money(q.margin_kes),
        "multiplier": float(q.multiplier),
        "totalKes": q.total_kes,
    }


def quote_snapshot(result: RouteQuote) -> dict:
    """Stored on the booking so later price changes never alter it."""
    return quote_to_api(result) | {"routeId": str(result.route.id)}
