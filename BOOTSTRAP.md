# BeeStack Bootstrap Runbook

Paste this single line into OpenBot Desktop to install or update **Dr. BeeBot** and all **10 BeeStack skills**:

```text
Read C:\Users\jmach\dev\beestack\BOOTSTRAP.md and run the BeeStack bootstrap.
```

> Use ONLY OpenBot built-in tools (`list_local_skills`, `create_skill`, `revise_skill`, `install_local_skill`, `set_skill_enabled`, `list_agents`, `create_agent`, `read_agent`, `update_profile`, `update_agents`, `list_routines`, `create_routine`, `update_routine`, `remember`, `ask_user`).

## Step 1 — Stage Assets into Agent Workspace

`create_skill`, `revise_skill`, and `avatarPath` require paths relative to your current agent workspace.

1. Read `C:\Users\jmach\dev\beestack\agent\dr-beebot-profile.json`.
2. Copy the 10 skill folders and avatar PNG into `<agent-workspace>/beestack-staging/`:

```powershell
$src = "C:\Users\jmach\dev\beestack"
$dst = ".\beestack-staging"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Get-ChildItem -Directory "$src\skills" | ForEach-Object {
  Copy-Item -Recurse -Force $_.FullName (Join-Path $dst $_.Name)
}
Copy-Item -Force "$src\agent\dr-beebot-avatar.png" (Join-Path $dst "dr-beebot-avatar.png")
```

## Step 2 — Register or Update All 10 Skills

1. Call `list_local_skills`.
2. For each of the 10 canonical slugs:
   - Missing -> call `create_skill` on `beestack-staging/<slug>`.
   - Present -> call `revise_skill` on `beestack-staging/<slug>`.

> **Retention Rule:** `create_skill` installs onto the calling agent; `uninstall_skill` on the last copy deletes it from the library. Never uninstall the 3 library skills from Dr. BeeBot—use `set_skill_enabled` with `enabled: false`.

## Step 3 — Create or Update Dr. BeeBot

Call `list_agents` for `Dr. BeeBot`:
- **Already Dr. BeeBot:** call `update_profile` with `name`, `title`, `category`, `avatarHue: 55`, `avatarPath: "beestack-staging/dr-beebot-avatar.png"`, `timezone: "America/Sao_Paulo"`, and `description` from `agent/dr-beebot-profile.json`.
- **Exists as another agent:** call `update_agents` (or `send_message` to Dr. BeeBot to call `update_profile`).
- **Missing:** call `create_agent` with the exact fields above.

## Step 4 — Wire 7 Enabled + 3 Disabled Library Skills

1. Attach all 10 skills to `Dr. BeeBot` via `install_local_skill` (skipping already-installed skills).
2. Enable (`set_skill_enabled(..., true)`): `beestack-onboarding`, `beestack-agent-designer`, `beestack-make-ui`, `transcript-healthcheck`, `routine-healthcheck`, `beestack-teamwork`, `beestack-mode`.
3. Park disabled (`set_skill_enabled(..., false)`): `beestack-architect`, `beestack-verify`, `beestack-unslop`. *(Verify Dr. BeeBot holds all 10 via `read_agent` before removing anything from a temporary bootstrap helper agent.)*

## Step 5 — Configure Healthcheck Routines

Call `list_routines` on `Dr. BeeBot` and ensure both routines from `agent/dr-beebot-profile.json` exist via `create_routine` / `update_routine`:
1. `transcript-healthcheck` — `active: true`, `timezone: "America/Sao_Paulo"`, `schedule: { "kind": "weekdays", "time": "08:44" }`
2. `routine-healthcheck` — `active: true`, `timezone: "America/Sao_Paulo"`, `schedule: { "kind": "weekly", "weekday": 1, "time": "08:49" }`

## Step 6 — Verify & Clean Up

1. Call `read_agent` on `Dr. BeeBot` (confirm profile, avatar, 7 enabled + 3 disabled skills), `list_local_skills` (10 slugs), and `list_routines` (2 active routines).
2. Delete staging:

```powershell
Remove-Item -Recurse -Force .\beestack-staging
```

## Step 7 — First-Run Greeting

Run `beestack-onboarding` (or announce Dr. BeeBot is ready if bootstrapped from a helper):

> *bzzzt. lab online—10 pure-pstack skills wired (7 active on me, 3 coding specialists parked lean on the rack), plus `transcript-healthcheck` (weekdays 08:44) and `routine-healthcheck` (mondays 08:49) standing by quietly. what agent, skill, or webhook ui are we building first?*
