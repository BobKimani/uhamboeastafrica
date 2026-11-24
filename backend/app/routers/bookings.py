import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_authenticated_admin
from app.db.models import Booking, Hotel
from app.db.serializers import booking_to_api
from app.db.session import get_db
from app.routers.transport import quote_error_response
from app.schemas import CreateBooking, UpdateBookingStatus
from app.services.transport_quotes import (
    TransportQuoteError,
    parse_uuid,
    quote_route,
    quote_snapshot,
    quote_to_api,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _booking_id(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


def _selected_hotel_id(db: Session, value: str | None) -> UUID | None:
    parsed = _booking_id(value) if value else None
    if parsed is None or db.get(Hotel, parsed) is None:
        return None
    return parsed


@router.post("")
async def create_booking(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    try:
        data = CreateBooking.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Invalid booking data",
                # include_context=False: model-validator errors carry the raw
                # exception in ctx, which is not JSON serialisable (was a 500).
                "details": e.errors(include_url=False, include_context=False),
            },
        )
    try:
        amount_due_kes = None
        snapshot = None
        transport_from, transport_to = data.transportFrom, data.transportTo
        selected_vehicle_id = None
        vehicle_type = data.vehicleType
        is_transport = data.bookingType in {"transport", "both"}
        if is_transport and not data.quoteRequested:
            # Route pricing: the server always computes the price.
            ids = [parse_uuid(v) for v in (data.transportFromId, data.transportToId, data.vehicleId)]
            if not all(ids):
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Invalid route or vehicle"},
                )
            try:
                result = quote_route(db, ids[0], ids[1], ids[2], data.tripType)
            except TransportQuoteError as exc:
                return quote_error_response(exc)
            if data.quotedTotalKes is not None and data.quotedTotalKes != result.quote.total_kes:
                return JSONResponse(
                    status_code=409,
                    content={
                        "success": False,
                        "code": "price_changed",
                        "error": "The price for this trip has changed. Please review the new price.",
                        "quote": quote_to_api(result),
                    },
                )
            amount_due_kes = result.quote.total_kes
            snapshot = quote_snapshot(result)
            transport_from, transport_to = result.from_place.name, result.to_place.name
            selected_vehicle_id = result.vehicle.id
            vehicle_type = result.vehicle.type
        booking = Booking(
            full_name=data.fullName,
            email=data.email,
            phone=data.phone,
            destination=data.destination,
            travel_start_date=datetime.fromisoformat(data.travelStartDate).date(),
            travel_end_date=datetime.fromisoformat(data.travelEndDate).date(),
            travelling_with=data.travellingWith,
            booking_type=data.bookingType,
            number_of_travellers=data.numberOfTravellers,
            number_of_rooms=data.numberOfRooms,
            selected_hotel_id=_selected_hotel_id(db, data.selectedHotelId),
            transport_from=transport_from,
            transport_to=transport_to,
            transport_days=None if is_transport else data.transportDays,
            vehicle_type=vehicle_type,
            selected_vehicle_id=selected_vehicle_id,
            trip_type=data.tripType if is_transport else None,
            transport_quote=snapshot,
            quote_requested=bool(is_transport and data.quoteRequested),
            status="new",
            payment_status="unpaid" if amount_due_kes else "not_required",
            transport_amount_kes=amount_due_kes,
            # Route prices are calculated in KES; no currency conversion.
            amount_usd=None,
            exchange_rate=None,
            amount_kes=amount_due_kes,
            currency_source="route-pricing" if amount_due_kes else None,
            rate_locked_at=datetime.now(UTC) if amount_due_kes else None,
        )
        db.add(booking)
        db.flush()
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Booking submitted successfully",
                "id": str(booking.id),
                "payment": {
                    "required": amount_due_kes is not None,
                    "amountKes": amount_due_kes,
                },
            },
        )
    except Exception:
        db.rollback()
        logger.exception("Create booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to submit booking"},
        )


@router.get("")
async def list_bookings(
    db: Session = Depends(get_db), user=Depends(require_authenticated_admin)
):
    try:
        bookings = db.scalars(
            select(Booking).order_by(Booking.created_at.desc())
        ).all()
        return {"success": True, "bookings": [booking_to_api(b) for b in bookings]}
    except Exception:
        db.rollback()
        logger.exception("Fetch bookings error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch bookings"},
        )


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str, db: Session = Depends(get_db), user=Depends(require_authenticated_admin)
):
    try:
        parsed_id = _booking_id(booking_id)
        if parsed_id is None:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )
        booking = db.get(Booking, parsed_id)
        if not booking:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )

        return {"success": True, "booking": booking_to_api(booking)}
    except Exception:
        db.rollback()
        logger.exception("Fetch booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch booking"},
        )


@router.patch("/{booking_id}")
async def update_booking_status(
    booking_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(require_authenticated_admin),
):
    body = await request.json()
    try:
        data = UpdateBookingStatus.model_validate(body)
    except ValidationError as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid status", "details": e.errors()},
        )
    try:
        parsed_id = _booking_id(booking_id)
        if parsed_id is None:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )
        booking = db.get(Booking, parsed_id)
        if not booking:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )
        booking.status = data.status
        booking.updated_at = datetime.now(UTC)
        return {"success": True, "message": "Booking status updated successfully"}
    except Exception:
        db.rollback()
        logger.exception("Update booking status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to update booking status"},
        )


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: str, db: Session = Depends(get_db), user=Depends(require_authenticated_admin)
):
    try:
        parsed_id = _booking_id(booking_id)
        if parsed_id is None:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )
        booking = db.get(Booking, parsed_id)
        if not booking:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )
        db.delete(booking)
        return {"success": True, "message": "Booking deleted successfully"}
    except Exception:
        db.rollback()
        logger.exception("Delete booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to delete booking"},
        )
