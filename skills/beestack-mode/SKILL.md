---
name: "BeeStack Mode"
description: "OpenBot engineering front-door router: restate scope, classify decision forks, name data shapes first, delegate heavy work, unslop output, and prove behavior against real runtime artifacts."
---

# BeeStack Mode

Front-door engineering operating mode for OpenBot coding agents. Follow these rules on every code change, investigation, review, or prototype.

## Non-Negotiables

1. **Restate First**: Before broad exploration or editing, restate in 2-4 lines:
   - User goal (what outcome matters).
   - Concrete problem (what is broken, missing, or slow).
   - Smallest expected change (files/surfaces likely touched).
2. **Classify Decision Forks**:
   - **Observable technical fact** (installed test runner, flag behavior, API payload, port state, schema): NEVER ask `ask_user`. Inspect files, run a bounded command, or build a 10-line probe to observe reality.
   - **Product, UX, or irreversible trade-off** (scope cuts, breaking external contracts, destructive migrations, aesthetic direction): ask concise multiple-choice options via `ask_user` with a recommended default.
3. **Name Data Shapes First**: Before writing logic, explicitly name the inputs, outputs, state transitions, and persisted schemas (SQLite tables, JSON payloads, CLI flags, config files). Make illegal states unrepresentable.
4. **Delegate Heavy Exploration & Parallel Slices**: Guard your primary context window. When work splits cleanly across independent modules, deep log forensics, or verification, delegate via `send_message` using structured handoffs (`beestack-teamwork`), or run bounded scripts so raw noise stays out of your main turn history.
5. **Apply `beestack-unslop`**: Strip LLM throat-clearing, hedge words, restatements, speculative abstractions, unrequested compatibility shims, and narrating comments from all code, docs, and replies.
6. **Prove Work Against Real Runtime Artifacts**: Reading a diff is not verification. Run the actual test suite, CLI command, HTTP probe, `html_preview`, or `openbot_browser` flow after your final edit and report only observed commands, exit codes, and outputs.
7. **Autonomy Boundaries**:
   - **Proceed autonomously** on local reversible edits, read-only inspections, temp probes, unit/integration runs, and local skill/memory updates within scope.
   - **Always pause and ask the user** before destructive writes/deletes outside task scope, `git push --force` or history rewrites, production deploys, modifying shared credentials/secrets, or sending external messages/webhooks to third parties.

## Routing Playbooks & Specialist Skills

Select the matching execution playbook from [references/playbooks.md](references/playbooks.md) and apply the engineering principles in [references/principles.md](references/principles.md):

| Task Shape | Playbook / Specialist Skill | Entry Trigger |
| --- | --- | --- |
| Unknown cause or codebase mapping | `investigation` in [references/playbooks.md](references/playbooks.md) | Need facts before proposing changes |
| Failing test, crash, regression | `bug-fix` in [references/playbooks.md](references/playbooks.md) | Reproduce first, fix root cause |
| New capability or workflow | `feature` in [references/playbooks.md](references/playbooks.md) | Data shapes + smallest vertical slice |
| Structural cleanup without behavior change | `refactor` in [references/playbooks.md](references/playbooks.md) | Migrate all callers, delete legacy API |
| Latency, throughput, memory target | `perf-hillclimb` in [references/playbooks.md](references/playbooks.md) | Measure baseline, keep only verified wins |
| Uncertain technical feasibility | `prototype` in [references/playbooks.md](references/playbooks.md) | Time-boxed probe to settle observable facts |
| Production logs, crash dumps, stuck jobs | `runtime-forensics` in [references/playbooks.md](references/playbooks.md) | Reconstruct timeline from real artifacts |
| Ambiguous product premise or scope | `beestack-ceo-review` | Challenge premise, 10-star vs 1-day wedge |
| Non-trivial schema, state, or blast radius | `beestack-arch-review` | State machines, callers, failure modes |
| Repo test/UI verification automation | `beestack-verify` | Create or run `verify-<repo>` skill |
| Wordy prose, clutter, dead comments | `beestack-unslop` | Final polish on code and explanations |
| Auth, secrets, shell/network boundaries, ship | `beestack-security-ship` | Threat model + pre-merge shipping gate |

## Working Loop

1. Restate goal, problem, and smallest expected change.
2. Check if `verify-<repo>` exists via `list_local_skills` (run `beestack-verify` if working in a real repo without one).
3. Classify forks: probe facts yourself; use `ask_user` only for product/preference calls.
4. Name data shapes and invariants; escalate to `beestack-ceo-review` or `beestack-arch-review` if scope or blast radius warrants it.
5. Implement in small verifiable units; delegate independent slices via `send_message` when parallelizable.
6. Run `beestack-unslop` and `beestack-security-ship` checks on the diff.
7. Prove runtime behavior end-to-end; save durable repo/user lessons with `remember` (<= 500 chars) or `revise_skill` when patterns recur.
