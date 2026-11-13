---
name: "BeeStack Verify"
description: "Inspect a repository's test runners, build/lint commands, CLI entrypoints, and UI surfaces, then create, update, or execute a repo-specific verify-<repo> local OpenBot skill."
---

# BeeStack Verify

Create, maintain, and execute repo-specific `verify-<repo>` skills in OpenBot's local skill library so every coding agent verifies against real runtime commands and UI checks instead of guessing.

## Mode Selection

- **Author / Maintain Mode**: Repository has no `verify-<repo>` skill yet, or its build/test/CLI/UI surface changed.
- **QA Run Mode**: `verify-<repo>` exists and you are verifying changes before reporting done.

## Author / Maintain Workflow

### 1. Check Existing Skill Library
Call `list_local_skills`. Look for `verify-<repo>` (lowercase repo slug, e.g., `verify-beestack`). If present, call `read_local_skill` to inspect current checks before updating.

### 2. Inspect Repository Surfaces
Inspect the repo root and manifests (read-only first):
- **Build & Tooling**: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`, `.github/workflows/*`.
- **Test Runners**: `node --test`, `vitest`, `jest`, `pytest`, `cargo test`, `go test`. Note fast targeted test commands vs full suite commands.
- **Static Checks**: `tsc --noEmit`, `eslint`, `ruff`, `mypy`, `clippy`, formatters, custom validators (e.g., `npm run validate`).
- **CLI Entrypoints**: `bin` entries, `scripts/`, `--help`, `doctor`, `--dry-run` smoke probes.
- **UI & HTTP Surfaces**:
  - Web apps / local servers: start command, port, `/healthz` or health endpoint, required env/vault keys, and interactive checks with `openbot_browser`.
  - Self-contained HTML/UI artifacts: visual and layout verification via `html_preview`.
- **Preconditions & Safety**: Required runtime versions, container dependencies, temp directories, and flags that prevent mutating production state.

### 3. Run Every Candidate Command Live
Never write an untested command into a `verify-<repo>` skill. Execute each check in the repo workspace, verify it exits cleanly without mutating tracked files, and record:
- Exact command and working directory.
- Expected exit code and key output assertions.
- Approximate runtime (split into Fast Smoke `< 30s` vs Full Gate).

### 4. Register or Update `verify-<repo>`
Use `create_skill` (new) or `revise_skill` (existing). Every `verify-<repo>` skill MUST include:
- Valid OpenBot frontmatter (`name` 1..80 chars, `description` 1..500 chars).
- **Quick Smoke Gate**: fastest lint/validate/unit check after small edits.
- **Full Verification Gate**: full test suite + typecheck/build + validator.
- **CLI & Runtime Probes**: exact non-destructive commands (`doctor`, `--dry-run`, HTTP `/healthz`).
- **UI Verification**: concrete `openbot_browser` walkthrough (console errors = 0, failed network responses = 0, key interactive controls verified) or `html_preview` check when applicable.
- **Cleanup & Isolation Rules**: temp dirs cleaned up, no leftover background servers or dirty `git status`.
- **Maintenance Trigger**: instruction to update `verify-<repo>` via `revise_skill` whenever scripts, entrypoints, or test suites change.

Confirm registration by calling `list_local_skills` (and `read_local_skill` on the saved slug).

## QA Run Workflow (Executing Verification)

When verifying changes against an existing `verify-<repo>` skill:
1. Run the Fast Smoke Gate first to catch obvious breaks early.
2. Run the Full Verification Gate after your **final** edit (earlier runs are stale).
3. For web/UI changes, exercise the live surface with `openbot_browser`:
   - Navigate to the target URL, inspect rendered layout and responsive viewports.
   - Check browser console logs and network requests for uncaught exceptions or 4xx/5xx responses.
   - Trigger core user flows (forms, buttons, state transitions) and confirm DOM + backend state match.
   - For standalone HTML previews, verify via `html_preview`.
4. Report an exact Pass/Fail table with commands run, exit codes, and observed counts—never "looks good" or extrapolated counts.
5. If a repo check became outdated because you legitimately changed scripts or entrypoints, update `verify-<repo>` with `revise_skill` before finishing.
