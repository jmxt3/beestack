# BeeStack

**BeeStack** is an OpenBot-native agent suite pairing **Dr. BeeBot** (`dr-beebot`) with **12 focused skills** adapted from `pstack` (Lauren Tan), `gstack` (Garry Tan), and OpenBot's Dr. Eggbot archetype—plus a zero-dependency Node.js CLI, repository validator, and signed Tailscale webhook UI relay.

## Architecture

- **Dr. BeeBot (`agent/dr-beebot-profile.json`)**: Casual mad-scientist agent designer & fleet hygienist (`America/Sao_Paulo`). Designs Coding, Non-Coding, and Container-Sandboxed agents; builds signed webhook UIs; and runs quiet weekday/weekly healthchecks.
- **Shared 12-Skill Library (`skills/`)**:
  - **7 Core Skills (enabled on Dr. BeeBot):** `beestack-onboarding`, `beestack-agent-designer`, `beestack-make-ui`, `transcript-healthcheck`, `routine-healthcheck`, `beestack-teamwork`, `beestack-mode`.
  - **5 Specialist Role Skills (installed on Dr. BeeBot with `set_skill_enabled(..., false)`):** `beestack-verify`, `beestack-unslop`, `beestack-ceo-review`, `beestack-arch-review`, `beestack-security-ship`.
  - *Why disabled instead of uninstalled?* In OpenBot, `create_skill` registers a skill in the shared library and installs it on the calling agent; calling `uninstall_skill` on the last installed copy withdraws it from `list_local_skills`. Keeping the 5 specialist skills installed-but-disabled keeps Dr. BeeBot's prompt lean while preserving all 12 for `install_local_skill` onto newly created agents.
- **2 Quiet Healthcheck Routines:**
  - `transcript-healthcheck` (weekdays `08:44` `America/Sao_Paulo`): polls active agents via `send_message` and audits Dr. BeeBot's recent chat for friction, proposing new/revised skills, routines, or agents only when actionable.
  - `routine-healthcheck` (Mondays `08:49` `America/Sao_Paulo`): audits `list_agents` + `list_routines` for token waste (`<60m` polling, long-chat sweeps, missing `routine_no_update`, dead/duplicate jobs).
- **Tooling (`scripts/`, `tests/`)**: Node.js `>=18` ESM with zero external runtime dependencies.

## 1-Paste Quickstart (`BOOTSTRAP.md`)

Open any chat in **OpenBot Desktop** and paste:

```text
Read C:\Users\jmach\dev\beestack\BOOTSTRAP.md and run the BeeStack bootstrap.
```

That runbook stages the 12 skills and `agent/dr-beebot-avatar.png` into the agent workspace, registers/updates all 12 local skills, creates or updates `Dr. BeeBot`, wires the 7 enabled + 5 disabled-library skills, configures both active healthchecks, verifies live state via `read_agent` + `list_local_skills` + `list_routines`, and removes the temporary staging folder.

## CLI Usage (`scripts/beestack-cli.mjs`)

```bash
npm run validate          # Validate repo structure, profile JSON, avatar PNG, 12 skills & links
npm test                  # Run node:test suite (validator, negative cases, webhook relay, doctor)
npm run doctor            # Check repo validity + OpenBot Desktop data dir, CLI, and Local scripts status
npm run bootstrap         # Pipe BOOTSTRAP.md runbook into OpenBot CLI (requires Permissions -> Local scripts)
npm run sync              # Tell Dr. BeeBot to re-stage skills/ and call create_skill / revise_skill
```

Direct CLI flags:

```bash
node scripts/beestack-cli.mjs doctor --json
node scripts/beestack-cli.mjs bootstrap --agent "Dr. BeeBot" --dry-run
node scripts/beestack-cli.mjs sync --agent "Dr. BeeBot" --dry-run
```

If OpenBot Desktop's **Permissions → Local scripts** is disabled, `doctor` still exits `0` when repo validation passes and prints the 1-paste `BOOTSTRAP.md` prompt; `bootstrap` and `sync` exit `5` with clear instructions instead of failing silently.

## All 12 Skills

| Slug | Name | Role | State on Dr. BeeBot |
| --- | --- | --- | --- |
| `beestack-onboarding` | BeeStack Onboarding | First-run checkup, owner `remember` prefs, checkup offer | Enabled |
| `beestack-agent-designer` | BeeStack Agent Designer | 4-field persona intake, 3 archetypes, live `read_agent` verification | Enabled |
| `beestack-make-ui` | BeeStack Make UI | Signed webhook routine + OpenBot Vault + Tailscale relay UI | Enabled |
| `transcript-healthcheck` | Transcript Healthcheck | Weekday `08:44` fleet friction scan via `send_message` | Enabled |
| `routine-healthcheck` | Routine Healthcheck | Monday `08:49` routine/webhook token-waste audit | Enabled |
| `beestack-teamwork` | BeeStack Teamwork | Single-owner handoffs, structured `send_message`, `interrupt_agent` | Enabled |
| `beestack-mode` | BeeStack Mode | Front-door engineering router, 22 principles, 7 playbooks | Enabled |
| `beestack-verify` | BeeStack Verify | Repo test/UI inspection + `verify-<repo>` local skill builder | Library (disabled) |
| `beestack-unslop` | BeeStack Unslop | Prose, comment hygiene, and dead-shim removal | Library (disabled) |
| `beestack-ceo-review` | BeeStack CEO Review | Premise challenge, 10-star vs 1-day MVP, non-goals, kill criteria | Library (disabled) |
| `beestack-arch-review` | BeeStack Arch Review | Data shapes, state machines, blast radius, failure interrogation | Library (disabled) |
| `beestack-security-ship` | BeeStack Security & Ship | Boundary threat model (Vault, `docker exec`, HMAC, SSRF) + ship gate | Library (disabled) |

## `beestack-make-ui`: Webhook + Vault + Tailscale Workflow

`beestack-make-ui` builds control UIs without Local Scripts API or `html_render` modes:

1. `create_webhook_routine` provisions a public Signal webhook URL on the target agent.
2. `request_api_key` stores the webhook signing secret safely inside **OpenBot Vault** (never pasted in chat or logged).
3. `list_api_keys` locates the secret file path passed to `--secret-file`.
4. `skills/beestack-make-ui/scripts/webhook-relay-server.mjs` serves the UI and signs `POST /api/wake` payloads (`X-OpenBot-Timestamp`, `X-OpenBot-Delivery-Id`, `X-OpenBot-Signature: sha256=...`) bound to `0.0.0.0:<port>`.
5. `tailscale status` / `tailscale ip -4` exposes the node privately on your tailnet.
6. One harmless probe verifies an HTTP `202` wake before declaring the UI live; upstream failures log a redacted JSONL entry without the secret.

## Container-Sandboxed Agent Pattern

For isolated toolchains (such as `blackarch`), `beestack-agent-designer` wires:

- Execution strictly through `docker exec <container> bash -lc "..."`
- Non-interactive CLI flags (`--batch`, `-q`, `--no-input`)
- Explicit written target authorization gate before active runs
- Zero sensitive host mounts + workspace `AGENTS.md` cataloging available container tools

## Healthchecks & Quiet Discipline

- `transcript-healthcheck` (weekdays `08:44` `America/Sao_Paulo`) and `routine-healthcheck` (Mondays `08:49` `America/Sao_Paulo`) both call `routine_no_update` with no message whenever the fleet is clean.
- Neither healthcheck creates, edits, or deletes another agent's skills or routines without explicit user selection/approval.

## License & Attribution

Licensed under the [MIT License](LICENSE). See [NOTICE.md](NOTICE.md) for upstream attributions to `pstack`, `gstack`, and OpenBot.
