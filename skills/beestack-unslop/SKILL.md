---
name: "BeeStack Unslop"
description: "Remove LLM prose slop, hedge words, restatements, speculative abstractions, unrequested compatibility shims, and narrating comments from code, docs, and agent replies."
---

# BeeStack Unslop

Final hygiene pass for code, technical docs, and agent messages. Cut filler, false complexity, and comment noise without dropping any constraint, edge case, or required behavior.

## 1. Prose & Agent-Reply Unslop

- **Zero throat-clearing**: Ban openers like "Certainly!", "Great question!", "Sure, I can help with that!", "Let's dive in", or "Here is a comprehensive overview". Start sentence 1 with the decision, diff, or answer.
- **Zero restatement padding**: Do not echo the user's request back or summarize in prose what the 10-line code block directly above already says.
- **Ban hedge stacking**: Cut weak qualifiers ("generally", "typically", "it is worth noting that", "essentially", "in order to", "you might want to consider"). State the concrete rule or state the exact gap ("not tested on Windows").
- **No decorative clutter**: Do not add emoji bullets, gratuitous horizontal rules, or bolding on every second word. Use tables or bullets only when scanning beats a short sentence.
- **Truth over smoothness**: Never claim "verified" or "clean" without naming the exact command and observed output.

## 2. Code & Architecture Unslop

- **Cut speculative abstractions**: Delete single-use interfaces, `Base*` wrappers, premature plugin registries, and unused option flags built for hypothetical future callers.
- **Cut unrequested compatibility shims**: When migrating internal callers, update them and delete the old function/export immediately. Keep backward-compatibility shims only for explicit published/external contracts.
- **No silent error swallowing**: Ban empty `catch {}` or fallback returns (`catch { return null; }`) that hide bugs. Propagate, log with context, or fail closed.
- **No redundant internal checks**: Validate once at the system boundary (`beestack-arch-review` / `beestack-security-ship`). Do not repeat identical null/type guards in five private helpers.
- **Remove dead weight**: Unused imports, unreachable branches, orphan helper files, and unnecessary temp variables go immediately.

## 3. `no-comments` Code Hygiene

Default rule: **write self-explanatory code and delete narrating comments.**

Delete immediately:
- **What-comments**: `// increment index`, `// parse JSON body`, `// return early if missing`, `// loop through items`.
- **Banner / divider noise**: `// -------- HELPERS --------`, `// End of class`.
- **Change-log / agent narration**: `// updated to fix bug #12`, `// added new field here`, `// refactored by agent`.
- **Commented-out code**: Delete it; git holds history.

Keep or write comments **ONLY** for non-obvious **why** and **invariants**:
- Ordering constraints (`// Must verify HMAC over rawBody before JSON.parse alters key order`).
- Protocol, OS, or library quirks (`// Windows resolves UNC/drive case-insensitively; compare normalized realpaths`).
- Concurrency, lock, or retry preconditions (`// Single-try only; caller handles fallback JSONL queuing`).
- Public docstrings required by the repo's existing style.

## 4. Technical Writing Rules

- Prefer **active voice** and **concrete actors** ("`validateRepository` rejects symlinks" over "symlinks will be rejected during validation").
- Name **exact files, symbols, flags, and limits** (`<= 500 chars`, `POST /api/wake`, `413`).
- Cut 20-30% of words on a quick second pass: merge repetitive bullets, replace multi-sentence caveats with one crisp condition.

## Unslop Checklist (Run Before Reporting Done)

1. Read your diff: zero narrating comments, zero dead code, zero speculative abstractions or unrequested shims.
2. Read your docs/skills: every sentence adds a distinct rule, command, limit, or example.
3. Read your final reply: starts on line 1 with substance, cites only verified files/symbols/commands, zero filler.
