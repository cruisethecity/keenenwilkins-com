"""Visitor counter Lambda for the Cloud Resume Challenge.

Contract
--------
OPTIONS /visits   CORS preflight. Returns 204 with no body.
GET     /visits   Reads the current count. Never mutates state.
POST    /visits   Atomically increments the count and returns the new value.

Design notes
------------
* The increment is a single DynamoDB UpdateItem using the ADD action. That is
  an atomic server side operation, so two concurrent invocations can never
  read the same value and write the same result. A read then write pattern
  would lose counts under load.
* CORS is owned entirely by this function. The API Gateway HTTP API
  deliberately has no cors_configuration block, because API Gateway would
  then inject its own Access Control Allow Origin header alongside this one
  and browsers reject duplicated CORS headers.
* Origins are allowlisted from an environment variable. An unknown origin is
  refused with 403 rather than silently echoed back.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Mapping

import boto3
from botocore.exceptions import BotoCoreError, ClientError

LOGGER = logging.getLogger()
LOGGER.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

COUNTER_PATH = "/visits"
SUPPORTED_METHODS = ("GET", "POST", "OPTIONS")

# Cached between invocations so a warm container reuses the TCP connection.
_TABLE = None


def _settings() -> dict[str, Any]:
    """Read configuration at call time so tests can rewrite the environment."""
    raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
    return {
        "table_name": os.environ.get("TABLE_NAME", ""),
        "counter_id": os.environ.get("COUNTER_ID", "site_total"),
        "allowed_origins": tuple(
            origin.strip() for origin in raw_origins.split(",") if origin.strip()
        ),
    }


def _table():
    """Lazily build the DynamoDB table resource.

    Lazy construction matters for two reasons. In production it keeps the
    cold start off the module import path, and in tests it lets moto install
    its mock before any AWS client exists.
    """
    global _TABLE
    if _TABLE is None:
        _TABLE = boto3.resource("dynamodb").Table(_settings()["table_name"])
    return _TABLE


def reset_clients() -> None:
    """Drop the cached table handle. Used by the test suite."""
    global _TABLE
    _TABLE = None


def _lower_headers(event: Mapping[str, Any]) -> dict[str, str]:
    headers = event.get("headers") or {}
    return {str(key).lower(): value for key, value in headers.items()}


def _request_route(event: Mapping[str, Any]) -> tuple[str, str]:
    """Return (method, path) for both HTTP API v2 and REST v1 payloads."""
    http = (event.get("requestContext") or {}).get("http")
    if isinstance(http, Mapping):
        return (
            str(http.get("method", "")).upper(),
            str(http.get("path", "") or ""),
        )
    return (
        str(event.get("httpMethod", "")).upper(),
        str(event.get("path", "") or ""),
    )


def _resolve_origin(origin: str | None, allowed: tuple[str, ...]) -> str | None:
    """Return the value to echo in Access Control Allow Origin, or None."""
    if "*" in allowed:
        return "*"
    if origin and origin in allowed:
        return origin
    return None


def _respond(
    status: int,
    body: dict[str, Any] | None,
    allow_origin: str | None,
) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Vary": "Origin",
    }
    if allow_origin:
        headers.update(
            {
                "Access-Control-Allow-Origin": allow_origin,
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            }
        )
    response: dict[str, Any] = {
        "statusCode": status,
        "headers": headers,
        "isBase64Encoded": False,
    }
    if body is not None:
        response["body"] = json.dumps(body, separators=(",", ":"))
    else:
        response["body"] = ""
    return response


def _increment(counter_id: str) -> int:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    result = _table().update_item(
        Key={"counter_id": counter_id},
        UpdateExpression="ADD visit_count :one SET last_seen_at = :now",
        ExpressionAttributeValues={":one": Decimal(1), ":now": now},
        ReturnValues="UPDATED_NEW",
    )
    return int(result["Attributes"]["visit_count"])


def _read(counter_id: str) -> int:
    result = _table().get_item(Key={"counter_id": counter_id})
    item = result.get("Item") or {}
    return int(item.get("visit_count", 0))


def lambda_handler(event: Mapping[str, Any], context: Any = None) -> dict[str, Any]:
    settings = _settings()
    allowed = settings["allowed_origins"]
    counter_id = settings["counter_id"]

    method, path = _request_route(event)
    origin = _lower_headers(event).get("origin")
    allow_origin = _resolve_origin(origin, allowed)
    request_id = getattr(context, "aws_request_id", "local")

    LOGGER.info(
        json.dumps(
            {
                "message": "request received",
                "requestId": request_id,
                "method": method,
                "path": path,
                "origin": origin,
                "originAllowed": bool(allow_origin),
            }
        )
    )

    # A browser request carrying an origin we do not trust stops here.
    if origin and allow_origin is None:
        LOGGER.warning(
            json.dumps(
                {
                    "message": "origin refused",
                    "requestId": request_id,
                    "origin": origin,
                }
            )
        )
        return _respond(403, {"error": "origin not allowed"}, None)

    if method == "OPTIONS":
        return _respond(204, None, allow_origin)

    if not path.endswith(COUNTER_PATH):
        return _respond(404, {"error": "route not found"}, allow_origin)

    if method not in SUPPORTED_METHODS:
        return _respond(405, {"error": "method not allowed"}, allow_origin)

    try:
        count = _increment(counter_id) if method == "POST" else _read(counter_id)
    except (ClientError, BotoCoreError) as exc:
        LOGGER.exception(
            json.dumps(
                {
                    "message": "dynamodb call failed",
                    "requestId": request_id,
                    "error": str(exc),
                }
            )
        )
        return _respond(500, {"error": "counter unavailable"}, allow_origin)

    LOGGER.info(
        json.dumps(
            {
                "message": "counter served",
                "requestId": request_id,
                "method": method,
                "count": count,
            }
        )
    )
    return _respond(
        200,
        {"count": count, "counterId": counter_id, "mutated": method == "POST"},
        allow_origin,
    )
