import json
import logging
import re
import uuid
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)
INVOICE_NUMBER_PATTERN = re.compile(r"^[A-Z0-9-]{1,50}$")


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


def _url_host(value: str | None) -> str:
    return urlparse((value or "").strip()).netloc or "<missing>"


def _url_scheme(value: str | None) -> str:
    return urlparse((value or "").strip()).scheme


def _contains_non_production_marker(value: str | None) -> bool:
    text = (value or "").strip().lower()
    return "uat" in text or "sandbox" in text


def _is_local_url(value: str | None) -> bool:
    host = _url_host(value).split(":", 1)[0].lower()
    return host in {"localhost", "127.0.0.1", "::1", "<missing>"}


def kcb_runtime_summary(settings: Settings) -> dict[str, Any]:
    base_url = (settings.kcb_base_url or "").strip().rstrip("/")
    token_url = (settings.kcb_token_url or "").strip()
    callback_url = (settings.kcb_callback_url or "").strip()
    return {
        "environment": settings.kcb_environment,
        "tokenHost": _url_host(token_url),
        "stkHost": _url_host(base_url),
        "stkEndpoint": f"{base_url}/stkpush" if base_url else "<missing>",
        "routeCode": settings.kcb_route_code,
        "operation": settings.kcb_operation,
        "sharedShortCode": as_bool(settings.kcb_shared_shortcode),
        "orgShortCode": (settings.kcb_org_shortcode or "").strip() or "<missing>",
        "tillNumber": (settings.kcb_till_number or "").strip() or "<missing>",
        "callbackHost": _url_host(callback_url),
        "credentialsPresent": bool(
            (settings.kcb_consumer_key or "").strip()
            and (settings.kcb_consumer_secret or "").strip()
        ),
        "orgPassKeyPresent": bool((settings.kcb_org_passkey or "").strip()),
    }


def log_kcb_runtime_configuration(settings: Settings) -> None:
    summary = kcb_runtime_summary(settings)
    logger.info(
        "KCB runtime config: environment=%s tokenHost=%s stkHost=%s stkEndpoint=%s "
        "routeCode=%s operation=%s sharedShortCode=%s orgShortCode=%s tillNumber=%s "
        "callbackHost=%s credentialsPresent=%s orgPassKeyPresent=%s",
        summary["environment"],
        summary["tokenHost"],
        summary["stkHost"],
        summary["stkEndpoint"],
        summary["routeCode"],
        summary["operation"],
        summary["sharedShortCode"],
        summary["orgShortCode"],
        summary["tillNumber"],
        summary["callbackHost"],
        summary["credentialsPresent"],
        summary["orgPassKeyPresent"],
    )


def validate_kcb_runtime_configuration(settings: Settings) -> None:
    environment = (settings.kcb_environment or "").strip().lower()
    if environment not in {"production", "prod", "sandbox", "uat", "test", "development"}:
        raise KcbConfigurationError(
            "KCB_ENVIRONMENT must be one of production, sandbox, uat, test, or development"
        )
    if environment not in {"production", "prod"}:
        return

    errors = []
    if _contains_non_production_marker(settings.kcb_base_url):
        errors.append("KCB_BASE_URL contains uat/sandbox")
    if _contains_non_production_marker(settings.kcb_token_url):
        errors.append("KCB_TOKEN_URL contains uat/sandbox")
    if not (settings.kcb_consumer_key or "").strip():
        errors.append("KCB_CONSUMER_KEY is missing")
    if not (settings.kcb_consumer_secret or "").strip():
        errors.append("KCB_CONSUMER_SECRET is missing")
    if not (settings.kcb_org_shortcode or "").strip():
        errors.append("KCB_ORG_SHORTCODE is missing")
    if not (settings.kcb_till_number or "").strip():
        errors.append("KCB_TILL_NUMBER is missing")
    if not (settings.kcb_account_reference or "").strip():
        errors.append("KCB_ACCOUNT_REFERENCE is missing")
    if _url_scheme(settings.kcb_callback_url) != "https":
        errors.append("KCB_CALLBACK_URL must be HTTPS")
    if _is_local_url(settings.kcb_callback_url):
        errors.append("KCB_CALLBACK_URL must not be localhost in production")
    if not as_bool(settings.kcb_shared_shortcode) and not (
        settings.kcb_org_passkey or ""
    ).strip():
        errors.append("KCB_ORG_PASSKEY is required when shared shortcode is false")

    if errors:
        raise KcbConfigurationError(
            f"Invalid KCB production configuration: {', '.join(errors)}"
        )


def build_payment_reference(payment_id: UUID, created_at: datetime) -> str:
    date_part = created_at.astimezone(UTC).strftime("%Y%m%d")
    uuid_part = payment_id.hex[-12:-4].upper()
    return f"UHA-{date_part}-{uuid_part}"


def build_kcb_invoice_number(settings: Settings, payment_reference: str) -> str:
    account_reference = (settings.kcb_account_reference or "").strip()
    if not account_reference:
        raise KcbConfigurationError("KCB_ACCOUNT_REFERENCE is required")

    sanitized_reference = re.sub(
        r"[^A-Za-z0-9-]",
        "-",
        payment_reference.strip(),
    ).upper()
    if not sanitized_reference:
        raise ValueError("KCB payment reference is required")

    sanitized_account = re.sub(r"[^A-Za-z0-9-]", "-", account_reference).upper()
    invoice_number = f"{sanitized_account}-{sanitized_reference}"
    if not INVOICE_NUMBER_PATTERN.fullmatch(invoice_number):
        raise ValueError(
            "KCB invoice number must be 1-50 uppercase letters, numbers, or hyphens"
        )
    return invoice_number


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

        if not self.settings.kcb_account_reference:
            missing.append("KCB_ACCOUNT_REFERENCE")

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

    def _invoice_number(self, payment_reference: str) -> str:
        return build_kcb_invoice_number(self.settings, payment_reference)

    async def initiate_stk_push(
        self,
        *,
        phone: str,
        amount: int,
        booking_id: str,
        payment_reference: str,
        invoice_number: str,
    ) -> dict[str, Any]:
        self._validate_configuration()

        if amount <= 0:
            raise ValueError("Amount must be greater than 0")

        normalized_phone = normalize_kenyan_phone(phone)
        if invoice_number != self._invoice_number(payment_reference):
            raise ValueError("KCB invoice number does not match payment reference")

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
            logger.info(
                "KCB STK request: environment=%s tokenHost=%s stkHost=%s "
                "paymentReference=%s invoiceNumber=%s amount=%s callbackHost=%s",
                self.settings.kcb_environment,
                _url_host(self.settings.kcb_token_url),
                _url_host(stk_url),
                payment_reference,
                invoice_number,
                amount,
                _url_host(self.settings.kcb_callback_url),
            )
            logger.debug("KCB STK payload preview: %s", safe_stk_payload(payload))

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

            logger.info(
                "KCB STK accepted: paymentReference=%s invoiceNumber=%s merchantRequestId=%s checkoutRequestId=%s responseCode=%s",
                payment_reference,
                invoice_number,
                result.get("MerchantRequestID"),
                result.get("CheckoutRequestID"),
                response_code,
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
