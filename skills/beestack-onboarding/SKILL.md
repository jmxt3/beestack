---
name: "BeeStack Onboarding"
description: "First-run onboarding for Dr. BeeBot: verify all 12 local BeeStack skills and healthcheck routines in America/Sao_Paulo, save owner preferences, and offer a fleet routine checkup."
---

# BeeStack Onboarding

Run this workflow on Dr. BeeBot's first run (or whenever the owner asks to re-verify BeeStack setup). Keep output concise and action-first.

## Step 1 — Verify the 12-Skill Local Library

Call `list_local_skills` and confirm all 12 canonical BeeStack slugs are registered in OpenBot's shared local-skills library:

- **7 core skills (enabled on Dr. BeeBot)**:
  1. `beestack-onboarding`
  2. `beestack-agent-designer`
  3. `beestack-make-ui`
  4. `transcript-healthcheck`
  5. `routine-healthcheck`
  6. `beestack-teamwork`
  7. `beestack-mode`
- **5 specialist role skills (registered in library, disabled on Dr. BeeBot via `set_skill_enabled(..., false)` to keep prompt lean)**:
  8. `beestack-verify`
  9. `beestack-unslop`
  10. `beestack-ceo-review`
  11. `beestack-arch-review`
  12. `beestack-security-ship`

Important OpenBot retention rule: `create_skill` registers a skill in the shared local library and installs it on the calling agent; uninstalling the last copy removes it from the library. Never uninstall the 5 specialist role skills from Dr. BeeBot—keep them attached with `set_skill_enabled` set to `false` so `install_local_skill` can attach them to newly created agents.

If any of the 12 slugs are missing from `list_local_skills`, stage from `C:\Users\jmach\dev\beestack\skills\<slug>` and register with `create_skill` (or `revise_skill` if outdated), then enforce the 7-enabled / 5-disabled split with `set_skill_enabled`.

## Step 2 — Verify Fleet Healthcheck Routines

Call `list_routines` on Dr. BeeBot and verify both active healthchecks exist in timezone `America/Sao_Paulo`:

1. `transcript-healthcheck`
   - `active`: `true`
   - `timezone`: `"America/Sao_Paulo"`
   - `schedule`: `{ "kind": "weekdays", "time": "08:44" }`
   - Instruction: run `Transcript Healthcheck` since the last successful run, remain silent via `routine_no_update` when clean, and never create or edit until the user picks.
2. `routine-healthcheck`
   - `active`: `true`
   - `timezone`: `"America/Sao_Paulo"`
   - `schedule`: `{ "kind": "weekly", "weekday": 1, "time": "08:49" }`
   - Instruction: run `Routine Healthcheck` across all agents via `list_agents` and `list_routines`, remain silent via `routine_no_update` when clean, and never edit another agent's routines without approval.

If either routine is missing or misconfigured, create or fix it with `create_routine` / `update_routine`, then re-run `list_routines` to confirm live state.

## Step 3 — Optional Repo Verification Bootstrap

Check if the current workspace contains a real software repository (for example `.git`, `package.json`, `pyproject.toml`, `Cargo.toml`, or `go.mod`).
- Call `list_local_skills` to check whether a repo-specific `verify-<repo>` skill already exists.
- If a real repo is present AND no `verify-<repo>` skill exists yet, offer or run `beestack-verify` (via `read_local_skill` or on a coding agent) to inspect test/build/UI entrypoints and create `verify-<repo>` with `create_skill`.
- Skip this step if no code repository is open or `verify-<repo>` already exists.

## Step 4 — Capture Durable Owner Preferences

Call `search_memories` first to see what is already stored. Only ask for missing defaults via `ask_user` (at most 2–3 tight questions). Persist durable owner preferences with `remember` (strictly `<= 500` characters per memory entry):

- **Timezone**: default `America/Sao_Paulo` (or owner's confirmed zone).
- **Voice**: default casual lowercase short-form mad-scientist vibe (or owner's preference for new agents).
- **Default container sandbox rules**: e.g. isolated `docker exec <container> bash -lc "..."` pattern, non-interactive flags, explicit written target authorization gate, and zero sensitive host mounts.

## Step 5 — One-Time Fleet Checkup Offer

Check `search_memories` to confirm you have not already offered the initial fleet checkup. If not offered yet, record that the onboarding offer was made (`remember`, `<= 500` chars) and ask once:

> want a checkup of every agent's routines?

If the user says yes, run `Routine Healthcheck` across all agents (`list_agents` + `list_routines`) and present findings without modifying another agent's routines until approved.
