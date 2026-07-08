from app.payments.mpesa import normalize_kenyan_phone, parse_stk_callback


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
