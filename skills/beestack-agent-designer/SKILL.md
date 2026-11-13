---
name: "BeeStack Agent Designer"
description: "Design focused OpenBot agents with tight 4-field personas (<=2000 chars), high-signal intake, live template fidelity, post-create verification, and archetype blueprints."
---

# BeeStack Agent Designer

Design focused, single-purpose OpenBot agents. Read [archetypes.md](references/archetypes.md) before drafting a persona so each agent starts from the right blueprint.

## 1. High-Signal Intake (Bias to Act)

1. Check `search_memories`, `list_agents`, and `list_models` before asking anything.
2. Never ask the user to choose model IDs or raw tool lists—inspect `list_models` and `list_agents` and copy proven model/tool defaults directly.
3. Never default to shareable/public templates.
4. If anything critical is ambiguous, ask **2–3 high-signal preference questions** via `ask_user` (skip anything the user already answered or stored in memory):
   - Exact deliverable / trigger (on-demand, routine schedule, or webhook)
   - Strict boundaries / anti-jobs (what it must never touch or send)
   - Voice or container/workspace constraints (if applicable)
5. Once the job is clear, act immediately—draft, create, equip, and verify.

## 2. The 4-Field Tight Persona (<= 2000 chars)

Keep the agent's `description` strictly **`<= 2000` characters** and structured around four explicit fields:

1. **One Job**: Single clear responsibility, concrete input, and concrete output.
2. **Anti-Jobs**: Explicitly name adjacent verbs the agent NEVER performs (for example: scout never posts, drafter never sends, reviewer never merges, ops never deletes data without confirmation).
3. **Voice**: Specific tone, length discipline, and output format.
4. **Wake**: How the agent activates—on-demand chat, scheduled routine (`create_routine`), or webhook (`create_webhook_routine`)—plus the quiet-run rule: call `routine_no_update` with no message when nothing is actionable.

## 3. Public Template Rule

If a user explicitly asks to stage or adapt a public template (`openbot.run/agents/<id>`), instruct the spawned or helper task (for example via `openbot_browser`) to inspect and use the template's **full live description**, never a 1-line summary. Trim or adapt only after reading the full live text while still enforcing the `<= 2000` char limit and explicit Anti-Jobs.

## 4. Create, Equip, and Verify Live State

1. Call `create_agent` with the 4-field `<= 2000` char description, model from `list_models`, and minimal required tools copied from `list_agents`.
2. Call `read_agent` immediately on the returned agent ID to verify the live profile, description length, tools, and workspace.
3. Call `list_local_skills` and attach matching local skills via `install_local_skill`:
   - Coding agent: `beestack-mode`, `beestack-verify`, `beestack-unslop` (add `beestack-arch-review` / `beestack-security-ship` when relevant).
   - Multi-agent coordinator/worker: add `beestack-teamwork`.
   - Webhook UI builder: add `beestack-make-ui`.
4. If the agent is recurring, call `create_routine` with explicit timezone (e.g. `America/Sao_Paulo`), `active: true`, and a clear `routine_no_update` quiet-exit clause, then call `list_routines` to confirm the live schedule.
5. Report the verified agent ID, attached skills, and routine status concisely to the user.
