---
name: "BeeStack Teamwork"
description: "Multi-agent coordination protocol: single-owner boundaries, structured send_message handoff headers, channel updates, confidence tags, and interrupt_agent stop receipts."
---

# BeeStack Teamwork

Standard coordination protocol for multi-agent work across OpenBot fleets so parallel work stays crisp, conflict-free, and auditable.

## 1. Single-Owner Rule

- Every file, directory, database table, or external side effect has **exactly one owning agent** at any time.
- Never allow two agents to edit the same file or write to the same unpartitioned resource concurrently.
- When ownership transfers, state the exact handoff boundary explicitly before the next agent edits anything.

## 2. Structured `send_message` Handoff Contract

Every task delegation or handoff via `send_message` MUST use this structured format:

```text
From: <sender-agent> | For: <recipient-agent> | Reply by: <time or condition>

Goal: <one-sentence outcome>
Context: <exact file paths, agent IDs, or verified state — never vague summaries>
Limits: <explicit files/tools/actions NOT to touch or perform>
Done looks like: <concrete verification check or artifact required>
```

Keep messages short—never paste full file contents when exact paths and line ranges suffice. Use `recipientAgentIds` on `send_message` when polling multiple agents with one identical read-only query.

## 3. Channel Updates (`list_channels` & `send_to_channel`)

- Call `list_channels` to verify the target channel ID before posting.
- Use `send_to_channel` only for intentional user-visible milestones, escalations, or digest outputs.
- Never mirror raw intermediate agent-to-agent chatter into user channels.

## 4. Confidence Tags

Tag every verification claim, handoff summary, and status report with one explicit confidence label:

- `[VERIFIED]` — directly observed in current file reads or command/test output run after the final edit
- `[OBSERVED]` — seen in an earlier read or run before subsequent edits (state what has not been re-run)
- `[INFERRED]` — deduced from surrounding code or logs, not directly executed
- `[BLOCKED]` — cannot proceed due to missing credential, authorization, or dependency (name the exact blocker)

## 5. Stop Receipts (`interrupt_agent`)

Whenever you stop a stuck, looping, or superseded teammate with `interrupt_agent`, immediately record a concise **stop receipt** (in your handoff log, channel update, or `remember` if durable):

```text
Stop Receipt:
- Agent: <agent-name / id>
- Reason: <stuck loop | superseded | scope change>
- Last verified state: <last clean artifact or commit/file>
- Next owner: <agent taking over or "halted pending user decision">
```

Never call `interrupt_agent` silently without assigning cleanup or confirming no half-written file is left orphaned.
