from authlib.integrations.starlette_client import OAuth

from app.config import settings

oauth = OAuth()


def cognito_metadata_url() -> str | None:
    if settings.cognito_metadata_url:
        return settings.cognito_metadata_url
    if settings.cognito_user_pool_id and settings.cognito_region:
        return (
            f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
            f"{settings.cognito_user_pool_id}/.well-known/openid-configuration"
        )
    return None


def require_cognito_settings() -> None:
    missing = [
        name
        for name, value in {
            "COGNITO_CLIENT_ID": settings.cognito_client_id,
            "COGNITO_CLIENT_SECRET": settings.cognito_client_secret,
            "COGNITO_REDIRECT_URI": settings.cognito_redirect_uri,
            "COGNITO_DOMAIN": settings.cognito_domain,
            "COGNITO_LOGOUT_REDIRECT_URI": settings.cognito_logout_redirect_uri,
            "SESSION_SECRET": settings.session_secret,
        }.items()
        if not value
    ]
    if not cognito_metadata_url():
        missing.append("COGNITO_METADATA_URL or COGNITO_USER_POOL_ID")
    if missing:
        raise RuntimeError(f"Missing Cognito configuration: {', '.join(missing)}")


def configure_oauth() -> None:
    require_cognito_settings()
    oauth.register(
        name="cognito",
        client_id=settings.cognito_client_id,
        client_secret=settings.cognito_client_secret,
        server_metadata_url=cognito_metadata_url(),
        client_kwargs={"scope": "openid email profile"},
    )


configure_oauth()
