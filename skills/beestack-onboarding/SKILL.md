---
name: "BeeStack Onboarding"
description: "First-run onboarding for Dr. BeeBot: verify all 10 local BeeStack skills and healthcheck routines in America/Sao_Paulo, save owner preferences, and offer a fleet routine checkup."
---

# BeeStack Onboarding

Run on Dr. BeeBot's first run (or when asked to re-verify setup). Keep replies short and action-first.

## Step 1 — Verify the 10-Skill Local Library

Call `list_local_skills` and confirm all 10 canonical BeeStack slugs exist:

- **7 enabled on Dr. BeeBot**:
  1. `beestack-onboarding`
  2. `beestack-agent-designer`
  3. `beestack-make-ui`
  4. `transcript-healthcheck`
  5. `routine-healthcheck`
  6. `beestack-teamwork`
  7. `beestack-mode`
- **3 library-only (attached to Dr. BeeBot with `set_skill_enabled(..., false)`)**:
  8. `beestack-architect`
  9. `beestack-verify`
  10. `beestack-unslop`

Retention rule: `create_skill` registers and installs a skill; `uninstall_skill` on the last copy deletes it from the library. Never uninstall the 3 library skills from Dr. BeeBot—keep them attached with `set_skill_enabled` set to `false` so `install_local_skill` can equip new coding agents.

If any slug is missing, stage from `C:\Users\jmach\dev\beestack\skills\<slug>`, call `create_skill` (or `revise_skill`), and enforce the 7-enabled / 3-disabled split via `set_skill_enabled`.

## Step 2 — Verify Fleet Healthcheck Routines

Call `list_routines` on Dr. BeeBot and ensure both routines exist in `America/Sao_Paulo`:

1. `transcript-healthcheck` — `active: true`, `{ "kind": "weekdays", "time": "08:44" }`
2. `routine-healthcheck` — `active: true`, `{ "kind": "weekly", "weekday": 1, "time": "08:49" }`

Create or fix any missing/drifted routine via `create_routine` / `update_routine`, then re-read with `list_routines`.

## Step 3 — Optional Repo Verification Skill

If the current workspace is a real repo (`.git`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`) and `list_local_skills` has no `verify-<repo>`, offer or run `beestack-verify` to register `verify-<repo>` via `create_skill`. Skip otherwise.

## Step 4 — Capture Owner Preferences

Check `search_memories` first. Ask only for missing defaults via `ask_user` (max 2–3 questions), then save via `remember` (`<= 500` chars each):
- **Timezone** (default `America/Sao_Paulo`)
- **Voice** (default casual lowercase mad-scientist)
- **Container sandbox rules** (`docker exec <container> bash -lc "..."`, non-interactive flags, written target authorization, zero sensitive host mounts)

## Step 5 — One-Time Fleet Checkup Offer

Check `search_memories` to avoid repeating. If not yet offered, save a memory that it was offered (`remember`) and ask once:

> want a checkup of every agent's routines?

Run `Routine Healthcheck` across `list_agents` + `list_routines` only if the user says yes, without editing another agent's routines until approved.
