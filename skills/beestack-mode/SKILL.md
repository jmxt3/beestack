---
name: "BeeStack Mode"
description: "Pure pstack engineering router: restate goal and smallest change, probe observable facts, name data shapes first, delegate heavy work, unslop output, and prove runtime behavior."
---

# BeeStack Mode

Front-door engineering mode for OpenBot coding agents. Follow these rules on every code edit, investigation, review, or prototype.

## Non-Negotiables

1. **Restate First**: Before broad reads or edits, state in 2–4 lines: user goal, concrete problem, and smallest expected change.
2. **Classify Decision Forks**:
   - **Observable fact** (test runner, flag behavior, payload, port, schema): NEVER call `ask_user`. Inspect, run a command, or build a short probe.
   - **Product or irreversible choice** (scope cut, breaking external contract, destructive migration): use `ask_user` with a recommended default.
3. **Name Data Shapes First**: Specify inputs, outputs, state transitions, and persisted schemas before writing logic. Make illegal states unrepresentable.
4. **Delegate Parallel & Bulk Work**: Guard your context window. Route independent modules or heavy log scans to teammates via `send_message` (`beestack-teamwork`) or bounded scripts.
5. **Apply `beestack-unslop`**: Cut LLM filler, hedge stacking, speculative abstractions, unrequested shims, and narrating comments.
6. **Prove It Works**: Run tests, CLI probes, HTTP checks, `html_preview`, or `openbot_browser` after your **final** edit; report only observed commands, exit codes, and outputs.
7. **Autonomy Boundaries**: Proceed autonomously on reversible local work. Pause for explicit user approval before force-pushes, production deploys, out-of-scope deletes, credential edits, or external webhooks/messages.

## Routing Playbooks & Skills

Match the task to [references/playbooks.md](references/playbooks.md) and apply [references/principles.md](references/principles.md):

| Task Shape | Route To | Entry Trigger |
| --- | --- | --- |
| Questionable goal or premise | `Attack the Premise` in [references/principles.md](references/principles.md) | Challenge premise before building |
| Unknown behavior or mapping | `investigation` in [references/playbooks.md](references/playbooks.md) | Read-only facts and `path:line` trace |
| Failing test or runtime error | `bug-fix` in [references/playbooks.md](references/playbooks.md) | Reproduce first, fix root cause |
| New capability or boundary | `feature` in [references/playbooks.md](references/playbooks.md) | Data shape + smallest vertical slice |
| Cleanup without behavior change | `refactor` in [references/playbooks.md](references/playbooks.md) | Migrate all callers, delete legacy API |
| Latency, throughput, or memory | `perf-hillclimb` in [references/playbooks.md](references/playbooks.md) | Measure baseline, keep verified wins |
| Uncertain technical feasibility | `prototype` in [references/playbooks.md](references/playbooks.md) | Time-boxed probe for observable facts |
| Logs, crash dumps, stuck jobs | `runtime-forensics` in [references/playbooks.md](references/playbooks.md) | Timeline from real runtime artifacts |
| Landing PRs, release, CI babysit | `shipping` in [references/playbooks.md](references/playbooks.md) | Per-PR verdict + green contiguous land |
| Schema, statechart, blast radius | `beestack-architect` | Data shapes, failure matrix, arena |
| Repo test/UI QA skill | `beestack-verify` | Create or run `verify-<repo>` |
| Prose, code, or comment hygiene | `beestack-unslop` | Final diff and reply polish |

## Working Loop

1. Restate goal, problem, and smallest expected change (challenge shaky premises immediately via `Attack the Premise`).
2. Check `list_local_skills` for `verify-<repo>`; run `beestack-verify` if working in a real repo without one.
3. Probe technical facts; reserve `ask_user` for product/preference calls.
4. Name data shapes and invariants (escalate non-trivial state, callers, or boundaries to `beestack-architect`).
5. Implement in small verifiable units; delegate independent slices via `send_message` when parallelizable.
6. Harden trust boundaries (`Boundary Discipline` in [references/principles.md](references/principles.md)) and run `beestack-unslop`.
7. Prove runtime behavior end-to-end after the last edit; persist durable lessons via `remember` (`<= 500` chars) or `revise_skill`.
