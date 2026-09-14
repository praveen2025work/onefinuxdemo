---
name: rtb-support-view
description: Use when building run-the-bank support for delays, SLA breaches, aged outcomes, escalations, dead letters, watermark replay, or correlation ids. Not for sign-off, BU-head boards, or kit authoring.
---

# Run-the-bank support

Ops watch **delays and escalations**. They do not sign off recs. Surface: **Operations** (`/operations`) and **Monitoring** (`/monitoring`).

## Surfaces

| Screen | Job |
|---|---|
| Delays | Lag, aged, SLA miss, destination not complete for `runId` |
| Escalations | User/support raise or auto from aged/failed |
| Dead letters | Unmapped row: id, feed, offset, RFC 7807 why |
| Replay | From watermark; **second approver** |
| Trace | `correlationId` / `runId` |

## Rules

- Entitlement `platform.support`. Fail closed.
- Head sees escalation **counts**; support sees the queue.
- Replay is dual-control.
- Stale completions (wrong `runId`) are info — fold already ignored them.
- Do not publish kits or CEES groups here.

## Do not

- Put this on the user’s sign-off page
- Auto-replay without a checker
- Poll SoRs to “fix” delay
---
