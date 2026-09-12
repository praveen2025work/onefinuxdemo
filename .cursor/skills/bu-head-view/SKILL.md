---
name: bu-head-view
description: Use when building the business-unit head board — group-unit outcome status, SLA, delays, escalation counts. Also use when a head screen starts showing book grids, Motif post, kit YAML, or dead-letter payloads.
---

# Business-unit head view

The head **tracks outcomes**. They do not perform the outcome.

## Surface

One entitled group unit (or a CEES roll-up of units they own):

| Column | Content |
|---|---|
| Outcome | Kit question / name |
| Kind | HELIX_RECON, ENGINE_REPORT, … |
| Status | Ready / Blocked / Delayed / Escalated |
| SLA | On time or breach |
| Escalations | Count only |

COB + region filters. No FlexGrid of breaks. No Post. No config.

## Rules

- Same Barclays chrome. **REQUIRED:** `barclays-ib-console`.
- Drill to the user cockpit **only** if they also have the outcome-user entitlement.
- Counts come from the fold snapshot, not a second warehouse.
- Other group units are absent, not greyed.

## Do not

- Build a Tableau replica for the head — this is traffic lights
- Mix support replay into this page
---
