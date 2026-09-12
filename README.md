# One Finance UX: Event-Driven Business Outcome Platform (POC)

This POC proves the idea behind *One Finance UX*: stop asking "Is Motif complete? Is SAP ready?" and answer the business question directly. **"Can I produce the 15C3 report?" "Can I execute FOBO analysis?"**

Source systems publish events. The hub translates them into business identifiers and folds them into **business outcomes**. It notifies the right people as each outcome moves through its lifecycle, and it triggers the downstream action (Helix, Axiom) the moment an outcome is ready. Nothing polls.

The requirements live in `docs/One_Finance_UX_BRD.docx`. This README covers running the POC.

## What's in the box

| Module | Port | Role |
|---|---|---|
| `onefinux-hub` | 7070 | Event Hub, Translation Layer, Business Outcome Engine, Workflow, Notifications, live board |
| `source-simulator` | 7081 | Stands in for Motif, SAP, GMIS, RAM, US Castle, Finance Store, Axiom. Also runs mock **Helix** and **Axiom** services that receive commands and publish completions back |

The three outcomes are configured in `onefinux-hub/src/main/resources/application.yml` as metadata, not code:

| Outcome | Question | Inputs | When ready |
|---|---|---|---|
| `FOBO_HELIX` | Can I execute FOBO analysis? | 300 × `MASTERBOOK_READY` (Motif) | Hub triggers Helix and waits for `HELIX_ANALYSIS_COMPLETE` |
| `REPORT_15C3` | Can I produce the 15C3 report? | 5 × each of `SAP_TB_COMPLETE`, `USCASTLE_COMPLETE`, `FINSTORE_LOADED`, `AXIOM_READY` | Hub triggers Axiom and waits for `REG_REPORT_GENERATED` |
| `PNL_REPORTING` | Can I run PnL reporting? | 3 × `GMIS_LOADED`, 2 × `RAM_CHORUS_READY`, 5 × `SAP_TB_COMPLETE` (shared with 15C3) | Notify only |

## Run it

Prerequisites: **Java 21** and **Maven 3.9+**. No database or broker to install; H2 runs as a local file in `./data`.

```bash
# macOS / Linux
./scripts/run.sh          # builds, runs the 7 engine tests, starts both apps
./scripts/demo.sh         # guided 5-act stakeholder demo
./scripts/stop.sh
```

```bat
:: Windows
scripts\run.cmd
powershell -ExecutionPolicy Bypass -File scripts\demo.ps1
```

Or run each module from the IDE: `OneFinUxHubApplication` then `SourceSimulatorApplication`.

Open **http://localhost:7070**. The buttons across the top drive the simulator, so you can demo without a terminal.

If 7070 or 7081 is already taken (common on a corporate build), override the ports. `run.sh` rewires both
sides of the conversation for you — the hub's callback URL and simulator URL, and the simulator's hub URL
and allowed CORS origin:

```bash
HUB_PORT=7090 SIM_PORT=7091 ./scripts/run.sh
HUB=http://localhost:7090 SIM=http://localhost:7091 ./scripts/demo.sh
```

Use `./scripts/run.sh --no-build` to start from the jars you already built, and delete `data/` beforehand
if you want a clean board for a stakeholder demo.

## Demo script (about 5 minutes)

1. **Helix / FOBO.** Click *Run Helix scenario*. The 300-square grid fills as master books arrive. The progress, ETA and notifications fire at 50% and 90%. At 300/300 the hub calls Helix itself, and the card flips to **Done** with the break count Helix reported back.
2. **15C3 with a failure.** Click *Run 15C3 with a failure*. US Castle BATCH-03 fails, and the card goes **Blocked** naming the batch. US Regulatory Reporting gets a critical alert. The batch recovers and the report is generated automatically.
3. **PnL.** Click *Run PnL scenario*. The inputs drip in slowly, so the hub warns *before* the deadline (at risk), then records the breach as an auditable event.
4. **Restatement.** After 15C3 shows Done, click *Restate SAP trial balance*. SAP revokes CC-4430, and every outcome that used it loses readiness with a critical notification. When SAP re-publishes, Axiom re-runs with a **new run id**. Late results from the old run are ignored.
5. **Human in the loop.** Expand *Override an input* on a blocked or late card and give a reason. The override is stored as an event and announced, and it is audited like any other fact.

Stop the hub and start it again: the board is rebuilt exactly from the event store, SLA breaches included, and no notifications are re-sent.

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

- **In-app**: live over SSE to the board's inbox.
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
| 5 Unified Finance UX | `api`, `stream`, `static/index.html` |
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

## From POC to production (summary; details in the BRD)

The target enterprise architecture — event bus, outcome registry / Admin, FOBO and regulatory-report readiness rules, entitlements, the unified WisMO / template report viewer, advisory LLM, and Barclays Now tasks — is specified in [`docs/superpowers/specs/2026-09-12-enterprise-event-platform-design.md`](docs/superpowers/specs/2026-09-12-enterprise-event-platform-design.md). Flagship architecture, transport choice (SSE vs Kafka vs AWS), screen inventory, and engineering principles: [`docs/superpowers/specs/2026-09-12-flagship-architecture-and-experience.md`](docs/superpowers/specs/2026-09-12-flagship-architecture-and-experience.md). Monorepo layout per component and multi-developer agentic skills/plugins: [`docs/superpowers/specs/2026-09-12-project-structure-and-agentic-team.md`](docs/superpowers/specs/2026-09-12-project-structure-and-agentic-team.md). Visuals: [`docs/design/dreamliner/index.html`](docs/design/dreamliner/index.html). Envelope: `contracts/generic-business-event.schema.json`.

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
- **Ports busy**: `HUB_PORT=7090 SIM_PORT=7091 ./scripts/run.sh` (see *Run it*). Starting the jars by hand instead means setting `server.port`, `onefinux.public-url` and `onefinux.simulator-url` on the hub, and `server.port`, `sim.hub-url` and `sim.allowed-origin` on the simulator.
