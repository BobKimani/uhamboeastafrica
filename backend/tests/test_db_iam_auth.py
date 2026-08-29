import importlib

import pytest
import boto3

from app.db import auth, session


def test_iam_token_is_added_when_sqlalchemy_opens_physical_connection(monkeypatch):
    calls = []

    def fake_generate_token():
        calls.append("called")
        return "fresh-token"

    monkeypatch.setattr(session, "generate_iam_auth_token", fake_generate_token)

    params = {}
    session.provide_iam_token(None, None, [], params)

    assert params["password"] == "fresh-token"
    assert calls == ["called"]


def test_iam_token_is_not_generated_at_module_import(monkeypatch):
    calls = []
    original_generate_token = auth.generate_iam_auth_token

    def fake_generate_token():
        calls.append("called")
        return "fresh-token"

    monkeypatch.setattr(auth, "generate_iam_auth_token", fake_generate_token)

    importlib.reload(session)

    assert calls == []
    monkeypatch.setattr(auth, "generate_iam_auth_token", original_generate_token)
    importlib.reload(session)


def test_engine_uses_stale_connection_protection():
    assert session.engine.pool._pre_ping is True
    assert session.engine.pool._recycle == 600


def test_boto3_client_uses_default_credential_provider_chain(monkeypatch):
    captured = {}

    class FakeRdsClient:
        def generate_db_auth_token(self, **kwargs):
            return "generated-token"

    def fake_boto3_client(*args, **kwargs):
        captured["client_args"] = args
        captured["client_kwargs"] = kwargs
        return FakeRdsClient()

    monkeypatch.setattr(boto3, "client", fake_boto3_client)

    client = auth.create_rds_client()

    assert isinstance(client, FakeRdsClient)
    assert captured["client_args"] == ("rds",)
    assert captured["client_kwargs"] == {"region_name": auth.settings.aws_region}
    assert "aws_access_key_id" not in captured["client_kwargs"]
    assert "aws_secret_access_key" not in captured["client_kwargs"]
    assert "aws_session_token" not in captured["client_kwargs"]


def test_generate_iam_auth_token_uses_created_rds_client(monkeypatch):
    captured = {}

    class FakeRdsClient:
        def generate_db_auth_token(self, **kwargs):
            captured["token_kwargs"] = kwargs
            return "generated-token"

    def fake_create_rds_client():
        captured["client_kwargs"] = {"region_name": auth.settings.aws_region}
        return FakeRdsClient()

    monkeypatch.setattr(auth, "create_rds_client", fake_create_rds_client)

    assert auth.generate_iam_auth_token() == "generated-token"
    assert captured["client_kwargs"] == {"region_name": auth.settings.aws_region}
    assert captured["token_kwargs"] == {
        "DBHostname": auth.settings.db_host,
        "Port": auth.settings.db_port,
        "DBUsername": auth.settings.db_user,
    }


def test_missing_aws_credentials_raise_controlled_error(monkeypatch):
    class FakeRdsClient:
        def generate_db_auth_token(self, **kwargs):
            raise auth.NoCredentialsError()

    monkeypatch.setattr(auth, "create_rds_client", lambda: FakeRdsClient())

    with pytest.raises(auth.DatabaseAuthenticationError) as exc_info:
        auth.generate_iam_auth_token()

    message = str(exc_info.value)
    assert "AWS credentials are unavailable" in message
    assert "AWS_SECRET_ACCESS_KEY" not in message
    assert "AWS_SESSION_TOKEN" not in message
    assert "generated-token" not in message
