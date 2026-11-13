---
name: "Routine Healthcheck"
description: "Weekly Monday 08:49 America/Sao_Paulo audit of scheduled routines and webhookRoutines across all local agents to flag token waste; stays quiet via routine_no_update when clean."
---

# Routine Healthcheck

Runs weekly on Mondays (`weekday: 1`) at `08:49` in `America/Sao_Paulo` (or on demand) to eliminate silent token burn, noisy empty updates, and broken schedules across the local OpenBot fleet.

## Workflow

### 1. Gather Fleet Schedules
1. Call `list_agents` to enumerate all local agents.
2. For each agent, call `list_routines` and inspect both scheduled `routines` and `webhookRoutines`.

### 2. Audit for Token Waste & Failure Modes
Evaluate every active and paused routine against these four checks:

1. **Too Frequent (`< 60m` polling)**: Any interval shorter than 60 minutes without an explicit real-time SLA or user justification. Recommend widening cadence (`>= 60m`) or switching to an event-driven `create_webhook_routine`.
2. **Recurring on Long Chat**: Any recurring routine reusing a long-running conversation thread where unbounded history inflates every wake. Recommend fresh/isolated session scope or summarizing durable state into `~/OpenBot/Shared/Data/agent-data.db` or `remember` (`<= 500` chars).
3. **Noisy Empty Runs**: Any monitoring, digest, or triage routine whose instruction lacks an explicit `routine_no_update` quiet-exit clause when nothing actionable occurred.
4. **Dead or Duplicate**: Routines targeting deleted/disabled agents, stale one-off schedules left active, overlapping schedules running the same check on multiple agents, or unused/orphaned `webhookRoutines`.

### 3. Quiet-Run & Approval Gates
- **Clean run**: If every agent's `routines` and `webhookRoutines` pass all four checks, call `routine_no_update` with **no message** and exit silently.
- **Findings report**: Present a concise numbered list showing `<agent-name> | <routine-name> | <issue> | <proposed change>` (`update_routine`, `update_webhook_routine`, or `delete_routine`).
- **Strict approval gate**: NEVER edit, disable, or delete another agent's routines (`update_routine`, `update_webhook_routine`, `delete_routine`) without explicit user approval. Wait for the user to approve specific numbered changes before applying them.
