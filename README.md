# One Finance: Event-Driven Business Outcome Platform (POC)

This POC proves the idea behind *One Finance*: stop asking "Is Motif complete? Is SAP ready?" and answer the business question directly. **"Can I produce the 15C3 report?" "Can I execute FOBO analysis?"**

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
| **Java 21** | Hub and simulator. On Windows set `JAVA_HOME` and put `%JAVA_HOME%\bin` on `PATH` |
| **Maven 3.9+** | Build + the 7 engine tests |
| **Node.js 18+** | React console (`frontend/web`) |
| Disk | No database or broker to install. H2 is a local file in `./data` |
| **Windows local demo** | The three tools above. Numbered steps: [§8](#8-windows-local-demo-vite) |
| **Windows hosted demo** | Plus IIS (Static Content, URL Rewrite, ARR) and [NSSM](https://nssm.cc/download). Numbered steps: [§9](#9-windows-hosted-demo-iis-no-managed-code--nssm) |

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
2. Click **Reset** (*Reset platform*) for a clean slate (stitch **and** engine).
3. Click one scenario button, then watch **Board** (`/board`) and **Reports** (`/reports`).

Helix for a lead or joining engineer (two COBs — do not mix them): [`docs/design/helix-walkthrough.md`](docs/design/helix-walkthrough.md). **FOBO / Helix** uses header date **today**; **FOBO stitch** uses **2026-09-12**.

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

### 8. Windows local demo (Vite)

Use this at your desk. Two terminals. The console is Vite on **5173**; Java runs in two minimised windows. This path was already in §2–§5; the list below is the full Windows sequence in one place.

1. Install **Java 21**, **Maven 3.9+**, and **Node.js 18+**. Confirm with `java -version`, `mvn -version`, `node -v`.
2. Clone the repo and open **Command Prompt** or **PowerShell** at the repo root (the folder that contains `onefinux-hub` and `frontend`).
3. Build and start the Java processes:

   ```bat
   scripts\run.cmd
   ```

   Wait until it prints that the hub is up. That starts `onefinux-hub` on **7070** and `source-simulator` on **7081**. Skip the Maven rebuild next time with `scripts\run.cmd --no-build`.
4. In a **second** terminal:

   ```bat
   cd frontend\web
   npm install
   npm run dev
   ```

5. Open **http://localhost:5173**. Vite proxies `/api` → 7070 and `/sim` → 7081, so the browser stays on 5173.
6. Drive a scenario: **http://localhost:5173/drive** → **Reset** → one scenario button. Watch **Board** and **Reports**. Optional scripted walkthrough: `powershell -ExecutionPolicy Bypass -File scripts\demo.ps1`.
7. Stop: close the two minimised windows titled `onefinux-hub` and `source-simulator`, then Ctrl+C in the Vite terminal. Delete `data\` before a stakeholder run if you want an empty store.

This is not an IIS host. Closing the two Java windows stops the API. For a demo box that must stay up after you log off, use §9.

### 9. Windows hosted demo (IIS No Managed Code + NSSM)

Use this to **host** the app on a Windows demo machine: Java as Windows services, React as static files on IIS.

| Piece | How it is hosted | Enabled in this repo |
|---|---|---|
| React console (`frontend/web`) | IIS site, app pool **No Managed Code**, physical path `frontend\web\dist` | Yes — `public\web.config` + `scripts\windows\install-iis-site.ps1` |
| `onefinux-hub` (Java) | NSSM service `OneFinUxHub` | Yes — `scripts\windows\install-nssm.ps1` |
| `source-simulator` (Java) | NSSM service `OneFinUxSimulator` | Yes — same script |
| Same-origin `/api` and `/sim` | IIS URL Rewrite + ARR reverse proxy to `127.0.0.1:7070` / `:7081` | Yes — `web.config` (same layout as Vite and Docker nginx) |
| Live board (SSE `/api/stream`) | ARR proxy enabled, `/api` compression off, 20-minute ARR timeout | Yes — `web.config` + the IIS install script |

**Does React work as a No Managed Code IIS application?** Yes. The console is static files after `npm run build`. There is no ASP.NET assembly. The app pool CLR version is the empty string (`No Managed Code`). IIS only needs Static Content, Default Document, URL Rewrite, and ARR.

**Does Java work as NSSM services?** Yes. Both jars run with `AppDirectory` = the repo root so H2 stays at `.\data\onefinux-hub`. Hub callbacks stay on `http://localhost:7070` (the simulator talks to the hub directly; the browser never does).

Do **not** point the browser at 7070, and do **not** skip ARR and open the IIS site on one origin while calling 7070 on another. The console uses relative `/api` and `/sim`. Hub CORS allows only `http://localhost:*` and `http://127.0.0.1:*`. Same-origin ARR is the supported host path.

#### Prerequisites (hosted)

1. Java 21, Maven 3.9+, Node.js 18+ (same as §1).
2. [NSSM](https://nssm.cc/download) — put `nssm.exe` on `PATH`.
3. IIS with **Static Content** and **Default Document**.
4. [URL Rewrite 2.1](https://www.iis.net/downloads/microsoft/url-rewrite) and [Application Request Routing 3](https://www.iis.net/downloads/microsoft/application-request-routing). After ARR is installed, the install script turns **Enable proxy** on. If you configure IIS by hand: IIS Manager → server node → **Application Request Routing Cache** → **Server Proxy Settings** → tick **Enable proxy**.

#### Numbered host steps

1. Open **Command Prompt** at the repo root. Build the jars and the IIS site root (`dist` includes `web.config`):

   ```bat
   scripts\windows\build-demo.cmd
   ```

2. Open **elevated** PowerShell (Run as administrator). Install and start the two Java services:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\windows\install-nssm.ps1
   ```

   Confirm `Get-Service OneFinUxHub, OneFinUxSimulator` shows **Running**. Logs: `logs\nssm-hub.out.log` and `logs\nssm-sim.out.log`.

3. Still elevated, create the IIS site (port **8080**, app pool **No Managed Code**):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\windows\install-iis-site.ps1
   ```

4. Check the host:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\windows\check-host.ps1
   ```

5. Open **http://localhost:8080**. Drive from **http://localhost:8080/drive**. Product routes (`/board`, `/reports`, `/guide`) fall back to `index.html` through `web.config`.

6. Optional scripted walkthrough against the same-origin site still talks to the hub on 7070: `powershell -ExecutionPolicy Bypass -File scripts\demo.ps1`.

7. Stop / remove later (elevated):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\windows\uninstall-iis-site.ps1
   powershell -ExecutionPolicy Bypass -File scripts\windows\uninstall-nssm.ps1
   ```

   That removes the site, the app pool, and the two services. It does not uninstall IIS, ARR, or NSSM.

Rebuild after a UI or Java change: run `scripts\windows\build-demo.cmd` again. NSSM keeps using the same jar paths, so restart the services (`Restart-Service OneFinUxHub, OneFinUxSimulator`). IIS already points at `frontend\web\dist`; recycle the app pool if the browser keeps an old bundle.

Change the IIS port with `install-iis-site.ps1 -SitePort 80`. Change Java ports with `-HubPort` / `-SimPort` on the NSSM script **and** edit the rewrite URLs in `frontend/web/public/web.config` before you rebuild.

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

- **Desktop card (outside the browser):** the same live payload as a Windows / macOS system card — One Finance icon, title, preview, **Open** / **Dismiss**, and **X**. Keep the One Finance tab loaded. Click **Desktop alerts** once if the browser asks. Drive a scenario. Closing the browser cannot deliver a card.
- **In-app inbox:** the bell still lists history. It is not the toast.
- **Email (simulated):** `notification.email` logger. Swap `LogEmailChannel` for Spring Mail against Exchange for real Outlook mail.
- **Teams webhook:** set `onefinux.notifications.webhook-url`.
- **Email (simulated)**: `notification.email` logger. Swap `LogEmailChannel` for Spring Mail against Exchange for real Outlook mail.
- **Teams webhook**: set `onefinux.notifications.webhook-url`.

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

- **`Database may be already in use`**: a previous hub is still shutting down and holding the H2 file lock. Wait a few seconds, or use `scripts/stop.sh`, which waits for exit. On Windows stop the minimised `onefinux-hub` window or `Stop-Service OneFinUxHub`.
- **`release version 21 not supported`**: Maven is using an older JDK. Point `JAVA_HOME` at JDK 21.
- **Ports busy**: `HUB_PORT=7090 SIM_PORT=7091 ./scripts/run.sh` (see *Run it*). Starting the jars by hand instead means setting `server.port`, `onefinux.public-url` and `onefinux.simulator-url` on the hub, and `server.port`, `sim.hub-url` and `sim.allowed-origin` on the simulator. The Vite proxy in `frontend/web/vite.config.js` still points at 7070 / 7081 unless you edit it.
- **IIS site loads but Drive / Board stay empty**: ARR proxy is off, or URL Rewrite is missing. The console calls relative `/api` and `/sim`. Enable proxy (README §9) and rerun `scripts\windows\check-host.ps1`.
- **Live board never updates on IIS**: SSE is `/api/stream`. Confirm ARR **Enable proxy**, that `/api` compression is off in `web.config`, and that the hub service is running (`Get-Service OneFinUxHub`).
- **NSSM starts then immediately stops**: `logs\nssm-hub.err.log`. Usual causes: Java is not 21, the jar is missing (`build-demo.cmd`), or `AppDirectory` is not the repo root (H2 path `./data/onefinux-hub`).
