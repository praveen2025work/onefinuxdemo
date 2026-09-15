# One Finance UX: Event-Driven Business Outcome Platform (POC)

This POC proves the idea behind *One Finance UX*: stop asking "Is Motif complete? Is SAP ready?" and answer the business question directly. **"Can I produce the 15C3 report?" "Can I execute FOBO analysis?"**

Source systems publish events. The hub translates them into business identifiers and folds them into **business outcomes**. It notifies the right people as each outcome moves through its lifecycle, and it triggers the downstream action (Helix, Axiom) the moment an outcome is ready. Nothing polls.

The requirements and architecture live in [`docs/design/`](docs/design/README.md). This README covers running the POC.

**New to the repo?** Read [`docs/design/start.md`](docs/design/start.md), then open the console at `/guide`. Architecture diagrams: `/architecture`. Product story: `/product`. Pick a **View** (Developer, BU head, RTB, …) if you want a thinner operate/build rail — Guide stays visible. Views are a nav filter, not security.

## What's in the box

| Module | Port | Role |
|---|---|---|
| `onefinux-hub` | 7070 | Event Hub, Translation Layer, Business Outcome Engine, Workflow, Notifications, REST + SSE |
| `frontend/web` | 5173 | React console — the product UI |
| `source-simulator` | 7081 | Stands in for Motif, SAP, GMIS, RAMP, US Castle, Finance Store, Axiom. Also runs mock **Helix** and **Axiom** services that receive commands and publish completions back |

The three outcomes are configured in `onefinux-hub/src/main/resources/application.yml` as metadata, not code:

| Outcome | Question | Inputs | When ready |
|---|---|---|---|
| `FOBO_HELIX` | Can I execute FOBO analysis? | 300 × `MASTERBOOK_READY` (Motif) | Hub triggers Helix and waits for `HELIX_ANALYSIS_COMPLETE` |
| `REPORT_15C3` | Can I produce the 15C3 report? | 5 × each of `SAP_TB_COMPLETE`, `USCASTLE_COMPLETE`, `FINSTORE_LOADED`, `AXIOM_READY` | Hub triggers Axiom and waits for `REG_REPORT_GENERATED` |
| `PNL_REPORTING` | Can I run PnL reporting? | 3 × `GMIS_LOADED`, 2 × `RAMP_CHORUS_READY`, 5 × `SAP_TB_COMPLETE` (shared with 15C3) | Notify only |

## Run it

`./scripts/run.sh` starts the **API only** (hub + simulator). The product UI is the React console on **5173**. Do not open `http://localhost:7070` in a browser expecting a board — that port is REST + SSE.

### 1. Prerequisites

| Need | Notes |
|---|---|
| **Java 21** | Hub and simulator |
| **Maven 3.9+** | Build + the 7 engine tests |
| **Node.js 18+** | React console (`frontend/web`) |
| Disk | No database or broker to install. H2 is a local file in `./data` |

### 2. Start the hub and simulator (terminal 1)

```bash
# macOS / Linux
chmod +x scripts/*.sh    # first clone only
./scripts/run.sh         # build, run engine tests, start hub 7070 + simulator 7081
```

```bat
:: Windows
scripts\run.cmd
```

Wait until the script prints that the hub is up. Then you have:

| Process | URL | What it is |
|---|---|---|
| `onefinux-hub` | http://localhost:7070 | API (REST + SSE). Not the UI. |
| `source-simulator` | http://localhost:7081 | Motif / SAP / Helix / Axiom stand-in |

Skip the Maven rebuild with `./scripts/run.sh --no-build` if the jars already exist.

### 3. Start the React console (terminal 2)

```bash
cd frontend/web
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to 7070 and `/sim` to 7081, so the browser stays on 5173.

### 4. Drive a scenario

1. Go to **http://localhost:5173/drive** (nav: *Drive scenarios*). Product pages stay view-only; this is the only screen that injects facts.
2. Click **Reset** (*Reset platform*) for a clean slate.
3. Click one scenario button, then watch **Board** (`/board`) and **Reports** (`/reports`).

| Drive card | Button | What happens |
|---|---|---|
| FOBO / Helix | Drive | 300 Motif master books fold to ready; the hub commands Helix |
| 15C3 report | Run feeds | Feeds fold to ready; Axiom generates the pack |
| 15C3 with failure | Run + fail | A named feed fails, the outcome goes Blocked, then recovers |
| PnL reporting | Drive | Tight SLA; notify-only (no downstream command) |
| Restate SAP | Restate | Withdraws a prior SAP completion; downstream readiness drops |
| FOBO stitch | Drive | Stitch kit: one instance READY, one BLOCKED on a failed key |
| Run all | Run all | Helix + 15C3 + PnL together |
| Cancel scheduled | Cancel | Stop any drip still queued on the simulator |

Optional CLI walkthrough (same acts, watch the console on 5173): `./scripts/demo.sh` (Windows: `powershell -ExecutionPolicy Bypass -File scripts\demo.ps1`).

### 5. Stop

```bash
./scripts/stop.sh          # hub + simulator
# terminal 2: Ctrl+C the Vite process
```

On Windows, close the two minimised windows titled `onefinux-hub` and `source-simulator`, then stop Vite.

Delete `data/` before a stakeholder demo if you want a fully empty store (the hub re-seeds kits on boot via Flyway).

### 6. Docker alternative (one command)

```bash
docker compose up --build
```

| Process | URL |
|---|---|
| Console | **http://localhost:8080** |
| Hub API | http://localhost:7070 |
| Simulator | http://localhost:7081 |

### 7. Port overrides

If 7070 or 7081 is already taken, `run.sh` rewires both sides (hub callback + simulator URL, simulator hub URL):

```bash
HUB_PORT=7090 SIM_PORT=7091 ./scripts/run.sh
HUB=http://localhost:7090 SIM=http://localhost:7091 ./scripts/demo.sh
```

The Vite proxy still targets 7070 / 7081 unless you change `frontend/web/vite.config.js`. Prefer the default ports for the console, or use Docker.

IDE: run `OneFinUxHubApplication`, then `SourceSimulatorApplication`, then step 3 (Vite).

## Publishing your own events

`http/onefinux.http` has ready-to-run requests for IntelliJ or VS Code REST Client. The contract is `contracts/business-event.schema.json`. The minimum is:

```bash
curl -X POST localhost:7070/api/events -H 'Content-Type: application/json' -d '{
  "eventType":"MASTERBOOK_READY","sourceSystem":"MOTIF","sourceKey":"MB001",
  "cobDate":"2026-09-10","region":"GLOBAL","status":"COMPLETED"}'
```

| Status | Meaning |
|---|---|
| `COMPLETED` | Counts toward readiness. Counted once per distinct key, so re-sends are safe |
| `FAILED` | Blocks the outcome until a later `COMPLETED` for the same key |
| `REVOKED` | Withdraws an earlier completion (restatement or re-run) from every dependent outcome |
| `STARTED` | Informational |

Responses: `202 ACCEPTED`, `200 DUPLICATE` (the same event was already stored), or `400` with an RFC 7807 body naming the bad fields.

The POC validates required fields. The JSON schema is the *target* governed contract (enums for systems and regions, event-type pattern); enforce it at the gateway in Phase 1.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events`, `/api/events/batch` | Publish events |
| GET | `/api/events?limit=` | Event tape |
| GET | `/api/outcomes`, `/api/outcomes/{id}/{cobDate}/{region}` | Outcome answers |
| POST | `/api/outcomes/{id}/{cobDate}/{region}/override` | Manual override `{dependency, reason, requestedBy}` |
| POST | `/api/outcomes/{id}/{cobDate}/{region}/run` | Re-run the downstream action `{requestedBy}` |
| GET | `/api/notifications?limit=` | Notification inbox |
| GET | `/api/stream` | Server-Sent Events: `outcome`, `notification`, `event` |
| GET | `/api/config` | Loaded outcomes, mappings, targets |
| POST | `/api/admin/reset` | Clear everything (demo only) |
| POST | `:7081/sim/scenarios/{helix,15c3,pnl,restate,all,cancel}` | Drive the simulator |

## Notification channels

Every notification is persisted once, then fanned out:

- **In-app**: live over SSE to the console inbox on 5173.
- **Email (simulated)**: written to the `notification.email` logger. Swap `LogEmailChannel` for Spring Mail against the corporate relay.
- **Teams webhook**: disabled by default. Set `onefinux.notifications.webhook-url` to a Teams Workflows URL to enable it.

Milestones default to 50% and 90% (`onefinux.notifications.milestones`). Progress ticks never notify, and a replay never notifies.

## How the code maps to the vision

| Vision component | Package |
|---|---|
| 1 Event Hub | `event` (idempotent ingest, append-only store, replay) |
| 2 Event Translation Layer | `translation` |
| 3 Business Outcome Engine | `outcome` (`OutcomeEngine` is a deterministic fold over the event stream) |
| 4 Workflow Layer | `workflow` (action dispatch, override, re-run, SLA monitor) |
| 5 Unified Finance UX | `api`, `stream`, `frontend/web` |
| Notifications | `notification` |

Design rules the code keeps:

- **Every state change is an event.** This includes the hub's own decisions (`WORKFLOW_ACTION_TRIGGERED`, `WORKFLOW_OVERRIDE`, `WORKFLOW_SLA_BREACHED`), so restarts and audits see the same truth.
- **Readiness counts distinct inputs**, never messages.
- **Downstream completions must echo `runId`**. Results from superseded runs are discarded.
- **Outcomes are metadata.** Adding "Month End Close" is a YAML change, not a code change.

## Tests

```bash
mvn test
```

`OutcomeEngineTest` covers these cases:

- Distinct-input counting.
- One event feeding two outcomes.
- Failure blocking an outcome, and a retry unblocking it.
- A restatement withdrawing readiness.
- Stale run ids being ignored.
- A manual override.
- A silent replay.

## From POC to production (summary; details in `docs/design/`)

The as-built product, architecture diagrams, and demo-vs-later line are in [`docs/design/`](docs/design/README.md). Envelope: `contracts/generic-business-event.schema.json`.

| POC | Production |
|---|---|
| H2 file DB | Oracle 19c (event store, outcome registry, notifications) |
| In-process event publishing | Kafka or the enterprise event bus, with source adapters (CDC/MQ) for systems that cannot publish |
| `application.yml` outcomes | Outcome registry tables with maker-checker |
| No auth | Enterprise SSO and the Central Enterprise Entitlement System |
| Log email, webhook | Corporate SMTP relay, Teams, ServiceNow for breaches |
| Single instance | Active/active with partitioning by `(cobDate, region)` |

## Working with git

The repository lives at `git@github.com:praveen2025work/onefinuxdemo.git`. Build output (`target/`), the H2
database (`data/`) and run logs (`logs/`) are ignored — committing the database would put one machine's demo
state into everyone's checkout.

Clone it somewhere new:

```bash
git clone git@github.com:praveen2025work/onefinuxdemo.git
cd onefinuxdemo && chmod +x scripts/*.sh
```

Commit and push your own changes:

```bash
git checkout -b my-change        # keep main clean
git status                       # confirm no data/ or logs/ crept in
git add -A
git commit -m "feat: short description of what changed"
git push -u origin my-change     # then open a pull request on GitHub
```

Commit messages follow conventional commits — `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

SSH access needs your key registered with GitHub; check it with `ssh -T git@github.com`. On a locked-down
network where SSH to GitHub is blocked, switch the remote to HTTPS instead:
`git remote set-url origin https://github.com/praveen2025work/onefinuxdemo.git`.

## Troubleshooting

- **`Database may be already in use`**: a previous hub is still shutting down and holding the H2 file lock. Wait a few seconds, or use `scripts/stop.sh`, which waits for exit.
- **`release version 21 not supported`**: Maven is using an older JDK. Point `JAVA_HOME` at JDK 21.
- **Ports busy**: `HUB_PORT=7090 SIM_PORT=7091 ./scripts/run.sh` (see *Run it*). Starting the jars by hand instead means setting `server.port`, `onefinux.public-url` and `onefinux.simulator-url` on the hub, and `server.port`, `sim.hub-url` and `sim.allowed-origin` on the simulator. The Vite proxy in `frontend/web/vite.config.js` still points at 7070 / 7081 unless you edit it.
