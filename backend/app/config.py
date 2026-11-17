import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Settings:
    # PostgreSQL with standard username/password auth. On the VPS the database
    # is the `db` service on the internal Docker network.
    db_host = os.environ.get("DB_HOST", "db")
    db_port = int(os.environ.get("DB_PORT", "5432"))
    db_name = os.environ.get("DB_NAME")
    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")
    # "prefer" uses TLS when the server offers it; set "disable" for the
    # internal Docker network or "require" for a remote managed database.
    db_sslmode = os.environ.get("DB_SSLMODE", "prefer")

    # Local media storage (replaces S3/CloudFront). MEDIA_ROOT is bind-mounted
    # from /srv/uhambo/uploads on the VPS; Nginx serves it at MEDIA_BASE_URL.
    media_root = os.environ.get("MEDIA_ROOT", "/app/uploads")
    media_base_url = (
        os.environ.get("MEDIA_BASE_URL", "https://api.uhamboeastafrica.com/media")
        .strip()
        .rstrip("/")
    )
    media_max_upload_bytes = int(
        os.environ.get("MEDIA_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))
    )

    @property
    def database_url(self) -> URL:
        if not all([self.db_host, self.db_name, self.db_user]):
            raise ValueError(
                "DB_HOST, DB_NAME, and DB_USER are required for database access"
            )
        # URL.create escapes special characters in the credentials, and its
        # string form masks the password so it never appears in logs.
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.db_user,
            password=self.db_password or None,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )

    cors_allowed_origins = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:3000",
        ).split(",")
        if origin.strip()
    ]

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")
    # Local administrator authentication (replaces AWS Cognito).
    # SESSION_SECRET keys the per-session CSRF token HMAC.
    session_secret = os.environ.get("SESSION_SECRET")
    session_cookie_name = os.environ.get("SESSION_COOKIE_NAME", "uhambo_admin_session")
    # Absolute server-side session lifetime: 8 hours, which is also the maximum.
    # Larger values (e.g. the former Cognito-era 86400) are capped; see main.py.
    session_max_age_limit_seconds = 8 * 60 * 60
    session_max_age_seconds = min(
        int(os.environ.get("SESSION_MAX_AGE_SECONDS", "28800")),
        session_max_age_limit_seconds,
    )
    # Secure cookies by default; set "false" only for plain-http local development.
    session_https_only = (
        os.environ.get("SESSION_HTTPS_ONLY", "true").strip().lower() == "true"
    )
    # Login rate limiting: failed attempts allowed per window, per email and per IP.
    admin_login_window_seconds = int(os.environ.get("ADMIN_LOGIN_WINDOW_SECONDS", "900"))
    admin_login_max_failures_per_email = int(
        os.environ.get("ADMIN_LOGIN_MAX_FAILURES_PER_EMAIL", "5")
    )
    admin_login_max_failures_per_ip = int(
        os.environ.get("ADMIN_LOGIN_MAX_FAILURES_PER_IP", "20")
    )

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
