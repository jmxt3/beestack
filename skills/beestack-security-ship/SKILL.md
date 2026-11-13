---
name: "BeeStack Security & Ship"
description: "Boundary threat modeling and pre-merge shipping gate covering untrusted inputs, auth, OpenBot Vault secrets, docker exec injection, webhook HMAC validation, SSRF, path traversal, and retro."
---

# BeeStack Security & Ship

Two-stage release discipline for OpenBot coding agents:
1. **Boundary Threat Model**: audit every untrusted boundary and rank concrete findings.
2. **Pre-Merge Ship & Retro Gate**: verify runtime proof, cleanliness, rollback safety, and encoded lessons before merging or declaring live.

---

## Stage 1: Boundary Threat Model

Inspect every boundary the change introduces or touches:

1. **Untrusted Inputs & Resource Bounds**
   - Enforce body size caps (e.g., 64 KB / `413` on webhook payloads), strict JSON/field parsing, schema/type validation, and bounded timeouts (`AbortSignal.timeout`).
   - Never trust filenames, headers, query parameters, or LLM-generated parameters without validation.
2. **Auth & Authorization**
   - Verify authentication and scope checks on every non-health endpoint, routine trigger, or privileged action.
   - Fail closed: missing/invalid credentials or unverified callers must deny access (`401`/`403`), never fall through to default access.
3. **OpenBot Vault & Secrets Hygiene**
   - Store and read API keys/signing secrets exclusively through OpenBot Vault (`request_api_key`, `list_api_keys`, or vault secret file paths).
   - Never hardcode secrets, commit `.env` files, echo secrets in chat, include secrets in URLs/query strings, or write them into fallback logs, error messages, or `remember` notes.
4. **`docker exec` & Command Injection**
   - Never concatenate untrusted variables into `bash -lc "..."` or `shell: true` commands.
   - Pass arguments as discrete arrays (`execFile` / `spawn` with `shell: false`), validate inputs against strict allowlists, mount zero sensitive host paths into sandboxes, and enforce explicit written target authorization for security scanning/testing tools.
5. **Webhook HMAC Validation**
   - Verify `X-OpenBot-Signature` (`sha256=<hex>`) computed over `${X-OpenBot-Timestamp}.${X-OpenBot-Delivery-Id}.${rawBody}` using the exact raw request bytes before parsing JSON.
   - Compare signatures with constant-time comparison (`crypto.timingSafeEqual` on equal-length buffers).
   - Enforce timestamp freshness window (reject stale replays) and track `X-OpenBot-Delivery-Id` for idempotency when side effects are non-idempotent.
6. **SSRF & Path Traversal**
   - **SSRF**: When accepting target URLs, allow only `https:`/`http:` as required, resolve DNS and block loopback (`127.0.0.0/8`, `::1`), private RFC1918/ULA ranges, link-local/cloud metadata (`169.254.169.254`), and unsafe redirects.
   - **Path Traversal**: When serving or reading files under a root directory, decode safely (reject `%00` / malformed sequences), resolve canonical path (`path.resolve`), verify it stays strictly within `resolvedRoot + path.sep` (or equals `index.html`), and reject symlinks escaping the root.

### Finding Severity & Format

Rank every issue honestly. Every finding MUST specify **Severity**, **Location**, **Concrete Trigger**, and **Smallest Fix**:

| Severity | Bar | Action |
| --- | --- | --- |
| **Blocker** | Exploitable secret leak, auth bypass, shell/`docker exec` RCE, missing/broken HMAC check, path traversal, SSRF, or irreversible data loss | Must fix and re-verify before shipping |
| **High** | Missing payload/timeout cap, weak input validation, replay window missing, unsafe error detail leakage | Fix before merge unless explicitly accepted by user |
| **Medium** | Defense-in-depth gap, partial logging hygiene issue, coarse permissions | Fix if cheap, otherwise track cleanly |
| **Low** | Minor hardening or clarity improvement | Optional polish |

Format:
`- [Blocker] path/to/file.mjs:42 — Trigger: GET /..%2fsecret reads parent dir — Fix: resolve target path and require target.startsWith(rootDir + path.sep).`

---

## Stage 2: Pre-Merge Ship & Retro Gate

Do not declare ready to ship until all checks pass after the **final** edit:

1. **Security Bar**: `0` Blocker findings; Highs resolved or explicitly signed off.
2. **Clean Diff (`beestack-unslop`)**: No debug logs, dead code, unrequested shims, `.env` files, symlinks, or secret values anywhere in repo or fallback logs.
3. **Runtime Proof (`beestack-verify` / `verify-<repo>`)**: Full test suite, validator, linter, CLI probes, and live `openbot_browser` / `html_preview` checks (when UI changed) passed on final state.
4. **Operational & Autonomy Safety**:
   - Operations are idempotent where retried.
   - Rollback or recovery path is clear.
   - Pause and get explicit user approval before force-pushes, production deploys, public releases, or external webhook/message broadcasts.
5. **Post-Ship Retro (3 lines)**:
   - What slowed down the change or slipped past early checks?
   - Which invariant, test, or check caught (or would have caught) it?
   - Encode durable fixes into tests, `verify-<repo>` (`revise_skill`), or `remember` (<= 500 chars) so the next run starts smarter.
