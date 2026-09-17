# Instance surface: feed history, partner iframe, step reports

Controller job on one instance: see the fold and destinations first, open a feed only when they want history, open Partner view for the kit embed, and open Grid view for configured lineage FlexGrids.

Configured partner **workspaces** (investigation, close) live on the outcome as `grids` and render with MESCIUS Wijmo after **Grid view** on the **instance page** and the **report document**. See [`step-grid.md`](step-grid.md).

## Intent

The instance page is the operating surface. Readiness fold and destinations sit at the top. Opening a destination replaces the 360px card column with a full-width stage: the step-view IFRAME or GRID is the main surface, readiness folds to a status strip, destinations become step tabs, and Close restores the default split. Partner iframe and outcome `grids` stay closed until the operator asks. Event history is behind a click on each feed. After a step, the UI asks the hub for a report payload: **GRID** (event-store table) or **IFRAME** (custom screen). No `if (FOBO)`. Destination `surface` is data.

## What this is not

- Not a second facts table always on screen
- Not `target=_blank` for Helix
- Not mounting the kit embed or lineage FlexGrids on page open
- Not a hub proxy of partner grid APIs
- Not rebuilding Motif / Helix in `frontend/web`
- Not Kafka in the browser

## Fold

Readiness fold lists sources as today (status, key, required). History is hidden. Click a feed: the UI calls `GET /api/stitch/instance/step-view?id=&ref={sourceId}` and expands that row. The payload is GRID: time, type, status, key, plus attribute columns from `event_store.attributes_json`. Click again to close.

The always-on “Facts for this instance” table is removed. Same facts, on demand.

## Partner iframe

**Partner view** (label from the kit renderer, e.g. Helix partner view) frames `kit_embed` after a click. Click again to close. It does not open a tab. Query: `groupUnitId`, `productId`, `outcomeId`, `cobDate`, `region`, `runId`, `theme`. Demo Helix stub lives on the simulator at `/sim/screens/helix` so the frame is same-origin through the console proxy.

Destination HELIX still opens its own step-view iframe on click. That report uses the full-width stage, not a nested card in the destinations column. Partner view remains the kit embed, on demand, after Close.

## Step report API

`GET /api/stitch/instance/step-view?id={instanceId}&ref={sourceId|destId}`

Fail-closed: unknown or unentitled instance → 404.

| `destination_system.surface` | Result |
|---|---|
| `IFRAME` | `{ kind: "IFRAME", title, embedUrl, allowedOrigin, ref }` |
| `GRID` (or a source id) | `{ kind: "GRID", title, columns[], rows[], ref }` from `event_store` |
| no rows | `{ kind: "NONE", ref }` |

GRID columns are derived from the events for that ref (or `report_source_id` on the destination). IFRAME uses **PartnerFrame** with the primary height. Destinations on the instance open the stage; feeds still expand history in the fold table.

FOBO seed: HELIX = IFRAME; FAS_MOTIF and PNL_AGENT = GRID of event-store rows. Investigation and close FlexGrids are outcome.grids; they mount after Grid view on the instance page and the report document.

## Files

| Area | Change |
|---|---|
| Flyway `V7` | `destination_system.surface`, `report_source_id`; FOBO embed → `/sim/screens/helix` |
| `StitchService.stepView` | Entitled GRID / IFRAME / NONE |
| Simulator | Embedded Helix stub, no masthead |
| Console | Fold and destinations first; dest click opens full-width stage; Close restores the split; Partner view and Grid view on demand; GenericGrid for event history |
| Spec | REQ-CONSOLE-014..016 (remap AC-CONSOLE-20..22) |
