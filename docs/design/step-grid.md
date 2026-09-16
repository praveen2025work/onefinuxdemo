# Step grids: MESCIUS Wijmo, configured on the outcome

Controller job: see investigation or close data in a licensed MESCIUS Wijmo FlexGrid on Workspaces, on the instance page, and on the report document. Each **outcome definition** names its own API and request parameters. The console binds those parameters and fetches. The hub does not proxy partner APIs. One Finance does not rebuild Motif, Helix, or SAP screens.

## Intent

Copilot’s One Fin UX workspaces (investigation, close and sign-off) land here as **data on the outcome**. `OutcomeDefinition.grids` may declare:

- `id` / `title` — tab on `/workspaces`
- `endpoint` — HTTP path the **console** calls (simulator `/sim/grids/{name}` in the POC)
- `method` — `GET` or `POST`
- `params` — list of `{ name, from | value }`

`from` is a field on the current context envelope: `cobDate`, `region`, `groupUnitId`, `kitId`, `instanceId`, `sliceKey`, `account`, `journalId`, `amount`, `fsLine`, `runId`, `status`, `namedBlocker`. `value` is a literal and wins when set.

The console binds those parameters and fetches. Each result renders in **MESCIUS Wijmo FlexGrid**. License key is `VITE_WIJMO_LICENSE` (eval watermark is allowed when unset).

## What this is not

- Not a hub HTTP client or `StepGridClient`
- Not kit_destination as the config source (Flyway V8 columns may exist unused)
- Not a rebuilt Motif / Helix / SAP UI
- Not Wijmo analyst studio (pivot / chart)
- Not `if (FOBO)` — FOBO seed is YAML `grids` on `FOBO_HELIX`
- Not Kafka in the browser

## Surface

`GET /api/outcomes/definitions` returns `grids` with the rest of the outcome. The console renders them on `/workspaces`, `/instance/:id`, and `/reports/:outcomeId/:cobDate/:region`.

| Source | Result |
|---|---|
| Outcome has `grids` | Workspaces, instance, and report document each show FlexGrid tabs |
| Outcome has no `grids` | Those pages omit the grid panel |
| Instance fold / destinations | Unchanged: `GET /api/stitch/instance/step-view` is event-store GRID or IFRAME |

Bound query chips show method, endpoint, and params. Fail-closed stitch instances still return 404. Simulator `/sim/grids/{name}` is a partner JSON stub, not a rebuilt screen.

## Seed (FOBO_HELIX)

| Grid id | Endpoint | Params from context |
|---|---|---|
| investigation | `/sim/grids/investigation` | cobDate, region, groupUnitId, account, journalId |
| close | `/sim/grids/close` | cobDate, region, groupUnitId, status |

A new workspace is a new `/sim/grids/{name}` plus a YAML `grids` entry — no Java type.

## Files

| Area | Change |
|---|---|
| `OneFinUxProperties.OutcomeDefinition` | Optional `grids` (`GridStep`, `GridParam`) |
| `application.yml` | FOBO_HELIX investigation and close |
| Console | `WijmoGrid.jsx`, `bindGridParams.js`, `/workspaces` |
| Configuration | Outcome anatomy lists grids |
| Simulator | `GET /sim/grids/{name}` investigation and close payloads (unchanged stubs) |
| Spec | REQ-CONSOLE-016 / AC-CONSOLE-22 remap |
