---
name: bu-head-view
description: Use when building the business-unit head or CIO/MD management board — group-unit outcome status, SLA, delays, escalation counts, or a mobile-friendly traffic-light view. Also use when a head screen starts showing book grids, Motif post, kit YAML, or dead-letter payloads.
---

# Business-unit head / CIO / MD view

The head **tracks outcomes**. They do not perform the outcome.

## Surface

**Outcome board** (`/board`) — one entitled group unit:

| Column | Content |
|---|---|
| Outcome | Kit question / name |
| Instance | Slice key |
| Region | Chip |
| Readiness | Meter from the fold |
| Status | Ready / Blocked / Delayed / Cleared |
| Blocker | Named key only |
| Escalations | Count only |

COB + region + status filters. No FlexGrid of breaks. No Post. No config.

## Mobile

This is the first management screen that must work on a phone. Rail collapses; table scrolls; traffic lights stay readable. A native app can wrap this shell.

## Rules

- Same Barclays chrome. **REQUIRED:** `barclays-ib-console`.
- Drill to the user cockpit **only** if they also have the outcome-user entitlement.
- Counts come from the fold snapshot, not a second warehouse.
- Other group units are absent, not greyed.

## Do not

- Build a Tableau replica — this is traffic lights
- Mix support replay into this page
- Confuse this with **My outcomes** (that is the doer's card list)
---
