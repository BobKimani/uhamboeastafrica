import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
    firebase_client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    firebase_private_key = os.environ.get("FIREBASE_PRIVATE_KEY")

    mpesa_environment = os.environ.get("MPESA_ENVIRONMENT", "sandbox").lower()
    mpesa_consumer_key = os.environ.get("MPESA_CONSUMER_KEY")
    mpesa_consumer_secret = os.environ.get("MPESA_CONSUMER_SECRET")
    mpesa_passkey = os.environ.get("MPESA_PASSKEY")
    mpesa_shortcode = os.environ.get("MPESA_SHORTCODE", "522522")
    mpesa_account_reference = os.environ.get(
        "MPESA_ACCOUNT_REFERENCE", "7698390"
    )
    mpesa_callback_url = os.environ.get("MPESA_CALLBACK_URL")

    @property
    def mpesa_base_url(self) -> str:
        if self.mpesa_environment == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"


settings = Settings()
