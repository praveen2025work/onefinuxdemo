---
name: wijmo-outcome-grid
description: Use when showing or authoring FlexGrid, Pivot, or FlexChart on an entitled dataset — Helix breaks, packs, group-unit analyst views. Also use when tempted to add Recharts, a custom table, or a per-report React page. Company has a Wijmo licence.
---

# Wijmo studio (grid, pivot, chart)

One Finance is the report surface. **Wijmo only.** BAs author when a dataset locator exists. Developers do not draw 1000 reports.

## Widgets

| Widget | Use |
|---|---|
| FlexGrid | Breaks, official packs, lists |
| Pivot (OLAP) | Slice dimensions the dataset already has |
| FlexChart | Same dataset, entitled |

A **view definition** stores: `datasetId`, widget, field map, filters, `report:{id}`, `groupUnitId`.

## Bind (user open)

1. Dataset landed for current `runId` (or snapshot policy on the kit).
2. CEES `report.view`.
3. Federated producer ACL if the locator is Helix/Axiom. Deny → 404.
4. Host renders the saved def. No extra route.

## Author (BA, after source provided)

Config registers the dataset. BA picks widget + fields. Checker publishes. That is the Tableau-like step **inside** One Finance UX.

## FOBO user grid

Columns from producer: Book, Amount, Pattern, Rec, Status. Sign-off sits **beside** the grid, not inside cells.

## Do not

- New chart library
- Pivot on fields the dataset does not have
- Authoring on the user’s sign-off page
- Mobile report bytes — Now deep-links desktop
---
