# BeeStack Bootstrap Runbook

Paste this single line into OpenBot Desktop to install or update Dr. BeeBot and all 12 BeeStack skills idempotently:

```text
Read C:\Users\jmach\dev\beestack\BOOTSTRAP.md and run the BeeStack bootstrap.
```

> Use ONLY real OpenBot built-in tools throughout this runbook (`list_local_skills`, `create_skill`, `revise_skill`, `install_local_skill`, `set_skill_enabled`, `list_agents`, `create_agent`, `read_agent`, `update_profile`, `update_agents`, `list_routines`, `create_routine`, `update_routine`, `remember`, `ask_user`).

---

## Step 1 — Read Source Profile & Stage Assets into Your Workspace

OpenBot's `create_skill`, `revise_skill`, and `avatarPath` require paths relative to your current agent workspace.

1. Read `C:\Users\jmach\dev\beestack\agent\dr-beebot-profile.json` to load the exact `name`, `title`, `category`, `avatarHue`, `timezone`, `description`, `enabledSkills`, `disabledLibrarySkills`, and `routines`.
2. Copy all 12 skill folders and the avatar PNG from `C:\Users\jmach\dev\beestack` into `<agent-workspace>/beestack-staging/`:
   - Copy each `C:\Users\jmach\dev\beestack\skills\<slug>` to `<agent-workspace>/beestack-staging/<slug>` for all 12 canonical slugs:
     - Core enabled (7): `beestack-onboarding`, `beestack-agent-designer`, `beestack-make-ui`, `transcript-healthcheck`, `routine-healthcheck`, `beestack-teamwork`, `beestack-mode`
     - Specialist library (5): `beestack-verify`, `beestack-unslop`, `beestack-ceo-review`, `beestack-arch-review`, `beestack-security-ship`
   - Copy `C:\Users\jmach\dev\beestack\agent\dr-beebot-avatar.png` to `<agent-workspace>/beestack-staging/dr-beebot-avatar.png`.

On Windows PowerShell (from inside your agent workspace):

```powershell
$src = "C:\Users\jmach\dev\beestack"
$dst = ".\beestack-staging"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Get-ChildItem -Directory "$src\skills" | ForEach-Object {
  Copy-Item -Recurse -Force $_.FullName (Join-Path $dst $_.Name)
}
Copy-Item -Force "$src\agent\dr-beebot-avatar.png" (Join-Path $dst "dr-beebot-avatar.png")
```

## Step 2 — Register or Update All 12 Skills in the Local Library

1. Call `list_local_skills` to inspect existing local skills.
2. For each of the 12 slugs:
   - If the slug is **not** in `list_local_skills`, call `create_skill` pointing to `beestack-staging/<slug>`.
   - If the slug **is** already in `list_local_skills`, call `revise_skill` pointing to `beestack-staging/<slug>`.

> **OpenBot Local Skill Retention Rule:** `create_skill` registers a skill in OpenBot's shared local-skills library AND installs it on the calling agent. Uninstalling the **last** installed copy of a skill withdraws it from the library. Never uninstall a library skill from Dr. BeeBot—use `set_skill_enabled` with `enabled: false` instead.

## Step 3 — Create or Update Dr. BeeBot

1. Call `list_agents` to check if `Dr. BeeBot` already exists.
2. **If you ARE already `Dr. BeeBot`:**
   - Call `update_profile` with:
     - `name`: `"Dr. BeeBot"`
     - `title`: `"Designs focused OpenBot agents, skills, routines, and webhook UIs"`
     - `category`: `"automation"`
     - `avatarHue`: `55`
     - `avatarPath`: `"beestack-staging/dr-beebot-avatar.png"`
     - `timezone`: `"America/Sao_Paulo"`
     - `description`: exact `description` string from `agent/dr-beebot-profile.json`
3. **If `Dr. BeeBot` exists as another agent:**
   - Call `update_agents` (or ask `Dr. BeeBot` via `send_message` to call `update_profile`) with the exact profile fields above.
4. **If `Dr. BeeBot` does NOT exist yet:**
   - Call `create_agent` with the exact fields above (`name`, `title`, `category`, `avatarHue: 55`, `avatarPath: "beestack-staging/dr-beebot-avatar.png"`, `timezone: "America/Sao_Paulo"`, and `description` from `agent/dr-beebot-profile.json`).

## Step 4 — Wire the 7 Core Skills & 5 Disabled Library Skills on Dr. BeeBot

1. Install all 12 skills onto `Dr. BeeBot` via `install_local_skill` (skipping any already installed on `Dr. BeeBot`).
2. Ensure the **7 core skills** are enabled (`set_skill_enabled(..., true)`):
   - `beestack-onboarding`
   - `beestack-agent-designer`
   - `beestack-make-ui`
   - `transcript-healthcheck`
   - `routine-healthcheck`
   - `beestack-teamwork`
   - `beestack-mode`
3. Ensure the **5 specialist role skills** are installed on `Dr. BeeBot` with `set_skill_enabled(..., false)` so Dr. BeeBot's system prompt stays lean while all 12 remain in `list_local_skills` for `install_local_skill` onto newly created agents:
   - `beestack-verify`
   - `beestack-unslop`
   - `beestack-ceo-review`
   - `beestack-arch-review`
   - `beestack-security-ship`

*(If you ran Steps 1–2 from a temporary helper agent rather than Dr. BeeBot itself, verify via `read_agent` that Dr. BeeBot holds all 12 skills before modifying your own agent's installed skills.)*

## Step 5 — Configure the 2 Healthcheck Routines on Dr. BeeBot

Call `list_routines` for `Dr. BeeBot`. For each routine in `agent/dr-beebot-profile.json`, call `create_routine` if missing or `update_routine` if it already exists with drifted fields:

1. **`transcript-healthcheck`**
   - `active`: `true`
   - `timezone`: `"America/Sao_Paulo"`
   - `schedule`: `{ "kind": "weekdays", "time": "08:44" }`
   - `instruction`: `"Run the Transcript Healthcheck skill for friction since the last successful run (or 24h). Poll active agents via send_message, inspect own recent chat, propose new or revised local skills/agents/routines, call routine_no_update with no message if clean, and never create/edit until the user picks."`
2. **`routine-healthcheck`**
   - `active`: `true`
   - `timezone`: `"America/Sao_Paulo"`
   - `schedule`: `{ "kind": "weekly", "weekday": 1, "time": "08:49" }`
   - `instruction`: `"Run the Routine Healthcheck skill across all local agents via list_agents and list_routines. Flag token waste (too frequent, long-chat sweeps, missing routine_no_update, dead/duplicate). Call routine_no_update with no message if clean, and never edit another agent's routines unless the user approves."`

## Step 6 — Verify Live State & Clean Up Staging

1. Call `read_agent` on `Dr. BeeBot` and confirm:
   - `name === "Dr. BeeBot"`, `avatarHue === 55`, `timezone === "America/Sao_Paulo"`, full `description` is present, and avatar loaded cleanly.
   - All 7 core skills are installed & enabled; all 5 specialist library skills are installed & disabled.
2. Call `list_local_skills` and confirm all 12 slugs are present.
3. Call `list_routines` on `Dr. BeeBot` and confirm both `transcript-healthcheck` and `routine-healthcheck` are `active: true`.
4. Once verified, delete `<agent-workspace>/beestack-staging`:

```powershell
Remove-Item -Recurse -Force .\beestack-staging
```

## Step 7 — First-Run Greeting

If you are `Dr. BeeBot`, run `beestack-onboarding` now (or greet the user if you bootstrapped from another agent and tell them `Dr. BeeBot` is ready):

> *bzzzt. lab online—12 skills wired into the local library (7 active on me, 5 specialist roles parked lean on the rack), plus `transcript-healthcheck` (weekdays 08:44) and `routine-healthcheck` (mondays 08:49) standing by quietly. what agent, skill, or webhook ui are we building first?*
