# Step grids: generic table, configured endpoint

Controller job: open investigation or close on an instance and see partner data in one GenericGrid. Each kit step names its own API and request parameters. One Finance does not rebuild Motif, Helix, or SAP screens.

## Intent

Copilot’s One Fin UX workspaces (investigation, close and sign-off, journals, exceptions) land here as **data**. A kit destination that is `GRID` may declare:

- `grid_endpoint` — HTTP path the hub calls (simulator `/sim/grids/{name}` in the POC)
- `grid_method` — `GET` or `POST`
- `grid_params_json` — list of `{ name, from | value }`

`from` is a field on the instance context envelope: `cobDate`, `region`, `groupUnitId`, `kitId`, `instanceId`, `sliceKey`, `account`, `journalId`, `amount`, `fsLine`, `runId`, `status`, `namedBlocker`. `value` is a literal.

The hub binds those parameters and fetches. The console renders one **GenericGrid**. Wijmo FlexGrid stays later (analyst studio). Phase 1 uses GenericGrid.

## What this is not

- Not Wijmo analyst studio
- Not a rebuilt Motif / Helix / SAP UI
- Not the browser calling partner APIs (CORS, secrets)
- Not `if (FOBO)` — FOBO seed is kit_destination rows
- Not Kafka in the browser

## Surface

`GET /api/stitch/instance/step-view?id=&ref=` stays the only console call.

| Destination data | Result |
|---|---|
| `surface = IFRAME` | kit embed, unchanged |
| `surface = GRID` and `grid_endpoint` set | hub GET/POST, return `{ kind: GRID, columns, rows, query }` |
| `surface = GRID` and no endpoint | event-store rows as today (`report_source_id`) |
| source id (feed click) | event-store rows as today |

`query` is `{ endpoint, method, params }` so the instance page can show the bound call. Fail-closed: unentitled instance → 404. Endpoints must resolve under the configured simulator base and path `/sim/…`.

## Seed (FOBO)

| Step | dest_id | Endpoint | Params from instance |
|---|---|---|---|
| 1 | HELIX | (iframe) | — |
| 2 | FAS_MOTIF | `/sim/grids/investigation` | cobDate, region, groupUnitId, account, journalId |
| 3 | PNL_AGENT | `/sim/grids/close` | cobDate, region, groupUnitId, status |

Simulator catalogues those names. A new workspace is a new `/sim/grids/{name}` plus a `kit_destination` row — no Java type.

## Files

| Area | Change |
|---|---|
| Flyway `V8` | `kit_destination.grid_endpoint`, `grid_method`, `grid_params_json` |
| `StepGridBinder` | Bind `from` / `value` onto the instance envelope |
| `StepGridClient` | Resolve `/sim/…` against `onefinux.simulator-url` |
| `StitchService.stepView` | Prefer configured fetch for GRID destinations |
| Simulator | `GET /sim/grids/{name}` investigation and close payloads |
| Console | GenericGrid shows bound query; Configuration lists endpoint + params |
| Spec | REQ-CONSOLE-016 / AC-CONSOLE-22 remap |
