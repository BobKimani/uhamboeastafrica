import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

import httpx
import pytest

from app.payments.kcb import (
    KcbClient,
    KcbConfigurationError,
    build_kcb_invoice_number,
    build_payment_reference,
    normalize_kenyan_phone,
    parse_stk_callback,
    validate_kcb_runtime_configuration,
)


@dataclass
class KcbTestSettings:
    kcb_environment: str = "sandbox"
    kcb_base_url: str = "https://uat.buni.kcbgroup.com/mm/api/request/1.0.0"
    kcb_token_url: str = (
        "https://uat.buni.kcbgroup.com/token?grant_type=client_credentials"
    )
    kcb_consumer_key: str = "consumer-key"
    kcb_consumer_secret: str = "consumer-secret"
    kcb_route_code: str = "207"
    kcb_operation: str = "STKPush"
    kcb_shared_shortcode: bool = True
    kcb_till_number: str = "522522"
    kcb_org_shortcode: str = "7698390"
    kcb_account_reference: str = "7698390"
    kcb_org_passkey: str = ""
    kcb_callback_url: str = "https://example.com/api/payments/kcb/callback"


def test_normalizes_common_kenyan_phone_formats():
    assert normalize_kenyan_phone("0712 345 678") == "254712345678"
    assert normalize_kenyan_phone("+254 712 345 678") == "254712345678"
    assert normalize_kenyan_phone("712345678") == "254712345678"


def test_rejects_non_kenyan_phone():
    try:
        normalize_kenyan_phone("+256700000000")
    except ValueError as exc:
        assert "Kenyan" in str(exc)
    else:
        raise AssertionError("Expected invalid phone number to be rejected")


def test_parses_successful_stk_callback():
    result = parse_stk_callback(
        {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "merchant-1",
                    "CheckoutRequestID": "checkout-1",
                    "ResultCode": 0,
                    "ResultDesc": "Processed successfully",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 23400.0},
                            {"Name": "MpesaReceiptNumber", "Value": "TEST123"},
                            {"Name": "PhoneNumber", "Value": 254712345678},
                        ]
                    },
                }
            }
        }
    )

    assert result["status"] == "paid"
    assert result["checkoutRequestId"] == "checkout-1"
    assert result["receiptNumber"] == "TEST123"


def test_parses_cancelled_stk_callback_without_metadata():
    result = parse_stk_callback(
        {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "merchant-1",
                    "CheckoutRequestID": "checkout-1",
                    "ResultCode": 1032,
                    "ResultDesc": "Request cancelled by user",
                }
            }
        }
    )

    assert result["status"] == "failed"
    assert result["receiptNumber"] is None


def test_builds_payment_reference_from_payment_uuid_and_date():
    payment_id = UUID("041bf1b9-72b5-408d-b73f-8b50e12d0428")
    created_at = datetime(2026, 7, 26, 12, 30, tzinfo=UTC)

    assert build_payment_reference(payment_id, created_at) == "UHA-20260726-8B50E12D"


def test_builds_invoice_number_with_short_payment_reference():
    assert (
        build_kcb_invoice_number(KcbTestSettings(), "UHA-20260726-8B50E12D")
        == "7698390-UHA-20260726-8B50E12D"
    )


def test_rejects_missing_invoice_reference():
    with pytest.raises(ValueError, match="payment reference"):
        build_kcb_invoice_number(KcbTestSettings(), "  ")


def test_rejects_missing_account_number():
    with pytest.raises(KcbConfigurationError, match="KCB_ACCOUNT_REFERENCE"):
        build_kcb_invoice_number(
            KcbTestSettings(kcb_account_reference="  "), "UHA-20260726-8B50E12D"
        )


def test_rejects_invoice_number_with_invalid_length():
    with pytest.raises(ValueError, match="invoice number"):
        build_kcb_invoice_number(KcbTestSettings(), "UHA-" + "A" * 80)


def test_sends_kcb_buni_stk_push_contract():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url).startswith("https://uat.buni.kcbgroup.com/token"):
            captured["token_request"] = request
            return httpx.Response(200, json={"access_token": "generated-token"})

        captured["stk_request"] = request
        return httpx.Response(
            200,
            json={
                "header": {"statusCode": "0", "statusDescription": "Success"},
                "response": {
                    "MerchantRequestID": "merchant-1",
                    "CheckoutRequestID": "checkout-1",
                    "CustomerMessage": "Accepted",
                    "ResponseCode": 0,
                    "ResponseDescription": "Accepted",
                },
            },
        )

    async def run_request():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await KcbClient(KcbTestSettings(), client).initiate_stk_push(
                phone="254712345678",
                amount=23400,
                booking_id="041bf1b9-72b5-408d-b73f-8b50e12d0428",
                payment_reference="UHA-20260726-8B50E12D",
                invoice_number="7698390-UHA-20260726-8B50E12D",
            )

    result = asyncio.run(run_request())

    token_request = captured["token_request"]
    request = captured["stk_request"]
    assert result["CheckoutRequestID"] == "checkout-1"
    assert token_request.headers["authorization"].startswith("Basic ")
    assert token_request.headers["Content-Type"] == "application/x-www-form-urlencoded"
    assert token_request.content == b"grant_type=client_credentials"
    assert str(request.url).endswith("/stkpush")
    assert request.headers["routeCode"] == "207"
    assert request.headers["operation"] == "STKPush"
    assert "apikey" not in request.headers
    assert request.headers["authorization"] == "Bearer generated-token"
    assert len(request.headers["messageId"]) == 32
    assert json.loads(request.content) == {
        "phoneNumber": "254712345678",
        "amount": "23400",
        "invoiceNumber": "7698390-UHA-20260726-8B50E12D",
        "sharedShortCode": True,
        "orgShortCode": "7698390",
        "orgPassKey": "",
        "callbackUrl": "https://example.com/api/payments/kcb/callback",
        "transactionDescription": "Uhambo booking payment",
    }


def test_rejects_missing_access_token_header():
    class TestSettings:
        kcb_route_code = "207"
        kcb_operation = "STKPush"

    with pytest.raises(Exception, match="access token"):
        KcbClient(TestSettings())._headers("  ")


def test_rejects_uat_hosts_in_production_configuration():
    with pytest.raises(KcbConfigurationError, match="KCB_BASE_URL"):
        validate_kcb_runtime_configuration(
            KcbTestSettings(kcb_environment="production")
        )


def test_accepts_production_hosts_in_production_configuration():
    validate_kcb_runtime_configuration(
        KcbTestSettings(
            kcb_environment="production",
            kcb_base_url="https://api.buni.kcbgroup.com/mm/api/request/1.0.0",
            kcb_token_url="https://api.buni.kcbgroup.com/token?grant_type=client_credentials",
            kcb_callback_url="https://example.com/api/payments/kcb/callback",
        )
    )
