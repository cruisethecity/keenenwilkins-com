---
title: Read then write is a bug. Atomic counters in DynamoDB
date: 2026-08-24
category: Architecture
summary: The obvious way to build a visitor counter loses counts the moment two people load the page at once. One DynamoDB update expression fixes it, and the fix costs half as much as the broken version.
tags: [DynamoDB, Lambda, Python, boto3]
---

Here is the visitor counter almost every tutorial ships:

```python
item = table.get_item(Key={"counter_id": "site_total"})
current = int(item["Item"]["visit_count"])
table.put_item(Item={"counter_id": "site_total", "visit_count": current + 1})
```

Read the number, add one, write it back. It works perfectly right up until two requests overlap.

## The race

Two visitors land within the same few milliseconds. Lambda scales out, so these are two separate execution environments running at the same time.

1. Invocation A reads 41.
2. Invocation B reads 41.
3. Invocation A writes 42.
4. Invocation B writes 42.

Two visits, one increment. The count is now permanently wrong and nothing in your logs looks like an error, because nothing failed. Both writes succeeded. Under bursty traffic, say the hour after you post the site on LinkedIn, this quietly eats a real fraction of the total.

You cannot fix this with retries or a longer timeout. The window is inherent to doing the arithmetic on the client side.

## The fix is one call

DynamoDB can do the arithmetic itself, inside the storage layer, as a single atomic operation:

```python
result = table.update_item(
    Key={"counter_id": "site_total"},
    UpdateExpression="ADD visit_count :one SET last_seen_at = :now",
    ExpressionAttributeValues={":one": Decimal(1), ":now": timestamp},
    ReturnValues="UPDATED_NEW",
)
count = int(result["Attributes"]["visit_count"])
```

`ADD` is evaluated server side against whatever the current value is at the moment the write is applied. Concurrent invocations are serialized on the item by DynamoDB, so two overlapping calls return 42 and 43. No lost update is possible, and there is no lock to manage.

Three details in that snippet earn their place.

`ADD` on an attribute that does not exist yet creates it and sets it to the increment. That means there is no seed step, no first run special case, and no `if not exists` branch. The table can be completely empty and the first request returns 1.

`ReturnValues="UPDATED_NEW"` hands back the value that was actually written. Doing a second `get_item` to find out what the number became would reintroduce the exact race you just eliminated, one step later.

`Decimal(1)` rather than `1` because DynamoDB numbers are arbitrary precision and boto3 refuses to serialize a Python float. An integer literal works, but being explicit about Decimal is what keeps the code correct the day someone changes the increment.

## It is also cheaper

The broken version is two requests: one read, one write. The correct version is one write. On demand pricing bills per request, so the safe implementation costs less than the unsafe one. That is unusual and worth saying out loud, because the reflex is to assume correctness costs money.

## Do not increment on a read

The API exposes two verbs on the same path.

`POST /visits` increments and returns the new value. `GET /visits` returns the current value and mutates nothing.

The frontend sends `POST` once per browser session and `GET` after that, guarded by a session storage flag. Without that guard the number inflates every time someone refreshes, or every time a bot crawls the page, and the counter stops measuring anything.

The React side has one extra trap. StrictMode in development mounts effects twice, so a bare `fetch` in an effect double counts every local page load. A ref guard in the hook plus the session flag handles both:

```javascript
const hasRequested = useRef(false);

useEffect(() => {
  if (hasRequested.current) return;
  hasRequested.current = true;
  load();
}, [load]);
```

## Proving it with moto

The interesting property here is not that the happy path works. It is that repeated calls actually accumulate. That is one test:

```python
def test_post_increments_atomically_across_calls(handler):
    for expected in (1, 2, 3, 4, 5):
        response = handler.lambda_handler(build_event("POST"), FakeContext())
        assert body_of(response)["count"] == expected
```

With `moto` mocking DynamoDB, this runs in under a second on every push and never touches an AWS account. The read only test matters just as much:

```python
def test_get_reads_without_mutating(handler):
    handler.lambda_handler(build_event("POST"), FakeContext())
    handler.lambda_handler(build_event("POST"), FakeContext())

    first = handler.lambda_handler(build_event("GET"), FakeContext())
    second = handler.lambda_handler(build_event("GET"), FakeContext())

    assert body_of(first)["count"] == 2
    assert body_of(second)["count"] == 2
```

If someone later refactors the read path into the write path, that test fails immediately instead of silently inflating the number for a month.

## The part I got wrong first

My first version configured CORS in two places: a `cors_configuration` block on the API Gateway HTTP API, and headers in the Lambda response. The browser rejected every request with a message about a duplicated `Access-Control-Allow-Origin` header, and I spent a while assuming the Lambda was at fault.

API Gateway injects its own CORS headers when that block is present, and it also answers preflight requests itself before the function ever runs. Pick one layer. This stack picks the Lambda, because the allowlist logic there can refuse an unknown origin with a 403 instead of quietly declining to add a header.
