import os
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Settings:
    db_host = os.environ.get("DB_HOST")
    db_port = int(os.environ.get("DB_PORT", "5432"))
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_sslmode = os.environ.get("DB_SSLMODE", "require")
    aws_region = os.environ.get("AWS_REGION", "eu-north-1")
    s3_bucket = os.environ.get("S3_BUCKET", "uhambo-s3-bucket")
    s3_public_base_url = os.environ.get("S3_PUBLIC_BASE_URL")

    @property
    def database_url(self) -> str:
        if not all([self.db_host, self.db_name, self.db_user]):
            raise ValueError(
                "DB_HOST, DB_NAME, and DB_USER are required for database access"
            )
        user = quote(str(self.db_user), safe="")
        host = str(self.db_host)
        name = quote(str(self.db_name), safe="")
        return f"postgresql+psycopg://{user}@{host}:{self.db_port}/{name}"

    cors_allowed_origins = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:3000",
        ).split(",")
        if origin.strip()
    ]

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")
    session_secret = os.environ.get("SESSION_SECRET")
    session_cookie_name = os.environ.get("SESSION_COOKIE_NAME", "uhambo_admin_session")
    oauth_state_cookie_name = os.environ.get(
        "OAUTH_STATE_COOKIE_NAME", "uhambo_oauth_state"
    )
    session_max_age_seconds = int(os.environ.get("SESSION_MAX_AGE_SECONDS", "86400"))
    session_https_only = (
        os.environ.get("SESSION_HTTPS_ONLY", "false").strip().lower() == "true"
    )

    cognito_client_id = os.environ.get("COGNITO_CLIENT_ID")
    cognito_client_secret = os.environ.get("COGNITO_CLIENT_SECRET")
    cognito_user_pool_id = os.environ.get("COGNITO_USER_POOL_ID")
    cognito_region = os.environ.get("COGNITO_REGION", "eu-north-1")
    cognito_domain = os.environ.get("COGNITO_DOMAIN")
    cognito_metadata_url = os.environ.get("COGNITO_METADATA_URL")
    cognito_redirect_uri = os.environ.get("COGNITO_REDIRECT_URI")
    cognito_logout_redirect_uri = os.environ.get("COGNITO_LOGOUT_REDIRECT_URI")
    cognito_admin_groups = [
        group.strip()
        for group in os.environ.get(
            "COGNITO_ADMIN_GROUPS",
            os.environ.get("COGNITO_ADMIN_GROUP", "admin,admins"),
        ).split(",")
        if group.strip()
    ]
    cognito_admin_group = cognito_admin_groups[0] if cognito_admin_groups else "admin"

    @property
    def all_cors_allowed_origins(self) -> list[str]:
        origins = [*self.cors_allowed_origins]
        if self.frontend_url and self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins

    default_usd_to_kes_rate = float(os.environ.get("DEFAULT_USD_TO_KES_RATE", "129.0"))
    currency_cache_seconds = int(os.environ.get("CURRENCY_CACHE_SECONDS", "21600"))

    kcb_environment = os.environ.get("KCB_ENVIRONMENT", "sandbox").strip().lower()
    kcb_base_url = os.environ.get(
        "KCB_BASE_URL", "https://uat.buni.kcbgroup.com/mm/api/request/1.0.0"
    ).strip().rstrip("/")
    kcb_token_url = os.environ.get(
        "KCB_TOKEN_URL",
        "https://uat.buni.kcbgroup.com/token?grant_type=client_credentials",
    ).strip()
    kcb_consumer_key = os.environ.get("KCB_CONSUMER_KEY")
    kcb_consumer_secret = os.environ.get("KCB_CONSUMER_SECRET")
    kcb_route_code = os.environ.get("KCB_ROUTE_CODE", "207").strip()
    kcb_operation = os.environ.get("KCB_OPERATION", "STKPush").strip()
    kcb_shared_shortcode = (
        os.environ.get("KCB_SHARED_SHORTCODE", "true").strip().lower() == "true"
    )
    kcb_till_number = os.environ.get("KCB_TILL_NUMBER", "").strip()
    kcb_org_shortcode = os.environ.get("KCB_ORG_SHORTCODE", "").strip()
    kcb_account_reference = (
        os.environ.get("KCB_ACCOUNT_REFERENCE") or kcb_org_shortcode
    ).strip()
    kcb_org_passkey = os.environ.get("KCB_ORG_PASSKEY", "").strip()
    kcb_callback_url = (
        callback_url.strip()
        if (callback_url := os.environ.get("KCB_CALLBACK_URL")) is not None
        else None
    )


settings = Settings()
