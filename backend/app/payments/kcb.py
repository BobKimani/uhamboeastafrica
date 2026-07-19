import json
import re
import uuid
from typing import Any

import httpx

from app.config import Settings


class KcbConfigurationError(RuntimeError):
    pass


class KcbRequestError(RuntimeError):
    def __init__(self, message: str, *, response_code: str | None = None):
        super().__init__(message)
        self.response_code = response_code


def normalize_kenyan_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())

    if digits.startswith("0") and len(digits) == 10:
        digits = f"254{digits[1:]}"
    elif len(digits) == 9 and digits.startswith(("7", "1")):
        digits = f"254{digits}"

    if len(digits) != 12 or not digits.startswith(("2547", "2541")):
        raise ValueError("Enter a valid Kenyan M-Pesa phone number")

    return digits


def as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}

    return bool(value)


def response_preview(response: httpx.Response, limit: int = 300) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text[:limit]

    if isinstance(data, dict):
        for key in ("access_token", "token", "Authorization", "authorization"):
            if key in data:
                data[key] = "***hidden***"

    return json.dumps(data)[:limit]


class KcbClient:
    def __init__(self, settings: Settings, http_client: httpx.AsyncClient | None = None):
        self.settings = settings
        self._http_client = http_client

    def _validate_configuration(self) -> None:
        missing = []

        if not self.settings.kcb_base_url:
            missing.append("KCB_BASE_URL")

        if not self.settings.kcb_token_url:
            missing.append("KCB_TOKEN_URL")

        if not self.settings.kcb_consumer_key:
            missing.append("KCB_CONSUMER_KEY")

        if not self.settings.kcb_consumer_secret:
            missing.append("KCB_CONSUMER_SECRET")

        if not self.settings.kcb_route_code:
            missing.append("KCB_ROUTE_CODE")

        if not self.settings.kcb_operation:
            missing.append("KCB_OPERATION")

        if not self.settings.kcb_callback_url:
            missing.append("KCB_CALLBACK_URL")

        if self.settings.kcb_shared_shortcode is None:
            missing.append("KCB_SHARED_SHORTCODE")

        shared_shortcode = as_bool(self.settings.kcb_shared_shortcode)

        if shared_shortcode and not self.settings.kcb_till_number:
            missing.append("KCB_TILL_NUMBER")

        if not shared_shortcode:
            if not self.settings.kcb_org_shortcode:
                missing.append("KCB_ORG_SHORTCODE")

            if not self.settings.kcb_org_passkey:
                missing.append("KCB_ORG_PASSKEY")

        if missing:
            raise KcbConfigurationError(
                f"KCB Buni is not configured; missing {', '.join(missing)}"
            )

    async def get_access_token(self, client: httpx.AsyncClient) -> str:
        token_url = self.settings.kcb_token_url.strip()

        response = await client.post(
            token_url,
            auth=httpx.BasicAuth(
                self.settings.kcb_consumer_key.strip(),
                self.settings.kcb_consumer_secret.strip(),
            ),
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            data={
                "grant_type": "client_credentials",
            },
        )

        print("KCB TOKEN URL:", token_url)
        print("KCB TOKEN STATUS CODE:", response.status_code)
        print("KCB TOKEN RESPONSE PREVIEW:", response_preview(response))

        try:
            data = response.json()
        except ValueError as exc:
            raise KcbRequestError(
                f"KCB token request returned non-JSON response: {response.text[:300]}"
            ) from exc

        if response.is_error:
            fault = data.get("fault") if isinstance(data, dict) else None

            if isinstance(fault, dict):
                raise KcbRequestError(
                    fault.get("description")
                    or fault.get("message")
                    or f"KCB token request failed: {data}",
                    response_code=str(fault.get("code") or response.status_code),
                )

            raise KcbRequestError(
                data.get("description")
                or data.get("message")
                or f"KCB token request failed: {response_preview(response)}",
                response_code=str(data.get("code") or response.status_code),
            )

        access_token = str(data.get("access_token") or "").strip()

        if not access_token:
            raise KcbRequestError(
                f"KCB token response did not include access_token: {response_preview(response)}"
            )

        return access_token

    def _headers(self, access_token: str) -> dict[str, str]:
        access_token = access_token.strip()

        if not access_token:
            raise KcbRequestError("Cannot call KCB STK Push without an access token")

        return {
            "Authorization": f"Bearer {access_token}",
            "routeCode": str(self.settings.kcb_route_code).strip(),
            "operation": str(self.settings.kcb_operation).strip(),
            "messageId": uuid.uuid4().hex[:32],
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _invoice_number(self, booking_id: str) -> str:
        clean_booking_ref = re.sub(r"[^A-Za-z0-9]", "", booking_id) or uuid.uuid4().hex
        till_number = str(self.settings.kcb_till_number).strip()

        # KCB PDF format: KCBTILLNO-YOURACCREF.
        # Keep it short enough for KCB/OpenAPI constraints.
        max_invoice_length = 24
        separator = "-"
        max_ref_length = max_invoice_length - len(till_number) - len(separator)

        if max_ref_length < 1:
            raise KcbConfigurationError(
                "KCB_TILL_NUMBER is too long to build a valid invoiceNumber"
            )

        clean_booking_ref = clean_booking_ref[:max_ref_length]

        return f"{till_number}{separator}{clean_booking_ref}"

    async def initiate_stk_push(
        self, *, phone: str, amount: int, booking_id: str
    ) -> dict[str, Any]:
        self._validate_configuration()

        if amount <= 0:
            raise ValueError("Amount must be greater than 0")

        normalized_phone = normalize_kenyan_phone(phone)
        invoice_number = self._invoice_number(booking_id)

        stk_url = f"{self.settings.kcb_base_url.rstrip('/')}/stkpush"

        payload = {
            "phoneNumber": normalized_phone,
            "amount": str(amount),
            "invoiceNumber": invoice_number,
            "sharedShortCode": as_bool(self.settings.kcb_shared_shortcode),
            "orgShortCode": (self.settings.kcb_org_shortcode or "").strip(),
            "orgPassKey": (self.settings.kcb_org_passkey or "").strip(),
            "callbackUrl": self.settings.kcb_callback_url.strip(),
            "transactionDescription": "Transport Pay",
        }

        owns_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=30.0)

        try:
            access_token = await self.get_access_token(client)
            headers = self._headers(access_token)

            safe_headers = dict(headers)
            safe_headers["Authorization"] = "***hidden***"

            print("KCB STK URL:", stk_url)
            print("KCB HEADERS:", safe_headers)
            print("KCB CALLBACK URL:", repr(payload["callbackUrl"]))
            print(
                "KCB PAYLOAD:",
                {
                    **payload,
                    "orgPassKey": "***hidden***",
                },
            )

            response = await client.post(
                stk_url,
                headers=headers,
                json=payload,
            )

            print("KCB STATUS CODE:", response.status_code)
            print("KCB RAW RESPONSE:", response.text)

            try:
                data = response.json()
            except ValueError as exc:
                raise KcbRequestError(
                    f"KCB returned non-JSON response: {response.text[:300]}"
                ) from exc

            fault = data.get("fault")
            if isinstance(fault, dict):
                raise KcbRequestError(
                    fault.get("description")
                    or fault.get("message")
                    or f"KCB rejected the payment request: {data}",
                    response_code=str(fault.get("code") or response.status_code),
                )

            if "code" in data and "message" in data:
                raise KcbRequestError(
                    data.get("description")
                    or data.get("message")
                    or f"KCB rejected the payment request: {data}",
                    response_code=str(data.get("code") or response.status_code),
                )

            header = data.get("header", {})
            result = data.get("response", {})

            response_code = result.get("ResponseCode")
            if response_code is None:
                response_code = header.get("statusCode")

            response_code = str(response_code if response_code is not None else "")

            if response.is_error or response_code != "0":
                raise KcbRequestError(
                    result.get("ResponseDescription")
                    or result.get("CustomerMessage")
                    or header.get("statusDescription")
                    or f"KCB rejected the payment request: {data}",
                    response_code=response_code or None,
                )

            return result

        except KcbRequestError:
            raise

        except httpx.HTTPError as exc:
            raise KcbRequestError(f"Unable to reach KCB Buni: {exc}") from exc

        finally:
            if owns_client:
                await client.aclose()


def parse_stk_callback(payload: dict[str, Any]) -> dict[str, Any]:
    callback = payload.get("Body", {}).get("stkCallback", {})

    metadata_items = callback.get("CallbackMetadata", {}).get("Item", [])

    metadata = {
        item["Name"]: item.get("Value")
        for item in metadata_items
        if isinstance(item, dict) and "Name" in item
    }

    result_code = int(callback.get("ResultCode", -1))

    return {
        "checkoutRequestId": callback.get("CheckoutRequestID"),
        "merchantRequestId": callback.get("MerchantRequestID"),
        "status": "paid" if result_code == 0 else "failed",
        "resultCode": result_code,
        "resultDescription": callback.get("ResultDesc", ""),
        "receiptNumber": metadata.get("MpesaReceiptNumber"),
        "amount": metadata.get("Amount"),
        "phone": metadata.get("PhoneNumber"),
        "transactionDate": metadata.get("TransactionDate"),
    }