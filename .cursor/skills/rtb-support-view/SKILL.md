---
name: rtb-support-view
description: Use when building or changing run-the-bank support — dead letters, feed lag, watermark replay, dual-control, correlation ids, RFC 7807 producer errors. Not for colleague rec cards or kit authoring.
---

# Run-the-bank support view

Ops keep the **feeds moving**. They do not redesign products.

## Surfaces

| Screen | Job |
|---|---|
| Dead letters | Unmapped row: id, feed, offset, why |
| Lag | Per-topic watermark vs head |
| Replay | From offset; **second approver** |
| Trace | `correlationId` / `runId` across ingest → fold → command |

## Rules

- Entitlement `platform.support`. Fail closed.
- Producer sees RFC 7807, never a silent drop.
- Replay is dual-control. One person cannot replay and approve.
- Stale Helix completions (wrong `runId`) are **info**, not poison — fold already ignored them.
- Do not expose kit publish or CEES group edits on this view.

## Common mistakes

- Putting dead letters as a tab on the colleague tower
- Auto-replay without a checker
- Polling Motif/CATS SoR to “fix” lag
---
