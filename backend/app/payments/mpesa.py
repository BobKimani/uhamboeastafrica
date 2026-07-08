import base64
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.config import Settings


class MpesaConfigurationError(RuntimeError):
    pass


class MpesaRequestError(RuntimeError):
    def __init__(self, message: str, *, response_code: str | None = None):
        super().__init__(message)
        self.response_code = response_code


def normalize_kenyan_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        digits = f"254{digits[1:]}"
    elif digits.startswith("7") and len(digits) == 9:
        digits = f"254{digits}"

    if len(digits) != 12 or not digits.startswith("254"):
        raise ValueError("Enter a valid Kenyan M-PESA phone number")
    return digits


class MpesaClient:
    def __init__(self, settings: Settings, http_client: httpx.AsyncClient | None = None):
        self.settings = settings
        self._http_client = http_client

    def _validate_configuration(self) -> None:
        missing = [
            name
            for name, value in {
                "MPESA_CONSUMER_KEY": self.settings.mpesa_consumer_key,
                "MPESA_CONSUMER_SECRET": self.settings.mpesa_consumer_secret,
                "MPESA_PASSKEY": self.settings.mpesa_passkey,
                "MPESA_CALLBACK_URL": self.settings.mpesa_callback_url,
            }.items()
            if not value
        ]
        if missing:
            raise MpesaConfigurationError(
                f"M-PESA is not configured; missing {', '.join(missing)}"
            )

    async def initiate_stk_push(
        self, *, phone: str, amount: int, booking_id: str
    ) -> dict[str, Any]:
        self._validate_configuration()
        timestamp = datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")
        password_source = (
            f"{self.settings.mpesa_shortcode}{self.settings.mpesa_passkey}{timestamp}"
        )
        password = base64.b64encode(password_source.encode()).decode()
        credentials = base64.b64encode(
            f"{self.settings.mpesa_consumer_key}:{self.settings.mpesa_consumer_secret}".encode()
        ).decode()

        owns_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=30.0)
        try:
            token_response = await client.get(
                f"{self.settings.mpesa_base_url}/oauth/v1/generate",
                params={"grant_type": "client_credentials"},
                headers={"Authorization": f"Basic {credentials}"},
            )
            token_response.raise_for_status()
            access_token = token_response.json()["access_token"]

            response = await client.post(
                f"{self.settings.mpesa_base_url}/mpesa/stkpush/v1/processrequest",
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "BusinessShortCode": self.settings.mpesa_shortcode,
                    "Password": password,
                    "Timestamp": timestamp,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": amount,
                    "PartyA": phone,
                    "PartyB": self.settings.mpesa_shortcode,
                    "PhoneNumber": phone,
                    "CallBackURL": self.settings.mpesa_callback_url,
                    "AccountReference": self.settings.mpesa_account_reference,
                    "TransactionDesc": f"Transport {booking_id[:8]}",
                },
            )
            data = response.json()
            if response.is_error or data.get("ResponseCode") != "0":
                raise MpesaRequestError(
                    data.get("errorMessage")
                    or data.get("ResponseDescription")
                    or "M-PESA rejected the payment request",
                    response_code=data.get("errorCode") or data.get("ResponseCode"),
                )
            return data
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            if isinstance(exc, MpesaRequestError):
                raise
            raise MpesaRequestError("Unable to reach M-PESA") from exc
        finally:
            if owns_client:
                await client.aclose()


def parse_stk_callback(payload: dict[str, Any]) -> dict[str, Any]:
    callback = payload["Body"]["stkCallback"]
    metadata_items = callback.get("CallbackMetadata", {}).get("Item", [])
    metadata = {
        item["Name"]: item.get("Value")
        for item in metadata_items
        if "Name" in item
    }
    result_code = int(callback["ResultCode"])
    return {
        "checkoutRequestId": callback["CheckoutRequestID"],
        "merchantRequestId": callback.get("MerchantRequestID"),
        "status": "paid" if result_code == 0 else "failed",
        "resultCode": result_code,
        "resultDescription": callback.get("ResultDesc", ""),
        "receiptNumber": metadata.get("MpesaReceiptNumber"),
        "amount": metadata.get("Amount"),
        "phone": metadata.get("PhoneNumber"),
        "transactionDate": metadata.get("TransactionDate"),
    }
