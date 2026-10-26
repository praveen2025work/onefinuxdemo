---
name: wijmo-outcome-grid
description: Use when a screen shows rows, a pivot or a chart, when adding group-unit analyst exploration (FlexGrid, Pivot, FlexChart) on sources already onboarded, or when someone reaches for an HTML table, Recharts or another chart library. Company has a Wijmo (MESCIUS) licence. Also use when text says Wismo or WisMO — the product name is Wijmo.
---

# Wijmo (MESCIUS) — the data standard

Every One Finance screen that shows tabular data uses the same Wijmo components, so a grid, pivot or chart looks and behaves the same in every screen, including framed STEPS (which already uses Wijmo). One skin, `frontend/theme/onefinux-wijmo.css`, styles all of them from the `--ofx-*` tokens.

## Standard components (`frontend/web/src/components`)

| Component | Use |
|---|---|
| `DataGrid` | FlexGrid with column filters, sort, quick search and CSV export. `columns: [{ binding, header, width, format, pill, chip, mono, wrap, template: (item) => ReactNode }]`. `height` is px, `'100%'` or `'auto'`. `onSelect(item)` fires only on a user pick, and Workspace views share that row on their link colour |
| `DataView` | One set of rows, three lenses: **Grid** (`DataGrid`), **Pivot** (`PivotView`) and **Chart** (any number by any dimension: sum, avg, min, max, count). Use it wherever an analyst may want to slice the rows |
| `Chart` | FlexChart / FlexPie: `column`, `bar`, `line`, `area`, `spline`, `scatter`, `pie`, `donut`. Palette from `--ofx-chart-1..6`; follows a theme change |
| `PivotView` | PivotEngine, PivotPanel and PivotGrid, with an optional PivotChart |

Pure helpers live in `src/lib/aggregate.js` (`fieldKinds`, `aggregateBy`, `plainRows`) and `src/lib/csv.js` (formula-safe CSV), and both have node tests.

All `@mescius/wijmo*` packages are pinned to one version: install a new module at the **same** version as `@mescius/wijmo`. Set the licence in `VITE_WIJMO_LICENSE` (STEPS uses `NEXT_PUBLIC_WIJMO_LICENSE_KEY`). Without it, Wijmo shows its evaluation banner.

## Analyst exploration — same unit, known origin

First we bind the source of origin. Analysts explore **after** that, and only see data for their `groupUnitId`.

- A pivot or chart only uses dimensions the **registered** dataset already has.
- A view def is `datasetId` (must exist on the unit) + widget + fields + `report:{id}`, not a new React report.
- A dataset with no registered origin goes to config first.

## Do not

- Hand-build an HTML table or add Recharts / another chart library where these fit (prose and spec tables stay HTML)
- Restyle Wijmo per screen: extend `onefinux-wijmo.css` once
- Auto-select the first row (it would broadcast to linked views)
- Let the explorer invent a new source, or leave the group unit
- Start a Tableau replica or a React report squad
