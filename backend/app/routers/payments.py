import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Booking, Payment
from app.db.session import get_db
from app.payments.kcb import (
    KcbClient,
    KcbConfigurationError,
    KcbRequestError,
    build_kcb_invoice_number,
    build_payment_reference,
    normalize_kenyan_phone,
    parse_stk_callback,
)
from app.schemas import InitiateKcbPayment
from app.services.currency import convert_usd_to_kes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments/kcb", tags=["payments"])


def _booking_id(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


def _kcb_transaction_datetime(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y%m%d%H%M%S").replace(tzinfo=UTC)
    except ValueError:
        return None


def _create_pending_payment(
    *,
    db: Session,
    booking_id: UUID,
    phone: str,
    amount: int,
) -> Payment:
    for _ in range(5):
        payment_id = uuid4()
        created_at = datetime.now(UTC)
        payment_reference = build_payment_reference(payment_id, created_at)
        invoice_number = build_kcb_invoice_number(settings, payment_reference)

        existing = db.scalar(
            select(Payment).where(
                (Payment.payment_reference == payment_reference)
                | (Payment.invoice_number == invoice_number)
            )
        )
        if existing:
            logger.warning(
                "KCB payment reference collision detected before STK request: paymentReference=%s",
                payment_reference,
            )
            continue

        payment = Payment(
            id=payment_id,
            booking_id=booking_id,
            account_number=str(booking_id),
            payment_reference=payment_reference,
            invoice_number=invoice_number,
            provider="kcb",
            status="pending",
            amount=amount,
            currency="KES",
            phone_number=phone,
            raw_response={"amountKes": amount},
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(payment)
        db.flush()
        db.commit()
        db.refresh(payment)
        return payment

    raise KcbConfigurationError("Unable to generate a unique KCB payment reference")


@router.post("/stk-push")
async def initiate_stk_push(request: Request, db: Session = Depends(get_db)):
    try:
        data = InitiateKcbPayment.model_validate(await request.json())
        phone = normalize_kenyan_phone(data.phone)
    except (ValidationError, ValueError) as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": str(exc)},
        )

    parsed_booking_id = _booking_id(data.bookingId)
    if parsed_booking_id is None:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Booking not found"},
        )

    booking = db.get(Booking, parsed_booking_id)
    if not booking:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Booking not found"},
        )

    # The amount is always derived server-side from the booking; a
    # client-supplied amount would let callers underpay and still be
    # reconciled as paid by the callback.
    amount = booking.amount_kes or booking.transport_amount_kes
    payment_rate = None
    if not amount and booking.amount_usd:
        payment_rate = await convert_usd_to_kes(float(booking.amount_usd))
        amount = payment_rate["amountKes"]

    if not amount:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "This booking has no transport payment"},
        )
    if booking.payment_status == "paid":
        return JSONResponse(
            status_code=409,
            content={"success": False, "error": "This booking is already paid"},
        )
    if booking.payment_status == "pending":
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "error": "A KCB payment request is already waiting for confirmation",
            },
        )

    payment: Payment | None = None
    try:
        kcb_client = KcbClient(settings)
        kcb_client._validate_configuration()
        payment = _create_pending_payment(
            db=db,
            booking_id=parsed_booking_id,
            phone=phone,
            amount=int(amount),
        )
        logger.info(
            "KCB STK request started: paymentReference=%s invoiceNumber=%s amount=%s",
            payment.payment_reference,
            payment.invoice_number,
            int(amount),
        )
        response = await kcb_client.initiate_stk_push(
            phone=phone,
            amount=int(amount),
            booking_id=data.bookingId,
            payment_reference=payment.payment_reference or "",
            invoice_number=payment.invoice_number or "",
        )
        logger.info(
            "KCB STK initiation accepted: paymentReference=%s merchantRequestId=%s checkoutRequestId=%s amount=%s",
            payment.payment_reference,
            response.get("MerchantRequestID"),
            response["CheckoutRequestID"],
            int(amount),
        )
        payment.provider_reference = response["CheckoutRequestID"]
        payment.merchant_request_id = response.get("MerchantRequestID")
        payment.checkout_request_id = response["CheckoutRequestID"]
        payment.raw_response = {
            **(payment.raw_response or {}),
            "merchantRequestId": response.get("MerchantRequestID"),
            "checkoutRequestId": response["CheckoutRequestID"],
            "response": response,
        }
        payment.updated_at = datetime.now(UTC)
        booking.payment_status = "pending"
        booking.updated_at = datetime.now(UTC)
        if payment_rate:
            booking.exchange_rate = payment_rate["exchangeRate"]
            booking.amount_kes = payment_rate["amountKes"]
            booking.transport_amount_kes = payment_rate["amountKes"]
            booking.currency_source = payment_rate["source"]
            booking.rate_locked_at = datetime.now(UTC)
        # CheckoutRequestID stays server-side: exposing it would let the
        # initiator forge a matching "paid" callback.
        return {
            "success": True,
            "message": "Check your phone and enter your M-Pesa PIN",
            "paymentId": str(payment.id),
            "paymentReference": payment.payment_reference,
            "invoiceNumber": payment.invoice_number,
            "status": payment.status,
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
        if payment:
            payment.status = "failed"
            payment.raw_response = {
                **(payment.raw_response or {}),
                "requestError": str(exc),
                "responseCode": exc.response_code,
            }
            payment.updated_at = datetime.now(UTC)
        logger.warning(
            "KCB rejected STK push: paymentReference=%s error=%s",
            payment.payment_reference if payment else "<not-created>",
            exc,
        )
        return JSONResponse(
            status_code=502,
            content={"success": False, "error": str(exc)},
        )


@router.post("/callback")
async def kcb_callback(request: Request, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        result = parse_stk_callback(payload)
        logger.info(
            "KCB callback received: merchantRequestId=%s checkoutRequestId=%s resultCode=%s status=%s",
            result["merchantRequestId"],
            result["checkoutRequestId"],
            result["resultCode"],
            result["status"],
        )
        lookup_conditions = []
        if result["checkoutRequestId"]:
            lookup_conditions.extend(
                [
                    Payment.checkout_request_id == result["checkoutRequestId"],
                    Payment.provider_reference == result["checkoutRequestId"],
                ]
            )
        if result["merchantRequestId"]:
            lookup_conditions.append(
                Payment.merchant_request_id == result["merchantRequestId"]
            )

        payment = (
            db.scalar(
                select(Payment).where(
                    Payment.provider == "kcb",
                    or_(*lookup_conditions),
                )
            )
            if lookup_conditions
            else None
        )
        if not payment:
            logger.warning(
                "KCB callback has unknown checkout request ID %s",
                result["checkoutRequestId"],
            )
            return {"ResultCode": 0, "ResultDesc": "Accepted"}

        if payment.status == "paid" and result["status"] == "paid":
            logger.info(
                "KCB duplicate paid callback accepted idempotently: paymentReference=%s checkoutRequestId=%s",
                payment.payment_reference,
                result["checkoutRequestId"],
            )
            return {"ResultCode": 0, "ResultDesc": "Accepted"}

        parsed_booking_id = payment.booking_id or _booking_id(payment.account_number)
        booking = db.get(Booking, parsed_booking_id) if parsed_booking_id else None
        expected_amount = (
            payment.amount
            or (booking.amount_kes if booking else None)
            or (booking.transport_amount_kes if booking else None)
        )
        payment_status = result["status"]
        result_description = result["resultDescription"]
        if payment_status == "paid" and int(result["amount"] or 0) != int(
            expected_amount or 0
        ):
            payment_status = "failed"
            result_description = "Paid amount did not match booking amount"
        payment.status = payment_status
        payment.amount = result["amount"] or payment.amount
        payment.currency = "KES"
        payment.paid_at = _kcb_transaction_datetime(result["transactionDate"])
        payment.mpesa_receipt_number = result["receiptNumber"]
        payment.raw_response = {
            **(payment.raw_response or {}),
            "callback": payload,
            "result": {**result, "resultDescription": result_description},
        }
        payment.updated_at = datetime.now(UTC)
        if booking:
            booking.payment_status = payment_status
            booking.amount_kes = int(result["amount"] or booking.amount_kes or 0) or None
            booking.updated_at = datetime.now(UTC)
        logger.info(
            "KCB callback applied: paymentReference=%s checkoutRequestId=%s status=%s resultCode=%s",
            payment.payment_reference,
            result["checkoutRequestId"],
            payment_status,
            result["resultCode"],
        )
    except Exception:
        logger.exception("Invalid KCB callback")
    # Acknowledge callbacks so the provider does not retry malformed/unknown events forever.
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/status/{booking_id}")
async def payment_status(booking_id: str, db: Session = Depends(get_db)):
    try:
        parsed_booking_id = _booking_id(booking_id)
        booking = db.get(Booking, parsed_booking_id) if parsed_booking_id else None
        if not booking:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Booking not found"},
            )
        latest_payment = db.scalar(
            select(Payment)
            .where(
                Payment.provider == "kcb",
                (Payment.account_number == booking_id)
                | (Payment.booking_id == parsed_booking_id),
            )
            .order_by(Payment.created_at.desc())
        )
        return {
            "success": True,
            "status": booking.payment_status or "unpaid",
            "receiptNumber": latest_payment.mpesa_receipt_number
            or (latest_payment.raw_response or {}).get("result", {}).get("receiptNumber")
            if latest_payment
            else None,
        }
    except Exception:
        logger.exception("Fetch KCB payment status error")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Failed to fetch payment status"},
        )
