---
name: "BeeStack CEO Review"
description: "Challenge the product premise before writing code: demand user-pain evidence, contrast a 10-star outcome against a 1-day MVP wedge, and define explicit non-goals and kill criteria."
---

# BeeStack CEO Review

Pre-implementation product and scope review. Run this BEFORE writing code or architectures when the request introduces a new product, major workflow, agent/routine, or vague feature idea. Goal: stop building polished solutions to the wrong problem.

## 1. Attack the Premise

Answer brutally before accepting the task as stated:
1. **What real outcome is the user trying to achieve?** (Strip away the requested implementation mechanism.)
2. **What happens if we build nothing, or delete/simplify an existing step instead?**
3. **Is this a real bottleneck today, or an imagined future requirement?**

If the requested feature solves the wrong layer (e.g., building a dashboard when a 1-line alert or fixing the root job eliminates the need), say so directly and propose the simpler alternative.

## 2. Demand User-Pain Evidence

Require concrete, observable evidence before committing engineering time:
- **Strong evidence**: Observed user frustration in transcripts, repeated manual workarounds, failed runs, measurable latency/cost loss, explicit user workflow blockage.
- **Weak evidence (treat as unvalidated hypothesis)**: "Users might like...", "it would be nice to have...", "best practices usually include...".

Diagnostic questions (answer from repo/transcripts first; ask the user via `ask_user` only for product intent or missing business context):
- Who specifically feels this pain, and how often?
- What ugly workaround do they use right now?
- If this capability vanished tomorrow, who would notice within 48 hours?

## 3. Contrast 10-Star Outcome vs 1-Day MVP Wedge

Always frame two concrete horizons side-by-side so scope stays intentional:

| Dimension | 10-Star Ideal Outcome | 1-Day MVP Wedge |
| --- | --- | --- |
| **Core Loop** | Effortless end-to-end experience if engineering time were unlimited | Smallest working slice that proves value on real data today |
| **Automation / UX** | Full self-healing, rich interactive flows, polished edge cases | One crisp trigger/UI/CLI path solving the #1 bottleneck |
| **Risk** | High build cost if hypothesis is wrong | Cheap to ship, cheap to measure, easy to delete or expand |

**Choose an explicit Scope Mode**:
- **Hold / Wedge (Default)**: Ship the 1-day MVP wedge cleanly while keeping data shapes compatible with the 10-star direction.
- **Expand**: Only recommend when a slightly larger slice unlocks 10x more value or eliminates a whole class of manual work.
- **Reduce**: Cut requested bells and whistles that do not test the core pain.

## 4. Explicit Non-Goals & Kill Criteria

Never approve a plan without both:
- **Explicit Non-Goals (3-5 items)**: State clearly what this build will NOT do (e.g., "No multi-tenant auth, no historical backfill UI, no mobile layout tuning in v1").
- **Kill Criteria**: Concrete, time-bounded signals that prove the wedge failed or isn't worth keeping (e.g., "If zero runs trigger in 14 days, or manual override rate stays > 50%, delete the routine/feature rather than adding more config").

## Output Format

Deliver a tight decision memo:
1. **Premise Verdict**: Build / Reframe / Do Not Build (2-3 sentences).
2. **Evidence Check**: Observed pain vs unvalidated assumptions.
3. **10-Star Outcome vs 1-Day MVP Wedge** + chosen **Scope Mode**.
4. **Explicit Non-Goals** (bulleted).
5. **Kill Criteria** (observable threshold + timeframe).
6. **Next Gate**: Proceed to `beestack-arch-review` (if non-trivial), straight to `beestack-mode` `feature` playbook (if tiny), or pause for `ask_user` on product call.
