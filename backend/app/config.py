import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Settings:
    firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
    firebase_client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    firebase_private_key = os.environ.get("FIREBASE_PRIVATE_KEY")

    cors_allowed_origins = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]

    default_usd_to_kes_rate = float(os.environ.get("DEFAULT_USD_TO_KES_RATE", "129.0"))
    currency_cache_seconds = int(os.environ.get("CURRENCY_CACHE_SECONDS", "21600"))

    kcb_base_url = os.environ.get(
        "KCB_BASE_URL", "https://uat.buni.kcbgroup.com/mm/api/request/1.0.0"
    ).rstrip("/")
    kcb_token_url = os.environ.get(
        "KCB_TOKEN_URL",
        "https://uat.buni.kcbgroup.com/token?grant_type=client_credentials",
    )
    kcb_consumer_key = os.environ.get("KCB_CONSUMER_KEY")
    kcb_consumer_secret = os.environ.get("KCB_CONSUMER_SECRET")
    kcb_route_code = os.environ.get("KCB_ROUTE_CODE", "207")
    kcb_operation = os.environ.get("KCB_OPERATION", "STKPush")
    kcb_shared_shortcode = (
        os.environ.get("KCB_SHARED_SHORTCODE", "true").lower() == "true"
    )
    kcb_till_number = os.environ.get("KCB_TILL_NUMBER", "")
    kcb_org_shortcode = os.environ.get("KCB_ORG_SHORTCODE", "")
    kcb_org_passkey = os.environ.get("KCB_ORG_PASSKEY", "")
    kcb_callback_url = os.environ.get("KCB_CALLBACK_URL")


settings = Settings()
