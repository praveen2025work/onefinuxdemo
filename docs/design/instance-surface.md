# Instance surface: feed history, partner iframe, step reports

Controller job on one instance: see the fold, open a feed only when they want history, stay in this app for the partner screen, and pull a step report into a generic grid or an iframe.

## Intent

The instance page is the operating surface. The fold stays sparse. Event history is behind a click on each feed. Partner work stays in-shell as an iframe. After a step, the UI asks the hub for a report payload: **GRID** (plain table) or **IFRAME** (custom screen). No `if (FOBO)`. Destination `surface` is data.

## What this is not

- Not a second facts table always on screen
- Not `target=_blank` for Helix
- Not Wijmo
- Not rebuilding Motif / Helix in `frontend/web`
- Not Kafka in the browser

## Fold

Readiness fold lists sources as today (status, key, required). History is hidden. Click a feed: the UI calls `GET /api/stitch/instance/step-view?id=&ref={sourceId}` and expands that row. The payload is GRID: time, type, status, key, plus attribute columns from `event_store.attributes_json`. Click again to close.

The always-on “Facts for this instance” table is removed. Same facts, on demand.

## Partner iframe

**Open partner screen** toggles an iframe in this page. It does not open a tab. URL comes from `kit_embed`. Query: `groupUnitId`, `productId`, `outcomeId`, `cobDate`, `region`, `runId`, `theme`. Demo Helix stub lives on the simulator at `/sim/screens/helix` so the frame is same-origin through the console proxy.

## Step report API

`GET /api/stitch/instance/step-view?id={instanceId}&ref={sourceId|destId}`

Fail-closed: unknown or unentitled instance → 404.

| `destination_system.surface` | Result |
|---|---|
| `IFRAME` | `{ kind: "IFRAME", title, embedUrl, allowedOrigin, ref }` |
| `GRID` (or a source id) | `{ kind: "GRID", title, columns[], rows[], ref }` |
| no rows | `{ kind: "NONE", ref }` |

GRID columns are derived from the events for that ref (or `report_source_id` on the destination). The console renders them with one **GenericGrid**. IFRAME uses **PartnerFrame**. Destinations on the instance are clickable the same way as feeds.

FOBO seed: HELIX = IFRAME; FAS_MOTIF = GRID from MOTIF events; PNL_AGENT = GRID from workflow facts when present.

## Files

| Area | Change |
|---|---|
| Flyway `V7` | `destination_system.surface`, `report_source_id`; FOBO embed → `/sim/screens/helix` |
| `StitchService.stepView` | Entitled GRID / IFRAME / NONE |
| Simulator | Embedded Helix stub, no masthead |
| Console | Click-to-expand fold; GenericGrid; PartnerFrame in-app |
| Spec | REQ-CONSOLE-014..016 (remap AC-CONSOLE-20..22) |
