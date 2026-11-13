---
name: "BeeStack Arch Review"
description: "Architecture review fusing data-shape modeling, state-machine completeness, caller blast-radius tracing, failure-mode interrogation, and competing-design comparison."
---

# BeeStack Arch Review

Engineering and architecture review before writing non-trivial code, schema changes, or multi-module refactors. Produce concrete models and failure tables—never hand-wavy prose.

## Five Mandatory Review Passes

### Pass 1: Data-Shape Modeling
Define canonical data structures before functions or endpoints:
- Name exact input payloads, persisted records (SQLite tables, JSON files, config), wire formats, and outputs.
- Identify the **single source of truth** for each piece of state. Derive secondary views rather than syncing duplicate copies.
- Enforce **type/schema discipline**: make illegal states unrepresentable (discriminated variants over parallel booleans).
- Define **boundary normalization**: where untrusted data enters, validates, and converts into trusted internal shapes.

### Pass 2: State-Machine Completeness
For every stateful entity, job, routine, connection, or UI flow:
- List every **state**, **event/trigger**, **guard condition**, **transition**, and **terminal state**.
- Verify completeness:
  - What happens on duplicate event delivery (idempotency)?
  - What happens on timeout, partial failure, or process restart mid-transition?
  - Are invalid transitions rejected explicitly rather than silently mutating state?
  - Are cancellation and cleanup transitions defined?

### Pass 3: Caller Blast-Radius Tracing
Trace every dependency touched by the change:
- **Code callers**: every function, script, CLI subcommand, and test importing or invoking the modified symbol.
- **Runtime / cross-agent callers**: OpenBot routines, webhooks, shared SQLite tables, local skills, and teammate agents relying on the contract.
- **Migration rule**: update all *internal* callers in the same change and delete legacy signatures immediately. Only version or bridge *external/persisted* contracts.

### Pass 4: Failure-Mode Interrogation
Interrogate the design against concrete failure scenarios:
- **Inputs**: empty, oversized (> cap), malformed UTF-8/JSON, unexpected null, path traversal characters.
- **Dependencies**: upstream timeout, 5xx, rate limit, missing Vault secret, container stopped, disk full.
- **Concurrency**: two simultaneous requests/agents hitting the same file, row, or routine.
- **Idempotency & Rollback**: can an interrupted run be safely retried or cleanly reverted?

For every architectural choice ("how"), record the governing invariant ("why") and what breaks if someone removes it later.

### Pass 5: Competing-Design Comparison
Compare at least **2 concrete architectural options** (e.g., Option A: minimal inline extension vs Option B: clean boundary separation):

| Criterion | Option A | Option B |
| --- | --- | --- |
| Complexity / LOC | | |
| Blast Radius | | |
| Failure Isolation | | |
| Reversibility | | |
| Maintenance Cost | | |

State the chosen option, why it wins under current constraints, and what new fact would flip the decision.

## Output Contract

Keep the review crisp and actionable:
1. **Canonical Data Shapes & Invariants**
2. **State Machine** (table or concise transition list)
3. **Blast-Radius Map** (callers, schemas, tests, external contracts)
4. **Failure Matrix** (`Trigger -> Impact -> Guard / Recovery`)
5. **Design Comparison & Recommendation** + **Test Plan** (behaviors and edge cases to prove)
