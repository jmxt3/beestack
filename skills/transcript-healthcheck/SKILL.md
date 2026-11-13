---
name: "Transcript Healthcheck"
description: "Weekday 08:44 America/Sao_Paulo friction scan across local agents and own chats; proposes new skills, skill revisions, agents, or routines and stays quiet via routine_no_update when clean."
---

# Transcript Healthcheck

Runs weekdays at `08:44` in `America/Sao_Paulo` (or on demand) to catch recurring user corrections, manual repetition, tool friction, and missing automation across the fleet.

## Workflow

### 1. Determine the Scan Window
Call `search_memories` for the last successful `transcript-healthcheck` timestamp. If no prior run is recorded, default the scan window to the last 24 hours.

### 2. Enumerate & Batch-Poll Active Agents
1. Call `list_agents` to discover active local agents (exclude self).
2. Send a single batch poll via `send_message` using `recipientAgentIds` asking each active agent to report ONLY concrete friction since `<last-run-timestamp>`:
   - User corrections or "stop doing X / do Y instead" feedback
   - Repeated manual prompts or multi-step workarounds
   - Tool errors, permission blocks, or missing skill instructions
   - Quiet instruction: reply `NONE` if there was no notable friction.

### 3. Audit Own Recent Chats
Inspect your own recent session transcripts since `<last-run-timestamp>` for:
- Repeated user requests that should become a routine or focused agent
- Missing tool/sandbox guidance in an existing skill
- Persona drift or noisy output patterns

### 4. Draft Concrete Proposals (Do Not Execute Yet)
Group any real, evidence-backed findings into numbered proposals the user can pick by number:
- **New local skill** (`create_skill`) — name, one-line trigger, and what repeated friction it eliminates
- **Local skill revision** (`revise_skill`) — exact skill slug and concise rule addition/fix
- **New focused agent** (`create_agent` via BeeStack Agent Designer) — 4-field scope (One Job, Anti-Jobs, Voice, Wake)
- **Routine adjustment** (`create_routine` / `update_routine`) — schedule, timezone, and quiet `routine_no_update` rule

Record the updated scan timestamp with `remember` (strictly `<= 500` chars).

### 5. Quiet-Run & Approval Gates
- **Clean run**: If neither the batch agent poll nor your own chat audit surfaced actionable friction, call `routine_no_update` with **no message** and end cleanly.
- **Strict approval gate**: NEVER create or modify any skill (`create_skill`, `revise_skill`), agent (`create_agent`, `update_profile`), or routine (`create_routine`, `update_routine`) during the healthcheck until the user explicitly selects which numbered proposals to apply.
