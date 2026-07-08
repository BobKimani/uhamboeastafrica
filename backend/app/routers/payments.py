import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from firebase_admin import firestore
from pydantic import ValidationError

from app.config import settings
from app.firebase import get_db
from app.payments.mpesa import (
    MpesaClient,
    MpesaConfigurationError,
    MpesaRequestError,
    normalize_kenyan_phone,
    parse_stk_callback,
)
from app.schemas import InitiateMpesaPayment

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments/mpesa", tags=["payments"])


@router.post("/stk-push")
async def initiate_stk_push(request: Request, db=Depends(get_db)):
    try:
        data = InitiateMpesaPayment.model_validate(await request.json())
        phone = normalize_kenyan_phone(data.phone)
    except (ValidationError, ValueError) as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(exc)},
        )

    booking_ref = db.collection("bookings").document(data.bookingId)
    booking_snapshot = booking_ref.get()
    if not booking_snapshot.exists:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Booking not found"},
        )

    booking = booking_snapshot.to_dict()
    amount = booking.get("transportAmountKes")
    if not amount:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "This booking has no transport payment"},
        )
    if booking.get("paymentStatus") == "paid":
        return JSONResponse(
            status_code=409,
            content={"success": False, "error": "This booking is already paid"},
        )
    if booking.get("paymentStatus") == "pending":
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "error": "An M-PESA request is already waiting for confirmation",
            },
        )

    try:
        response = await MpesaClient(settings).initiate_stk_push(
            phone=phone, amount=int(amount), booking_id=data.bookingId
        )
        booking_ref.update(
            {
                "paymentStatus": "pending",
                "mpesaPhone": phone,
                "mpesaMerchantRequestId": response.get("MerchantRequestID"),
                "mpesaCheckoutRequestId": response["CheckoutRequestID"],
                "paymentUpdatedAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            }
        )
        return {
            "success": True,
            "message": "Check your phone and enter your M-PESA PIN",
            "checkoutRequestId": response["CheckoutRequestID"],
        }
    except MpesaConfigurationError:
        logger.exception("M-PESA configuration error")
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "Online M-PESA payment is not configured. Use the Paybill instructions instead.",
            },
        )
    except MpesaRequestError as exc:
        logger.warning("M-PESA rejected STK push: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": str(exc)},
        )


@router.post("/callback")
async def mpesa_callback(request: Request, db=Depends(get_db)):
    try:
        result = parse_stk_callback(await request.json())
        matches = list(
            db.collection("bookings")
            .where(
                "mpesaCheckoutRequestId",
                "==",
                result["checkoutRequestId"],
            )
            .limit(1)
            .stream()
        )
        if not matches:
            logger.warning(
                "M-PESA callback has unknown checkout request ID %s",
                result["checkoutRequestId"],
            )
            return {"ResultCode": 0, "ResultDesc": "Accepted"}

        booking_document = matches[0]
        booking_ref = booking_document.reference
        expected_amount = booking_document.to_dict().get("transportAmountKes")
        payment_status = result["status"]
        result_description = result["resultDescription"]
        if payment_status == "paid" and int(result["amount"] or 0) != int(
            expected_amount or 0
        ):
            payment_status = "failed"
            result_description = "Paid amount did not match booking amount"
        booking_ref.update(
            {
                "paymentStatus": payment_status,
                "mpesaResultCode": result["resultCode"],
                "mpesaResultDescription": result_description,
                "mpesaReceiptNumber": result["receiptNumber"],
                "mpesaPaidAmount": result["amount"],
                "mpesaTransactionDate": result["transactionDate"],
                "paymentUpdatedAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            }
        )
    except Exception:
        logger.exception("Invalid M-PESA callback")
    # Acknowledge callbacks so Daraja does not retry malformed/unknown events forever.
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/status/{booking_id}")
async def payment_status(booking_id: str, db=Depends(get_db)):
    snapshot = db.collection("bookings").document(booking_id).get()
    if not snapshot.exists:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Booking not found"},
        )
    booking = snapshot.to_dict()
    return {
        "success": True,
        "status": booking.get("paymentStatus", "unpaid"),
        "receiptNumber": booking.get("mpesaReceiptNumber"),
    }
