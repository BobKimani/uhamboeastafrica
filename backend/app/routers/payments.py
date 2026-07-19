import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from firebase_admin import firestore
from pydantic import ValidationError

from app.config import settings
from app.firebase import get_db
from app.payments.kcb import (
    KcbClient,
    KcbConfigurationError,
    KcbRequestError,
    normalize_kenyan_phone,
    parse_stk_callback,
)
from app.schemas import InitiateKcbPayment
from app.services.currency import convert_usd_to_kes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments/kcb", tags=["payments"])


@router.post("/stk-push")
async def initiate_stk_push(request: Request, db=Depends(get_db)):
    try:
        data = InitiateKcbPayment.model_validate(await request.json())
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
    amount = data.amountKes or booking.get("amount_kes") or booking.get(
        "transportAmountKes"
    )
    payment_rate = None
    if not data.amountKes and not amount and booking.get("amount_usd"):
        payment_rate = await convert_usd_to_kes(float(booking["amount_usd"]))
        amount = payment_rate["amountKes"]

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
                "error": "A KCB payment request is already waiting for confirmation",
            },
        )

    try:
        response = await KcbClient(settings).initiate_stk_push(
            phone=phone, amount=int(amount), booking_id=data.bookingId
        )
        booking_ref.update(
            {
                "paymentStatus": "pending",
                "kcbPhone": phone,
                "kcbMerchantRequestId": response.get("MerchantRequestID"),
                "kcbCheckoutRequestId": response["CheckoutRequestID"],
                "kcbAmountKes": int(amount),
                "paymentUpdatedAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
                **(
                    {
                        "exchange_rate": payment_rate["exchangeRate"],
                        "amount_kes": payment_rate["amountKes"],
                        "transportAmountKes": payment_rate["amountKes"],
                        "currency_source": payment_rate["source"],
                        "rate_locked_at": firestore.SERVER_TIMESTAMP,
                    }
                    if payment_rate
                    else {}
                ),
            }
        )
        return {
            "success": True,
            "message": "Check your phone and enter your M-Pesa PIN",
            "checkoutRequestId": response["CheckoutRequestID"],
        }
    except KcbConfigurationError:
        logger.exception("KCB Buni configuration error")
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "Online KCB payment is not configured. Use the Paybill instructions instead.",
            },
        )
    except KcbRequestError as exc:
        logger.warning("KCB rejected STK push: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": str(exc)},
        )


@router.post("/callback")
async def kcb_callback(request: Request, db=Depends(get_db)):
    try:
        result = parse_stk_callback(await request.json())
        matches = list(
            db.collection("bookings")
            .where(
                "kcbCheckoutRequestId",
                "==",
                result["checkoutRequestId"],
            )
            .limit(1)
            .stream()
        )
        if not matches:
            logger.warning(
                "KCB callback has unknown checkout request ID %s",
                result["checkoutRequestId"],
            )
            return {"ResultCode": 0, "ResultDesc": "Accepted"}

        booking_document = matches[0]
        booking_ref = booking_document.reference
        booking_data = booking_document.to_dict()
        expected_amount = (
            booking_data.get("kcbAmountKes")
            or booking_data.get("amount_kes")
            or booking_data.get("transportAmountKes")
        )
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
                "kcbResultCode": result["resultCode"],
                "kcbResultDescription": result_description,
                "kcbReceiptNumber": result["receiptNumber"],
                "kcbPaidAmount": result["amount"],
                "kcbTransactionDate": result["transactionDate"],
                "paymentUpdatedAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            }
        )
    except Exception:
        logger.exception("Invalid KCB callback")
    # Acknowledge callbacks so the provider does not retry malformed/unknown events forever.
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/status/{booking_id}")
async def payment_status(booking_id: str, db=Depends(get_db)):
    try:
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
            "receiptNumber": booking.get("kcbReceiptNumber"),
        }
    except Exception:
        logger.exception("Fetch KCB payment status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch payment status"},
        )
