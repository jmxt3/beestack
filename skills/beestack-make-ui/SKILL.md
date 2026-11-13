---
name: "BeeStack Make UI"
description: "Build and serve an authenticated custom web UI that wakes an OpenBot agent via signed Signal webhook, OpenBot Vault secret storage, and Tailscale private networking."
---

# BeeStack Make UI

Build custom web UIs for OpenBot agents using **Signed Signal Webhook + OpenBot Vault + Tailscale ONLY**. Do not use Local Scripts API or inline preview/render modes for persistent UIs—always use the relay architecture defined in [openbot-webhook-spec.md](references/openbot-webhook-spec.md) and [webhook-relay-server.mjs](scripts/webhook-relay-server.mjs).

## End-to-End Workflow

### 1. Create the Webhook Routine
Call `create_webhook_routine` on the target agent (or `update_webhook_routine` if updating an existing UI trigger) with a clear event type (default `ui.action`) and concise wake instruction.

Ask the user to copy the **public Signal webhook URL** from OpenBot's routine details and provide it (never fabricate a webhook URL).

### 2. Store the Signing Secret in OpenBot Vault
Call `request_api_key` so the user stores the webhook signing secret directly inside OpenBot Vault:
- Never ask the user to paste the raw secret in chat.
- Never write the secret into `.env`, source files, or logs.

Then call `list_api_keys` to locate the stored Vault secret file path on disk (pass that path as `--secret-file`).

### 3. Build the Static UI & Start the Relay Server
Place the static UI (`index.html`, JS, CSS) in a dedicated directory (`--ui-dir`). The browser UI posts actions to its own origin `POST /api/wake` so the signing secret never touches client-side JavaScript.

Launch [webhook-relay-server.mjs](scripts/webhook-relay-server.mjs) bound to `0.0.0.0:<port>`:

```bash
node scripts/webhook-relay-server.mjs \
  --url "<public-signal-webhook-url>" \
  --secret-file "<vault-secret-file-path>" \
  --event-type "ui.action" \
  --ui-dir "<path-to-ui-dir>" \
  --port 8787 \
  --host 0.0.0.0 \
  --fallback-log "<path-to-failed-wakes.jsonl>"
```

### 4. Verify Tailscale Node & Private URL
Reuse an already online Tailscale node rather than exposing ports on public `0.0.0.0` firewalls. Run the OS-appropriate commands to confirm Tailscale is up and grab the tailnet IPv4:

**Windows (PowerShell):**
```powershell
tailscale status
$tsIp = (tailscale ip -4 | Select-Object -First 1).Trim()
Write-Output "http://${tsIp}:8787/"
```

**Linux (bash):**
```bash
tailscale status
TS_IP=$(tailscale ip -4 | head -n 1)
echo "http://${TS_IP}:8787/"
```

Verify `/healthz` locally or over Tailscale returns `200 {"ok":true}`.

### 5. Send 1 Harmless Probe Before Declaring Live
Before telling the user the UI is live, send exactly **one** harmless probe to `POST /api/wake` and verify the upstream Signal webhook accepts it with HTTP `202` (relay returns HTTP `200` with `"status":202`):

```bash
curl -sS -X POST "http://127.0.0.1:8787/api/wake" \
  -H "Content-Type: application/json" \
  -d '{"action":"probe","dryRun":true}'
```

Expected response:
```json
{"ok":true,"status":202,"deliveryId":"ui-..."}
```

If the probe returns `502` or a non-`202` upstream status, inspect the relay status and fallback JSONL log (which omits secrets), fix the URL/event-type/secret-file mismatch, and confirm a clean `202` probe before announcing success.
