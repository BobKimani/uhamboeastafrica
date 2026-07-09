import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from firebase_admin import firestore
from pydantic import ValidationError

from app.auth import get_current_user
from app.firebase import get_db
from app.schemas import CreateBooking, UpdateBookingStatus
from app.services.currency import convert_usd_to_kes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("")
async def create_booking(request: Request, db=Depends(get_db)):
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
            payment_rate = await convert_usd_to_kes(data.minimumBudget)
            amount_due_kes = payment_rate["amountKes"]
        booking = {
            **data.model_dump(),
            "status": "new",
            "paymentStatus": "unpaid" if amount_due_kes else "not_required",
            "transportAmountKes": amount_due_kes,
            "amount_usd": payment_rate["amountUsd"] if payment_rate else None,
            "exchange_rate": payment_rate["exchangeRate"] if payment_rate else None,
            "amount_kes": amount_due_kes,
            "currency_source": payment_rate["source"] if payment_rate else None,
            "rate_locked_at": firestore.SERVER_TIMESTAMP if payment_rate else None,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        _, doc_ref = db.collection("bookings").add(booking)
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Booking submitted successfully",
                "id": doc_ref.id,
                "payment": {
                    "required": amount_due_kes is not None,
                    "amountKes": amount_due_kes,
                },
            },
        )
    except Exception:
        logger.exception("Create booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to submit booking"},
        )


@router.get("")
async def list_bookings(db=Depends(get_db), user=Depends(get_current_user)):
    try:
        docs = (
            db.collection("bookings")
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .stream()
        )
        bookings = [{"id": d.id, **d.to_dict()} for d in docs]
        return {"success": True, "bookings": bookings}
    except Exception:
        logger.exception("Fetch bookings error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch bookings"},
        )


@router.patch("/{booking_id}")
async def update_booking_status(
    booking_id: str, request: Request, db=Depends(get_db), user=Depends(get_current_user)
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
        db.collection("bookings").document(booking_id).update(
            {"status": data.status, "updatedAt": firestore.SERVER_TIMESTAMP}
        )
        return {"success": True, "message": "Booking status updated successfully"}
    except Exception:
        logger.exception("Update booking status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to update booking status"},
        )


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: str, db=Depends(get_db), user=Depends(get_current_user)
):
    try:
        db.collection("bookings").document(booking_id).delete()
        return {"success": True, "message": "Booking deleted successfully"}
    except Exception:
        logger.exception("Delete booking error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to delete booking"},
        )
