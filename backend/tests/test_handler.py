"""Unit tests for the visitor counter Lambda.

DynamoDB is mocked with moto, so nothing here touches a real AWS account and
the suite is safe to run on every push.
"""

from __future__ import annotations

import importlib
import json
from decimal import Decimal

import boto3
import pytest
from botocore.exceptions import ClientError
from moto import mock_aws

TABLE_NAME = "resume-visitor-counter-test"
ALLOWED_ORIGIN = "https://keenenwilkins.com"
SECOND_ORIGIN = "https://www.keenenwilkins.com"


@pytest.fixture()
def aws_environment(monkeypatch):
    """Fake credentials and configuration. Must run before any boto3 client."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("TABLE_NAME", TABLE_NAME)
    monkeypatch.setenv("COUNTER_ID", "site_total")
    monkeypatch.setenv(
        "ALLOWED_ORIGINS", f"{ALLOWED_ORIGIN},{SECOND_ORIGIN},http://localhost:5173"
    )


@pytest.fixture()
def handler(aws_environment):
    """Import the handler fresh inside the mock and clear its cached table."""
    with mock_aws():
        boto3.client("dynamodb", region_name="us-east-1").create_table(
            TableName=TABLE_NAME,
            KeySchema=[{"AttributeName": "counter_id", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "counter_id", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        module = importlib.import_module("visitor_counter.handler")
        importlib.reload(module)
        module.reset_clients()
        yield module
        module.reset_clients()


def build_event(method="POST", path="/visits", origin=ALLOWED_ORIGIN):
    """Minimal API Gateway HTTP API payload format 2.0 event."""
    headers = {"content-type": "application/json"}
    if origin is not None:
        headers["Origin"] = origin
    return {
        "version": "2.0",
        "routeKey": f"{method} {path}",
        "rawPath": path,
        "headers": headers,
        "requestContext": {"http": {"method": method, "path": path}},
        "isBase64Encoded": False,
    }


class FakeContext:
    aws_request_id = "11111111-2222-3333-4444-555555555555"


def body_of(response):
    return json.loads(response["body"])


# ---------------------------------------------------------------- happy paths


def test_post_creates_the_item_and_returns_one(handler):
    response = handler.lambda_handler(build_event("POST"), FakeContext())

    assert response["statusCode"] == 200
    assert body_of(response)["count"] == 1
    assert body_of(response)["mutated"] is True


def test_post_increments_atomically_across_calls(handler):
    for expected in (1, 2, 3, 4, 5):
        response = handler.lambda_handler(build_event("POST"), FakeContext())
        assert body_of(response)["count"] == expected


def test_get_reads_without_mutating(handler):
    handler.lambda_handler(build_event("POST"), FakeContext())
    handler.lambda_handler(build_event("POST"), FakeContext())

    first = handler.lambda_handler(build_event("GET"), FakeContext())
    second = handler.lambda_handler(build_event("GET"), FakeContext())

    assert body_of(first)["count"] == 2
    assert body_of(second)["count"] == 2
    assert body_of(first)["mutated"] is False


def test_get_on_a_cold_table_returns_zero(handler):
    response = handler.lambda_handler(build_event("GET"), FakeContext())

    assert response["statusCode"] == 200
    assert body_of(response)["count"] == 0


def test_increment_writes_a_last_seen_timestamp(handler):
    handler.lambda_handler(build_event("POST"), FakeContext())

    table = boto3.resource("dynamodb", region_name="us-east-1").Table(TABLE_NAME)
    item = table.get_item(Key={"counter_id": "site_total"})["Item"]

    assert item["visit_count"] == Decimal(1)
    assert item["last_seen_at"].startswith("20")


def test_stage_prefixed_paths_still_route(handler):
    response = handler.lambda_handler(
        build_event("POST", path="/prod/visits"), FakeContext()
    )

    assert response["statusCode"] == 200


# ---------------------------------------------------------------------- CORS


def test_preflight_returns_204_with_cors_headers(handler):
    response = handler.lambda_handler(build_event("OPTIONS"), FakeContext())
    headers = response["headers"]

    assert response["statusCode"] == 204
    assert response["body"] == ""
    assert headers["Access-Control-Allow-Origin"] == ALLOWED_ORIGIN
    assert headers["Access-Control-Allow-Methods"] == "GET, POST, OPTIONS"
    assert headers["Access-Control-Max-Age"] == "86400"
    assert headers["Vary"] == "Origin"


def test_each_allowlisted_origin_is_echoed_back_exactly(handler):
    for origin in (ALLOWED_ORIGIN, SECOND_ORIGIN, "http://localhost:5173"):
        response = handler.lambda_handler(
            build_event("GET", origin=origin), FakeContext()
        )
        assert response["headers"]["Access-Control-Allow-Origin"] == origin


def test_unknown_origin_is_refused_with_403(handler):
    response = handler.lambda_handler(
        build_event("POST", origin="https://attacker.example"), FakeContext()
    )

    assert response["statusCode"] == 403
    assert "Access-Control-Allow-Origin" not in response["headers"]
    assert body_of(response)["error"] == "origin not allowed"


def test_refused_origin_never_increments_the_counter(handler):
    handler.lambda_handler(
        build_event("POST", origin="https://attacker.example"), FakeContext()
    )
    response = handler.lambda_handler(build_event("GET"), FakeContext())

    assert body_of(response)["count"] == 0


def test_request_without_an_origin_header_still_works(handler):
    response = handler.lambda_handler(build_event("GET", origin=None), FakeContext())

    assert response["statusCode"] == 200
    assert "Access-Control-Allow-Origin" not in response["headers"]


def test_wildcard_allowlist_returns_a_star(handler, monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "*")

    response = handler.lambda_handler(
        build_event("GET", origin="https://anything.example"), FakeContext()
    )

    assert response["headers"]["Access-Control-Allow-Origin"] == "*"


def test_responses_are_never_cached(handler):
    response = handler.lambda_handler(build_event("GET"), FakeContext())

    assert response["headers"]["Cache-Control"] == "no-store"
    assert response["headers"]["X-Content-Type-Options"] == "nosniff"


# ------------------------------------------------------------------- routing


def test_unknown_path_returns_404(handler):
    response = handler.lambda_handler(
        build_event("GET", path="/admin"), FakeContext()
    )

    assert response["statusCode"] == 404
    assert body_of(response)["error"] == "route not found"


def test_unsupported_method_returns_405(handler):
    response = handler.lambda_handler(build_event("DELETE"), FakeContext())

    assert response["statusCode"] == 405
    assert body_of(response)["error"] == "method not allowed"


def test_rest_api_v1_payload_shape_is_supported(handler):
    event = {
        "httpMethod": "POST",
        "path": "/visits",
        "headers": {"Origin": ALLOWED_ORIGIN},
    }

    response = handler.lambda_handler(event, FakeContext())

    assert response["statusCode"] == 200
    assert body_of(response)["count"] == 1


# -------------------------------------------------------------- failure modes


def test_dynamodb_failure_returns_500_without_leaking_details(handler, monkeypatch):
    def explode(*_args, **_kwargs):
        raise ClientError(
            {
                "Error": {
                    "Code": "ProvisionedThroughputExceededException",
                    "Message": "slow down",
                }
            },
            "UpdateItem",
        )

    monkeypatch.setattr(handler, "_increment", explode)

    response = handler.lambda_handler(build_event("POST"), FakeContext())

    assert response["statusCode"] == 500
    assert body_of(response) == {"error": "counter unavailable"}
    assert "slow down" not in response["body"]


def test_missing_table_returns_500(handler, monkeypatch):
    monkeypatch.setenv("TABLE_NAME", "table-that-does-not-exist")
    handler.reset_clients()

    response = handler.lambda_handler(build_event("POST"), FakeContext())

    assert response["statusCode"] == 500
