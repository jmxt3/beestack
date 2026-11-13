# BeeStack Execution Playbooks

Seven crisp OpenBot execution playbooks. Pick the one matching your current task shape and satisfy its exit gate before reporting done.

---

## 1. `investigation`
**Use when**: Behavior, ownership, or architecture is unknown and no code should change yet.

1. **Restate scope**: Write the exact questions to answer and what decision depends on them.
2. **Map boundaries**: Locate entrypoints, schemas, configs, and tests via targeted search before reading whole files.
3. **Trace runtime paths**: Follow real call chains from input to side effect; inspect logs, state files, or run read-only probes.
4. **Delegate broad scans**: If multiple independent subsystems need mapping, dispatch scoped teammates via `send_message`.
5. **Synthesize**: Report verified facts with exact `path:line` citations, explicit unknowns, and recommended next action.

**Verification Exit Gate**: Every factual claim maps to a file slice or command output observed in this session; zero unverified guesses presented as fact.

---

## 2. `bug-fix`
**Use when**: Existing behavior violates expectations, tests fail, or a runtime error occurs.

1. **Reproduce first**: Run the failing command, request, or `openbot_browser` flow to observe the failure directly.
2. **Isolate root cause**: Narrow from symptom to exact state/invariant violation; resist patching downstream symptoms.
3. **Write failing test**: Add or tighten a behavior-level test that fails before the fix.
4. **Apply minimal fix**: Fix the root cause cleanly; avoid unrelated refactors or silent fallbacks.
5. **Unslop & verify**: Check neighboring callers for the same bug pattern, then run full relevant checks.

**Verification Exit Gate**: Failing test failed before the edit, passes after the edit, and the broader test/lint suite passes with zero regressions.

---

## 3. `feature`
**Use when**: Adding new user-facing or system capability.

1. **Check premise & arch**: Run `beestack-ceo-review` if product value/scope is unclear; run `beestack-arch-review` if state machines, schemas, or multiple callers are affected.
2. **Name data shapes**: Define schemas, payloads, CLI flags, and error shapes upfront.
3. **Build smallest vertical slice**: Wire one complete end-to-end path (input -> validation -> core logic -> persistence/output) before adding options.
4. **Harden boundaries**: Apply `beestack-security-ship` checks on untrusted inputs, auth, secrets, and shell/network calls.
5. **Verify end-to-end**: Test happy path, edge cases, and failure modes against real runtime artifacts (including `openbot_browser` or `html_preview` for UI).

**Verification Exit Gate**: End-to-end slice runs against real runtime inputs/UI, automated tests cover contract and failure paths, and `beestack-unslop` pass is complete.

---

## 4. `refactor`
**Use when**: Improving structure, boundaries, or clarity without changing external behavior.

1. **Lock behavior baseline**: Run existing tests and record current contract/outputs before editing.
2. **Map blast radius**: List all callers, schemas, and tests depending on the target symbol or module.
3. **Transform incrementally**: Keep each step small and green; separate pure moves/renames from logic changes.
4. **Migrate callers & delete legacy**: Update every internal caller and remove obsolete wrappers or flags immediately.
5. **Re-verify baseline**: Confirm identical external behavior and cleaner diff.

**Verification Exit Gate**: All existing behavioral tests pass unchanged (or updated strictly for intentional internal caller migration), zero dead legacy wrappers remain, and `beestack-unslop` confirms reduced complexity.

---

## 5. `perf-hillclimb`
**Use when**: Optimizing latency, throughput, memory, bundle size, or startup cost.

1. **Define target & harness**: Set a reproducible benchmark command, fixed workload, and target metric.
2. **Measure baseline**: Record baseline numbers (median/p95, variance, sample size, environment).
3. **Profile bottleneck**: Identify the dominant hot spot before optimizing; never guess.
4. **Hillclimb one change at a time**: Apply one hypothesis, re-measure on the same harness, keep only statistically real wins, revert non-wins immediately.
5. **Verify correctness**: Run functional tests alongside the final benchmark.

**Verification Exit Gate**: Baseline vs post-change numbers reported with exact command, sample size, and conditions (`Explain the Number`); correctness tests still pass.

---

## 6. `prototype`
**Use when**: Feasibility, third-party API behavior, or UX feel is uncertain and asking `ask_user` would guess instead of testing.

1. **State the hypothesis**: Write the exact 1-2 questions the probe must answer.
2. **Time-box & isolate**: Build the smallest runnable script, temp test, or `html_preview` mockup without polluting production modules.
3. **Run & observe**: Execute against real inputs/APIs; inspect actual payloads, timings, or rendered DOM.
4. **Decide**: Keep the proved pattern and promote it cleanly, or discard the probe and pick another design.

**Verification Exit Gate**: Hypothesis is answered with observed runtime output or rendered preview; temporary scratch artifacts are cleaned up or clearly isolated.

---

## 7. `runtime-forensics`
**Use when**: Investigating production incidents, stuck routines, container failures, or corrupted state.

1. **Preserve evidence**: Read logs, SQLite state, transcripts, or container status read-only before mutating anything.
2. **Build timeline**: Order events by exact timestamps, delivery IDs, PIDs, and exit codes.
3. **Identify divergence**: Pinpoint the exact step where expected state diverged from actual state.
4. **Contain safely**: Pause before irreversible cleanup (`accidental` data loss prevention); apply idempotent recovery.
5. **Encode prevention**: Add a regression test, healthcheck rule, or `remember` / `revise_skill` update.

**Verification Exit Gate**: Root cause and timeline are backed by observed logs/artifacts, recovery is verified idempotent, and a preventive guard is in place or proposed.
