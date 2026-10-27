---
name: wijmo-outcome-grid
description: Use when a screen or another team's app shows read-only rows, a pivot or a chart; when writing or changing a GridSpec, the grid library (/grids), the /widget/grid embed or the <ofx-grid> web component; when adding group-unit analyst exploration on sources already onboarded; or when someone reaches for an HTML table, a hand-coded grid, Recharts or another chart library. Company has a Wijmo (MESCIUS) licence. Also use when text says Wismo or WisMO — the product name is Wijmo.
---

# Wijmo (MESCIUS) — the data standard

Every One Finance screen that shows tabular data uses the same Wijmo components, so a grid, pivot or chart looks and behaves the same in every screen, including framed STEPS (which already uses Wijmo). One skin, `frontend/theme/onefinux-wijmo.css`, styles all of them from the `--ofx-*` tokens.

## Standard components (`frontend/web/src/components`)

| Component | Use |
|---|---|
| `DataGrid` | FlexGrid with column filters, sort, quick search and CSV export. `columns: [{ binding, header, width, format, pill, chip, mono, wrap, template: (item) => ReactNode }]`. `height` is px, `'100%'` or `'auto'`. `onSelect(item)` fires only on a user pick, and desk views share that row on their link channel |
| `DataView` | One set of rows, three lenses: **Grid** (`DataGrid`), **Pivot** (`PivotView`) and **Chart** (any number by any dimension: sum, avg, min, max, count). Use it wherever an analyst may want to slice the rows |
| `Chart` | FlexChart / FlexPie: `column`, `bar`, `line`, `area`, `spline`, `scatter`, `pie`, `donut`. Palette from `--ofx-chart-1..6`; follows a theme change |
| `PivotView` | PivotEngine, PivotPanel and PivotGrid, with an optional PivotChart |

Pure helpers live in `src/lib/aggregate.js` (`fieldKinds`, `aggregateBy`, `plainRows`) and `src/lib/csv.js` (formula-safe CSV), and both have node tests.

## Read-only data is config: GridSpec

A read-only grid is a **GridSpec** (`src/grid/spec.js`), not a component. It is JSON with these fields:

- `source`: an endpoint with `params` bound to `groupUnit` / `cobDate` / `region`, or inline `rows`. The `endpoint` / `method` / `params` of an outcome definition's `grids` entry is a spec too.
- `columns`: each has a `type` (`text`, `number`, `money`, `percent`, `date`, `datetime`, `status`, `chip`, `mono`, `bool`) and optional `tones` per status value.
- `filter`, `views` (`grid` / `pivot` / `chart`), `pivot` and `chart` defaults.
- `live`: the hub events that refetch it. `refreshSeconds` polls instead where the hub cannot push.
- `share`: the FDC3 context a row pick broadcasts.

| Piece | Where |
|---|---|
| Validate, bind params, map columns, encode for URLs | `src/grid/spec.js` (node tests) |
| Built-in specs (instances, outcomes, activity, notifications, events, escalations, a static sample); outcome grids as `outcome:<ID>:<grid>` | `src/grid/specs.js` |
| `SpecGrid`: fetch, live refresh, share on pick | `src/grid/SpecGrid.jsx` |
| Resolve a spec id (`instances`, `outcome:…`, `my:…`) or an inline spec | `src/grid/useGridSpec.js` |
| Desk view (`grid` widget, `view.config.spec` + `filter`) | `src/workspace/widgets.jsx` |
| Grid library: browse, edit with live preview, save as yours, add to a desk, copy the embed snippet | `/grids` (`pages/GridLibrary.jsx`) |
| Embed for any app: `/widget/grid?ofx-embed=1&spec=<id>` or `&def=<encodeJson(spec)>`; picks posted to the embedding page as `ofx.grid.select` | `pages/WidgetPage.jsx` |
| `<ofx-grid>` web component (Angular, React, .NET Razor, plain HTML): `/lib/onefinux-grid.js` + `/lib/onefinux-grid.css`, built by `npm run build` (`vite.lib.config.js`); its CSS is generated from `styles.css`, scoped under `ofx-grid` (`grid-css.js`) | `src/grid/element.jsx` |

A team that needs a read-only grid writes or copies a spec: in the grid library, as a desk view, as an outcome definition's `grids` entry, or in its own app through the iframe or `<ofx-grid>`. It does not get a new React component.

All `@mescius/wijmo*` packages are pinned to one version: install a new module at the **same** version as `@mescius/wijmo`. Set the licence in `VITE_WIJMO_LICENSE` (STEPS uses `NEXT_PUBLIC_WIJMO_LICENSE_KEY`). Without it, Wijmo shows its evaluation banner.

## Analyst exploration — same unit, known origin

First we bind the source of origin. Analysts explore **after** that, and only see data for their `groupUnitId`.

- A pivot or chart only uses dimensions the **registered** dataset already has.
- A view def is `datasetId` (must exist on the unit) + widget + fields + `report:{id}`, not a new React report.
- A dataset with no registered origin goes to config first.

## Do not

- Hand-build an HTML table, a per-team grid component, or add Recharts / another chart library where a GridSpec / these components fit (prose and spec tables stay HTML)
- Copy the grid's CSS into another app: link `/lib/onefinux-grid.css` or frame `/widget/grid`
- Restyle Wijmo per screen: extend `onefinux-wijmo.css` once
- Auto-select the first row (it would broadcast to linked views)
- Let the explorer invent a new source, or leave the group unit
- Start a Tableau replica or a React report squad
