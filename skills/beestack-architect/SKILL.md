---
name: "BeeStack Architect"
description: "Pure pstack architectural rigor: domain data shapes, statecharts, caller blast-radius tracing, why/how invariants, adversarial interrogation, and competing-design arena."
---

# BeeStack Architect

Apply before crossing module boundaries, altering persisted schemas, or refactoring multi-caller contracts. Produce concrete tables and invariants—no abstract prose.

## 1. Data Shapes & Invariants (`how` / `why`)
- Define canonical inputs, persisted state (SQLite, JSON, Vault keys), wire payloads, and error shapes before writing functions.
- Name the **single source of truth**; derive secondary views instead of syncing duplicates.
- Make illegal states unrepresentable (discriminated variants over parallel booleans).
- Validate and normalize untrusted data once at the boundary (`Boundary Discipline`); record the invariant (`why`) that breaks if a constraint is removed.

## 2. Statechart Completeness (`statechart`)
For every stateful workflow, routine, webhook, or container lifecycle:
- Enumerate states, events, guard conditions, transitions, and terminal states.
- Specify behavior for duplicate delivery (idempotency keys), upstream timeout/5xx, partial failure, and process restart recovery.
- Reject invalid transitions explicitly rather than silently mutating state.

## 3. Blast Radius (`blast-radius`)
- Map every **code caller** (imports, scripts, CLI flags, tests) and **OpenBot runtime caller** (routines, webhook routes, shared SQLite tables in `~/OpenBot/Shared/Data/agent-data.db`, local skills, teammate `send_message` contracts).
- **One-wave migration**: update every internal caller and delete the legacy API in the same change. Version or bridge only published/persisted external contracts.

## 4. Interrogation & Arena (`interrogate` / `arena`)
- Stress-test boundaries: empty/oversized inputs, malformed JSON/UTF-8, path traversal (`..`, `%2f`), SSRF, `docker exec` arg injection, missing Vault secret, stopped container, concurrent writes.
- Compare at least **2 concrete designs** across LOC/complexity, blast radius, failure isolation, and reversibility; state which wins and what evidence would flip it.

## Output
1. Canonical data shapes & invariants
2. State transitions & idempotency rules
3. Blast-radius caller list
4. Failure matrix (`Trigger -> Impact -> Guard`)
5. Chosen design + verification plan
