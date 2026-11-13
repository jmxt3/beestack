# BeeStack

**BeeStack** pairs **Dr. BeeBot** (`dr-beebot`) with **10 concise OpenBot-native skills** adapted from `pstack` (Lauren Tan) and the Dr. Eggbot archetype—plus a zero-dependency Node.js CLI, contract validator, and signed Tailscale webhook UI relay.

## Architecture

- **Dr. BeeBot (`agent/dr-beebot-profile.json`):** Casual mad-scientist agent designer & fleet hygienist (`America/Sao_Paulo`). Builds Coding, Non-Coding, and Container-Sandboxed agents, creates signed webhook UIs, and runs quiet fleet checkups.
- **10-Skill Shared Library (`skills/`):**
  - **7 Enabled on Dr. BeeBot:** `beestack-onboarding`, `beestack-agent-designer`, `beestack-make-ui`, `transcript-healthcheck`, `routine-healthcheck`, `beestack-teamwork`, `beestack-mode`.
  - **3 Library-Disabled on Dr. BeeBot (`set_skill_enabled(..., false)`):** `beestack-architect`, `beestack-verify`, `beestack-unslop`.
  - *Why disabled instead of uninstalled?* In OpenBot, `uninstall_skill` on the last installed copy withdraws a skill from `list_local_skills`. Keeping the 3 specialist coding skills disabled on Dr. BeeBot keeps its prompt lean while preserving all 10 for `install_local_skill` onto new agents.
- **2 Quiet Healthchecks (`America/Sao_Paulo`):** `transcript-healthcheck` (weekdays `08:44`) and `routine-healthcheck` (Mondays `08:49`) call `routine_no_update` when clean and wait for user approval before creating or editing anything.
- **Zero-Dependency Tooling (`scripts/`, `tests/`):** Node.js `>=18` ESM using only built-in modules.

## 1-Paste Quickstart

Paste into any **OpenBot Desktop** chat:

```text
Read C:\Users\jmach\dev\beestack\BOOTSTRAP.md and run the BeeStack bootstrap.
```

See [BOOTSTRAP.md](BOOTSTRAP.md) for the exact steps executed.

## CLI (`scripts/beestack-cli.mjs`)

```bash
npm run validate          # Validate root files, profile JSON, avatar PNG, 10 skills & links
npm test                  # Run node:test suite (validator, negative cases, webhook relay, doctor)
npm run doctor            # Check repo + OpenBot data dir, CLI, and Local scripts status
npm run bootstrap         # Run BOOTSTRAP.md via OpenBot CLI (requires Permissions -> Local scripts)
npm run sync              # Tell Dr. BeeBot to restage skills/ and call revise_skill/create_skill
```

## All 10 Skills

| Slug | Name | Focus | State on Dr. BeeBot |
| --- | --- | --- | --- |
| `beestack-onboarding` | BeeStack Onboarding | First-run checkup, `remember` prefs, checkup offer | Enabled |
| `beestack-agent-designer` | BeeStack Agent Designer | 4-field intake, 3 archetypes, `read_agent` check | Enabled |
| `beestack-make-ui` | BeeStack Make UI | Signed webhook + OpenBot Vault + Tailscale UI | Enabled |
| `transcript-healthcheck` | Transcript Healthcheck | Weekday `08:44` fleet friction scan via `send_message` | Enabled |
| `routine-healthcheck` | Routine Healthcheck | Monday `08:49` routine & webhook waste audit | Enabled |
| `beestack-teamwork` | BeeStack Teamwork | Single-owner handoffs, `send_to_channel`, stop receipts | Enabled |
| `beestack-mode` | BeeStack Mode | Front-door pure-`pstack` router, 24 principles, 8 playbooks | Enabled |
| `beestack-architect` | BeeStack Architect | Data shapes, statecharts, blast radius, interrogation, arena | Library (disabled) |
| `beestack-verify` | BeeStack Verify | Repo test/UI inspection + `verify-<repo>` skill builder | Library (disabled) |
| `beestack-unslop` | BeeStack Unslop | Prose conciseness, `no-comments` hygiene, dead-shim removal | Library (disabled) |

## Webhook UI & Container Pattern

- **`beestack-make-ui`:** `create_webhook_routine` → `request_api_key` (Vault) → `list_api_keys` → [webhook-relay-server.mjs](skills/beestack-make-ui/scripts/webhook-relay-server.mjs) bound to `0.0.0.0:<port>` signing `X-OpenBot-Signature: sha256=...` → `tailscale status` / `tailscale ip -4` → `202` probe.
- **Container-Sandboxed Agents (e.g., `blackarch`):** All commands run through `docker exec <container> bash -lc "..."` with non-interactive flags, explicit written target authorization, zero sensitive host mounts, and workspace `AGENTS.md`.

## License

[MIT](LICENSE) — see [NOTICE.md](NOTICE.md) for attributions to `pstack` and OpenBot.
