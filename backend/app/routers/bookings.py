import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_authenticated_admin
from app.db.models import Booking, Hotel, Vehicle
from app.db.serializers import booking_to_api
from app.db.session import get_db
from app.payments.pricing import UnknownVehicleError, transport_price
from app.schemas import CreateBooking, UpdateBookingStatus
from app.services.currency import convert_usd_to_kes

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
                "details": e.errors(),
            },
        )
    try:
        amount_due_kes = None
        payment_rate = None
        if data.bookingType in {"transport", "both"}:
            # Price from the vehicle catalogue (what the site shows), falling
            # back to the server-owned rate card for legacy vehicle types.
            vehicle = db.scalar(
                select(Vehicle).where(Vehicle.type == data.vehicleType)
            )
            try:
                if vehicle is not None:
                    payment_rate = await convert_usd_to_kes(
                        float(vehicle.price_per_day) * data.transportDays
                    )
                else:
                    payment_rate = await transport_price(
                        data.vehicleType, data.transportDays
                    )
            except UnknownVehicleError:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Selected vehicle cannot be priced",
                    },
                )
            amount_due_kes = payment_rate["amountKes"]
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
            transport_from=data.transportFrom,
            transport_to=data.transportTo,
            transport_days=data.transportDays,
            vehicle_type=data.vehicleType,
            status="new",
            payment_status="unpaid" if amount_due_kes else "not_required",
            transport_amount_kes=amount_due_kes,
            amount_usd=payment_rate["amountUsd"] if payment_rate else None,
            exchange_rate=payment_rate["exchangeRate"] if payment_rate else None,
            amount_kes=amount_due_kes,
            currency_source=payment_rate["source"] if payment_rate else None,
            rate_locked_at=datetime.now(UTC) if payment_rate else None,
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
