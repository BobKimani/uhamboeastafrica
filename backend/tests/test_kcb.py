import asyncio
import json

import httpx
import pytest

from app.payments.kcb import KcbClient, normalize_kenyan_phone, parse_stk_callback


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

    class TestSettings:
        kcb_base_url = "https://uat.buni.kcbgroup.com/mm/api/request/1.0.0"
        kcb_token_url = (
            "https://uat.buni.kcbgroup.com/token?grant_type=client_credentials"
        )
        kcb_consumer_key = "consumer-key"
        kcb_consumer_secret = "consumer-secret"
        kcb_route_code = "207"
        kcb_operation = "STKPush"
        kcb_shared_shortcode = True
        kcb_till_number = "123456"
        kcb_org_shortcode = ""
        kcb_org_passkey = ""
        kcb_callback_url = "https://example.com/api/payments/kcb/callback"

    async def run_request():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await KcbClient(TestSettings(), client).initiate_stk_push(
                phone="254712345678", amount=23400, booking_id="booking-123456789"
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
        "invoiceNumber": "123456-booking123456789",
        "sharedShortCode": True,
        "orgShortCode": "",
        "orgPassKey": "",
        "callbackUrl": "https://example.com/api/payments/kcb/callback",
        "transactionDescription": "Transport Pay",
    }


def test_rejects_missing_access_token_header():
    class TestSettings:
        kcb_route_code = "207"
        kcb_operation = "STKPush"

    with pytest.raises(Exception, match="access token"):
        KcbClient(TestSettings())._headers("  ")
