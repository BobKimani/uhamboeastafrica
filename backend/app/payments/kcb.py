import json
import logging
import re
import uuid
from typing import Any

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


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


def mask_phone(phone: str) -> str:
    if len(phone) <= 4:
        return "****"

    return f"{phone[:4]}{'X' * (len(phone) - 4)}"


def mask_phone_numbers(text: str) -> str:
    return re.sub(
        r"\b254[71]\d{8}\b",
        lambda match: mask_phone(match.group(0)),
        text,
    )


def response_preview(response: httpx.Response, limit: int = 300) -> str:
    try:
        data = response.json()
    except ValueError:
        return mask_phone_numbers(response.text)[:limit]

    if isinstance(data, dict):
        for key in ("access_token", "token", "Authorization", "authorization"):
            if key in data:
                data[key] = "***hidden***"

    return mask_phone_numbers(json.dumps(data))[:limit]


def safe_stk_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        **payload,
        "phoneNumber": mask_phone(str(payload.get("phoneNumber") or "")),
        "orgPassKey": "***hidden***" if payload.get("orgPassKey") else "",
    }


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

        if shared_shortcode and not self.settings.kcb_org_shortcode:
            missing.append("KCB_ORG_SHORTCODE")

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

        logger.debug("KCB token URL: %s", token_url)
        logger.debug("KCB token status code: %s", response.status_code)
        logger.debug("KCB token response preview: %s", response_preview(response))

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

    def _invoice_number(self, account_reference: str) -> str:
        account_number = str(self.settings.kcb_org_shortcode).strip()
        if not account_number:
            raise KcbConfigurationError("KCB_ORG_SHORTCODE is required")

        account_reference = str(account_reference).strip()
        if not account_reference:
            raise ValueError("KCB account reference is required")

        sanitized_reference = re.sub(r"[^A-Za-z0-9_-]", "-", account_reference)
        prefixed_value = f"{account_number}-"
        if sanitized_reference == account_number:
            raise ValueError(
                "KCB account reference must include more than the account number"
            )
        if sanitized_reference.startswith(prefixed_value):
            return sanitized_reference

        return f"{account_number}-{sanitized_reference}"

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
            "transactionDescription": "Uhambo booking payment",
        }

        owns_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=30.0)

        try:
            access_token = await self.get_access_token(client)
            headers = self._headers(access_token)

            safe_headers = dict(headers)
            safe_headers["Authorization"] = "***hidden***"

            logger.debug("KCB STK URL: %s", stk_url)
            logger.debug("KCB STK headers: %s", safe_headers)

            print("KCB SANDBOX STK PUSH PAYLOAD:")
            print(json.dumps(safe_stk_payload(payload), indent=2))

            response = await client.post(
                stk_url,
                headers=headers,
                json=payload,
            )

            logger.debug("KCB STK status code: %s", response.status_code)
            logger.debug("KCB STK response preview: %s", response_preview(response))

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
