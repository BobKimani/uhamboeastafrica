import asyncio
import json
from dataclasses import dataclass

import httpx
import pytest

from app.payments.kcb import (
    KcbClient,
    KcbConfigurationError,
    normalize_kenyan_phone,
    parse_stk_callback,
)


@dataclass
class KcbTestSettings:
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


def test_builds_invoice_number_with_normal_reference():
    assert (
        KcbClient(KcbTestSettings())._invoice_number("aqTBHRFNQylK6EHBkrKL")
        == "7698390-aqTBHRFNQylK6EHBkrKL"
    )


def test_builds_invoice_number_with_spaces_in_reference():
    assert (
        KcbClient(KcbTestSettings())._invoice_number(" UHAMBO TEST 001 ")
        == "7698390-UHAMBO-TEST-001"
    )


def test_rejects_missing_invoice_reference():
    with pytest.raises(ValueError, match="account reference"):
        KcbClient(KcbTestSettings())._invoice_number("  ")


def test_rejects_missing_account_number():
    with pytest.raises(KcbConfigurationError, match="KCB_ORG_SHORTCODE"):
        KcbClient(KcbTestSettings(kcb_org_shortcode="  "))._invoice_number(
            "UHAMBO-TEST-001"
        )


def test_does_not_duplicate_already_prefixed_invoice_reference():
    assert (
        KcbClient(KcbTestSettings())._invoice_number("7698390-aqTBHRFNQylK6EHBkrKL")
        == "7698390-aqTBHRFNQylK6EHBkrKL"
    )


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
                phone="254712345678", amount=23400, booking_id="aqTBHRFNQylK6EHBkrKL"
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
        "invoiceNumber": "7698390-aqTBHRFNQylK6EHBkrKL",
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
