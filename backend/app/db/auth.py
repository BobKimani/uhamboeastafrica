import logging

try:
    from botocore.exceptions import (
        BotoCoreError,
        ClientError,
        MissingDependencyException,
        NoCredentialsError,
        PartialCredentialsError,
    )
except ModuleNotFoundError:
    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass

    class MissingDependencyException(Exception):
        pass

    class NoCredentialsError(Exception):
        pass

    class PartialCredentialsError(Exception):
        pass

from app.config import settings

logger = logging.getLogger(__name__)


class DatabaseConfigurationError(RuntimeError):
    pass


class DatabaseAuthenticationError(RuntimeError):
    pass


def create_rds_client():
    try:
        import boto3
    except ModuleNotFoundError as exc:
        raise DatabaseAuthenticationError(
            'Failed to generate IAM database auth token; install "boto3"'
        ) from exc

    return boto3.client("rds", region_name=settings.aws_region)


def generate_iam_auth_token() -> str:
    if not settings.db_host:
        raise DatabaseConfigurationError("DB_HOST is required for IAM database auth")
    if not settings.db_user:
        raise DatabaseConfigurationError("DB_USER is required for IAM database auth")
    if not settings.aws_region:
        raise DatabaseConfigurationError("AWS_REGION is required for IAM database auth")

    try:
        client = create_rds_client()
        token = client.generate_db_auth_token(
            DBHostname=settings.db_host,
            Port=settings.db_port,
            DBUsername=settings.db_user,
        )
    except MissingDependencyException as exc:
        logger.warning(
            "Failed to generate IAM database auth token: missing AWS SDK dependency"
        )
        raise DatabaseAuthenticationError(
            'Failed to generate IAM database auth token; install "botocore[crt]"'
        ) from exc
    except (NoCredentialsError, PartialCredentialsError) as exc:
        logger.warning(
            "Failed to generate IAM database auth token: AWS credentials unavailable"
        )
        raise DatabaseAuthenticationError(
            "Failed to generate IAM database auth token; AWS credentials are unavailable"
        ) from exc
    except (BotoCoreError, ClientError) as exc:
        logger.warning(
            "Failed to generate IAM database auth token: %s",
            exc.__class__.__name__,
        )
        raise DatabaseAuthenticationError(
            "Failed to generate IAM database auth token"
        ) from exc

    if not token:
        raise DatabaseAuthenticationError("AWS returned an empty IAM database token")

    return token
