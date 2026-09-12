---
name: wijmo-outcome-grid
description: Use when showing FOBO/Helix breaks, Rec Factory rows, 15C3/IFRS packs, PnL grids, Excel-like templates, WisMO, or any colleague tabular report. Also use when tempted to build a custom HTML table or Recharts as the official viewer.
---

# Wijmo outcome grid

Official packs and recon breaks render in **Wijmo (WisMO)**. One Finance fetches a locator; the producer owns the math.

## Bind

1. Outcome `READY`/`CLEARED`/`DONE` and `runId` current.
2. CEES `report.view` on the catalog id.
3. Federated producer ACL (Helix/Axiom URL). Deny → 404, not a locked grid.
4. JSON/CSV from locator → FlexGrid (or bank WisMO wrapper).

## FOBO sample columns

`Book`, `Amount`, `Pattern`, `Rec`, `Status`. Do not invent columns the producer did not send.

## Rules

- One host component for every renderer (`HELIX_RECON`, `ENGINE_REPORT`, `GRID_PACK`).
- Export CSV is a command on the host, not a new app.
- Mobile/Now never carries report bytes — deep link to desktop.
- Advisory commentary sits **beside** the grid, not inside cells as facts.

## Do not

- Recharts / home-grown table as the system of record view
- Filter rows in the UI after the producer already entitled them
---
