# OpenBot Signal Webhook Specification

Reference contract for waking OpenBot agents from a custom web UI via signed Signal webhooks, OpenBot Vault secrets, and Tailscale private networking.

## 1. HTTP Request Contract

- **Method**: `POST`
- **Target**: Public Signal webhook URL created by `create_webhook_routine`
- **Headers**:
  - `Content-Type: application/json`
  - `X-OpenBot-Timestamp`: Unix epoch seconds as a decimal string (e.g. `"1762992000"`)
  - `X-OpenBot-Delivery-Id`: Unique delivery ID string (e.g. `"ui-<uuid>"`)
  - `X-OpenBot-Signature`: `"sha256=" + hmacSha256Hex(secret, canonicalInput)`

### Canonical Signing String

Compute the HMAC-SHA256 hex digest over the exact UTF-8 string:

```text
${timestampSeconds}.${deliveryId}.${rawBody}
```

Prefix the lowercase hex digest with `sha256=`. Never modify `rawBody` after signing.

### JSON Payload Schema

```json
{
  "type": "ui.action",
  "occurredAt": "2026-11-13T03:45:00.000Z",
  "data": {
    "action": "probe",
    "source": "tailscale-ui"
  }
}
```

- `type`: Event identifier matching the webhook routine's expected event type (default `"ui.action"`).
- `occurredAt`: ISO-8601 UTC timestamp.
- `data`: Arbitrary JSON payload bounded to `<= 65536` bytes total request body.

## 2. Upstream Responses & Single-Attempt Policy

- **`200` or `202`**: Accepted by OpenBot Signal. Relay returns HTTP `200` `{ "ok": true, "status": <upstreamStatus>, "deliveryId": "..." }`.
- **Non-2xx (`503`, `4xx`, `5xx`) or network timeout**: Make **1 attempt only** (no automatic retry loop). If `fallbackLogPath` is configured, append one JSONL line containing `{ deliveryId, occurredAt, eventType, data, error }` and return HTTP `502` `{ "ok": false, "logged": true, "deliveryId": "...", "status": <upstreamStatusOrZero> }`.
- **Secret Hygiene**: Never log, print, echo, or return the signing secret or HMAC signature in HTTP responses or fallback JSONL files.

## 3. Relay Endpoints (`scripts/webhook-relay-server.mjs`)

- `GET /healthz` -> `200` `{"ok":true}`
- `GET /` and `GET /<asset>` -> Serves static files from `--ui-dir`, strictly resolving paths inside `uiDir` and rejecting `..`, backslashes, null bytes, or escaping symlinks with `403`/`400`.
- `POST /api/wake` -> Rejects bodies `> 65536` bytes with `413`, reads the signing secret from `--secret-file` (trimmed UTF-8), signs, and forwards once to the OpenBot Signal webhook URL.
