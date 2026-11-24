"""Route-based transport pricing API.

Public:  GET /api/transport/places, GET /api/transport/quote
Admin:   GET/PUT /api/transport/settings,
         GET/POST /api/transport/routes, PATCH/DELETE /api/transport/routes/{id}
"""

import logging
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from app.auth import require_authenticated_admin
from app.db.session import get_db
from app.db.transport_models import TransportPlace, TransportPricingSettings, TransportRoute
from app.services.transport_quotes import (
    InvalidTripType,
    RouteNeedsReview,
    RouteNotFound,
    TransportQuoteError,
    VehicleNotQuotable,
    find_place_by_name,
    find_route,
    normalize_place_name,
    parse_uuid,
    quote_route,
    quote_to_api,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/transport", tags=["transport"])


def _error(status: int, code: str, message: str, **extra) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"success": False, "code": code, "error": message, **extra},
    )


def quote_error_response(exc: TransportQuoteError) -> JSONResponse:
    if isinstance(exc, RouteNeedsReview):
        return _error(404, "route_needs_review", str(exc))
    if isinstance(exc, RouteNotFound):
        return _error(404, "route_not_found", str(exc))
    if isinstance(exc, VehicleNotQuotable):
        return _error(400, "vehicle_not_quotable", str(exc))
    if isinstance(exc, InvalidTripType):
        return _error(400, "invalid_trip_type", str(exc))
    return _error(503, "pricing_unavailable", str(exc))


# ------------------------------------------------------------------ public
@router.get("/places")
async def list_places(db: Session = Depends(get_db)):
    places = db.scalars(
        select(TransportPlace)
        .where(TransportPlace.is_active.is_(True))
        .order_by(func.lower(TransportPlace.name))
    ).all()
    active_ids = {p.id for p in places}
    destinations: dict[UUID, set[UUID]] = {pid: set() for pid in active_ids}
    for a, b in db.execute(
        select(TransportRoute.place_a_id, TransportRoute.place_b_id).where(
            TransportRoute.needs_review.is_(False)
        )
    ):
        if a in active_ids and b in active_ids:
            destinations[a].add(b)
            destinations[b].add(a)
    return {
        "success": True,
        "places": [
            {
                "id": str(p.id),
                "name": p.name,
                "destinations": sorted(str(d) for d in destinations[p.id]),
            }
            for p in places
        ],
    }


@router.get("/quote")
async def get_quote(request: Request, db: Session = Depends(get_db)):
    params = request.query_params
    from_id, to_id, vehicle_id = (
        parse_uuid(params.get("from")),
        parse_uuid(params.get("to")),
        parse_uuid(params.get("vehicleId")),
    )
    if not (from_id and to_id and vehicle_id):
        return _error(400, "invalid_request", "from, to and vehicleId are required")
    try:
        result = quote_route(db, from_id, to_id, vehicle_id, params.get("tripType") or "")
    except TransportQuoteError as exc:
        return quote_error_response(exc)
    return {"success": True, "quote": quote_to_api(result)}


# ------------------------------------------------------------------- admin
class SettingsPayload(BaseModel):
    fuelPriceKes: Decimal
    marginKes: Decimal
    multiplier: Decimal


def _settings_to_api(row: TransportPricingSettings) -> dict:
    return {
        "fuelPriceKes": float(row.fuel_price_kes),
        "marginKes": float(row.margin_kes),
        "multiplier": float(row.multiplier),
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/settings")
async def get_settings(db: Session = Depends(get_db), user=Depends(require_authenticated_admin)):
    row = db.get(TransportPricingSettings, 1)
    if row is None:
        return _error(503, "pricing_unavailable", "Transport pricing is not configured")
    return {"success": True, "settings": _settings_to_api(row)}


@router.put("/settings")
async def update_settings(
    payload: SettingsPayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    # Round to the stored column precision first, so a value that would round
    # to 0 is rejected here rather than violating a database CHECK (500).
    fuel = payload.fuelPriceKes.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    margin = payload.marginKes.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    multiplier = payload.multiplier.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    if not Decimal("0") < fuel < Decimal("100000"):
        return _error(400, "invalid_settings", "Fuel price must be between 0.01 and 99,999.99 KSh")
    if not Decimal("0") <= margin < Decimal("10000000"):
        return _error(400, "invalid_settings", "Margin must be between 0 and 9,999,999.99 KSh")
    if not Decimal("0") < multiplier <= Decimal("5"):
        return _error(400, "invalid_settings", "Multiplier must be between 0.0001 and 5")

    row = db.get(TransportPricingSettings, 1) or TransportPricingSettings(id=1)
    row.fuel_price_kes = fuel
    row.margin_kes = margin
    row.multiplier = multiplier
    row.updated_at = datetime.now(UTC)
    row.updated_by = parse_uuid(user.get("sub"))
    db.add(row)
    db.flush()
    logger.info(
        "Transport pricing updated by %s: fuel=%s margin=%s multiplier=%s",
        user.get("sub"), row.fuel_price_kes, row.margin_kes, row.multiplier,
    )
    return {"success": True, "settings": _settings_to_api(row)}


PlaceA = aliased(TransportPlace)
PlaceB = aliased(TransportPlace)


def _route_to_api(route: TransportRoute, a: TransportPlace, b: TransportPlace) -> dict:
    return {
        "id": str(route.id),
        "fromPlaceId": str(a.id),
        "fromPlace": a.name,
        "toPlaceId": str(b.id),
        "toPlace": b.name,
        "distanceKm": float(route.distance_km),
        "needsReview": route.needs_review,
        "updatedAt": route.updated_at.isoformat() if route.updated_at else None,
    }


@router.get("/routes")
async def list_routes(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    query = (
        select(TransportRoute, PlaceA, PlaceB)
        .join(PlaceA, PlaceA.id == TransportRoute.place_a_id)
        .join(PlaceB, PlaceB.id == TransportRoute.place_b_id)
        .order_by(func.lower(PlaceA.name), func.lower(PlaceB.name))
    )
    search = (request.query_params.get("search") or "").strip()
    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            or_(func.lower(PlaceA.name).like(pattern), func.lower(PlaceB.name).like(pattern))
        )
    if request.query_params.get("needsReview") == "true":
        query = query.where(TransportRoute.needs_review.is_(True))
    rows = db.execute(query).all()
    return {"success": True, "routes": [_route_to_api(r, a, b) for r, a, b in rows]}


class RoutePayload(BaseModel):
    fromPlace: str = Field(min_length=2, max_length=120)
    toPlace: str = Field(min_length=2, max_length=120)
    distanceKm: Decimal = Field(gt=0, lt=Decimal("100000"))


def _get_or_create_place(db: Session, name: str) -> TransportPlace:
    place = find_place_by_name(db, name)
    if place is None:
        place = TransportPlace(name=normalize_place_name(name), is_active=True)
        db.add(place)
        db.flush()
    elif not place.is_active:
        # The admin is adding a route to it, so make it bookable again
        # (otherwise the route would be invisible to customers).
        place.is_active = True
        place.updated_at = datetime.now(UTC)
    return place


@router.post("/routes")
async def create_route(
    payload: RoutePayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    if normalize_place_name(payload.fromPlace).lower() == normalize_place_name(payload.toPlace).lower():
        return _error(400, "invalid_route", "From and To must be different places")
    a = _get_or_create_place(db, payload.fromPlace)
    b = _get_or_create_place(db, payload.toPlace)
    if find_route(db, a.id, b.id) is not None:
        return _error(409, "route_exists", "A route between these places already exists")
    route = TransportRoute(
        place_a_id=a.id, place_b_id=b.id, distance_km=payload.distanceKm, needs_review=False
    )
    db.add(route)
    db.flush()
    db.refresh(route)
    return JSONResponse(
        status_code=201,
        content={"success": True, "route": _route_to_api(route, a, b)},
    )


class RouteUpdatePayload(BaseModel):
    distanceKm: Decimal | None = Field(default=None, gt=0, lt=Decimal("100000"))
    needsReview: bool | None = None


@router.patch("/routes/{route_id}")
async def update_route(
    route_id: str,
    payload: RouteUpdatePayload,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    parsed = parse_uuid(route_id)
    route = db.get(TransportRoute, parsed) if parsed else None
    if route is None:
        return _error(404, "route_not_found", "Route not found")
    if payload.distanceKm is not None:
        route.distance_km = payload.distanceKm
    if payload.needsReview is not None:
        route.needs_review = payload.needsReview
    route.updated_at = datetime.now(UTC)
    db.flush()
    a = db.get(TransportPlace, route.place_a_id)
    b = db.get(TransportPlace, route.place_b_id)
    return {"success": True, "route": _route_to_api(route, a, b)}


@router.delete("/routes/{route_id}")
async def delete_route(
    route_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    parsed = parse_uuid(route_id)
    route = db.get(TransportRoute, parsed) if parsed else None
    if route is None:
        return _error(404, "route_not_found", "Route not found")
    db.delete(route)
    return {"success": True, "message": "Route deleted"}
