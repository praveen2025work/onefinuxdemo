# Step grids: MESCIUS Wijmo, configured on the outcome

Controller job: see investigation or close data in a licensed MESCIUS Wijmo FlexGrid after **Grid view** on the instance page and on the report document. Each **outcome definition** names its own API and request parameters. The console binds those parameters and fetches. The hub does not proxy partner APIs. One Finance does not rebuild Motif, Helix, or SAP screens. There is no separate Workspaces route.

## Intent

Copilot’s One Fin UX workspaces (investigation, close and sign-off) land here as **data on the outcome**. `OutcomeDefinition.grids` may declare:

- `id` / `title` — tab after Grid view
- `endpoint` — HTTP path the **console** calls (simulator `/sim/grids/{name}` in the POC)
- `method` — `GET` or `POST`
- `params` — list of `{ name, from | value }`

`from` is a field on the current context envelope: `cobDate`, `region`, `groupUnitId`, `kitId`, `instanceId`, `sliceKey`, `account`, `journalId`, `amount`, `fsLine`, `runId`, `status`, `namedBlocker`. `value` is a literal and wins when set.

The console binds those parameters and fetches. Each result renders in **MESCIUS Wijmo FlexGrid**. License key is `VITE_WIJMO_LICENSE` (eval watermark is allowed when unset).

## What this is not

- Not a hub HTTP client or `StepGridClient`
- Not a dedicated `/workspaces` page
- Not kit_destination as the config source (Flyway V8 columns may exist unused)
- Not a rebuilt Motif / Helix / SAP UI
- Not Wijmo analyst studio (pivot / chart)
- Not `if (FOBO)` — FOBO seed is YAML `grids` on `FOBO_HELIX`
- Not Kafka in the browser

## Surface

`GET /api/outcomes/definitions` returns `grids` with the rest of the outcome. Instance and report document render them after **Grid view**. **Onboarding** declares grids on create. **Configuration → Edit** saves `PUT /api/outcomes/definitions/{id}`.

| Source | Result |
|---|---|
| Outcome has `grids` | Instance and report document show them after Grid view |
| Outcome has no `grids` | Those pages omit the Grid view control |
| Instance fold / destinations | Unchanged: `GET /api/stitch/instance/step-view` is event-store GRID or IFRAME |

Bound query chips show method, endpoint, and params. Fail-closed stitch instances still return 404. Simulator `/sim/grids/{name}` is a partner JSON stub, not a rebuilt screen.

## Seed (FOBO_HELIX)

| Grid id | Endpoint | Params from context |
|---|---|---|
| investigation | `/sim/grids/investigation` | cobDate, region, groupUnitId, account, journalId |
| close | `/sim/grids/close` | cobDate, region, groupUnitId, status |

A new grid is a new `/sim/grids/{name}` plus a YAML `grids` entry — no Java type.

## Files

| Area | Change |
|---|---|
| `OneFinUxProperties.OutcomeDefinition` | Optional `grids` (`GridStep`, `GridParam`) |
| `application.yml` | FOBO_HELIX investigation and close |
| Console | `WijmoGrid.jsx`, `bindGridParams.js`, Grid view on instance and report |
| Onboarding | Lineage grids on the create form |
| Configuration | Outcome anatomy lists grids; Edit saves PUT including grids |
| Simulator | `GET /sim/grids/{name}` investigation and close payloads (unchanged stubs) |
| Spec | REQ-CONSOLE-016 / AC-CONSOLE-22 remap |
