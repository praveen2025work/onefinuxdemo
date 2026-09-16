# Helix in real time — lead / team walkthrough

How a lead or a joining engineer **runs Helix** on this POC, what they should see, and how that maps to a bank close. Two different Helix stories live in the same app. Do not mix them.

Live visual truth: `frontend/web`. Drive (`/drive`) is the only screen that injects facts. Home, Board and Reports stay view-only.

Play this first: [`helix-walkthrough.mp4`](helix-walkthrough.mp4) (~3 minutes, spoken). It opens on the close-of-business problem, then how outcomes help, then the live FOBO / Helix fold. Voice-only: [`helix-walkthrough.mp3`](helix-walkthrough.mp3). Script: [`helix-narration.txt`](helix-narration.txt).

If the in-browser player is muted, unmute the speaker icon on the video, or play the mp3.

---

## Who does what

| Person | Top-bar **View** | Job in this walkthrough |
|---|---|---|
| Engineer / tech lead | Developer or All screens | Reset, Drive Helix, watch Reports + Monitoring |
| Controller | Controller | Sign off / post the **stitch rec** (not the engine Helix run) |
| BU head / MD | BU head | Board traffic lights. Drive leaves the rail on purpose |
| RTB | RTB | Replay a failed Motif key. They do not sign off |

FOBO is the **question** (“Can I execute this rec / this analysis?”). Motif, CATS and MBR **publish**. Helix is a **destination** the hub calls when the fold says READY. Nobody clicks Helix on Home.

---

## The two Helix stories

| | **A. Engine — FOBO / Helix** | **B. Stitch — FOBO rec** |
|---|---|---|
| Question | Can I execute FOBO analysis? | Can I execute **this** rec? |
| Outcome / kit | `FOBO_HELIX` | Kit `FOBO`, instances `R-1042` / `R-2031` |
| Facts | 300 × Motif `MASTERBOOK_READY` | CATS `TRADE_BOOKED` + Motif `LEDGER_*` + MBR `BREAK_CLEARED` |
| Helix | Hub **POSTs** `http://localhost:7081/helix/analysis`. Helix later publishes `HELIX_ANALYSIS_COMPLETE` | Partner iframe + echo fact `HELIX_ANALYSIS_COMPLETE` / `RUN-A37C` on the **ready** row |
| Watch | **Reports** | **Board** / **My outcomes** / instance |
| Drive card | **FOBO / Helix** | **FOBO stitch** |
| Header **COB** | **Today** (simulator zone `America/New_York`) | **2026-09-12** |

A real close uses **both**: Motif books land → hub calls Helix (A). Controllers still sign the named rec on the board (B).

---

## Story A — run Helix like production (Reports)

This is the path a lead should demo first: origins publish, the hub folds, Helix is commanded, Helix reports back. **No polling.**

### 0. Stack (once per machine)

```bash
./scripts/run.sh                          # hub 7070 + simulator 7081 — not the UI
cd frontend/web && npm install && npm run dev   # console http://localhost:7091
```

Do not open `http://localhost:7070` as the product. Vite on **7091** proxies `/api` → hub and `/sim` → simulator.

### 1. Console setup (~20 seconds)

1. Open **http://localhost:7091**.
2. Top bar **View** → **All screens** (or **Developer**).
3. Set **COB** to **today**. The Helix engine scenario stamps `LocalDate.now(America/New_York)`. If the date picker is still `2026-09-12`, Reports will show the stitch day, not the Helix run.
4. Region can stay **all regions**. Group unit **REV-ACC**.
5. Left rail **Guide** → skim [Product](/product) then [Architecture](/architecture) so the two models are clear.

### 2. Clean slate

1. Rail **Drive scenarios** (`/drive`).
2. Click **Reset**. That re-seeds stitch instances **and** engine outcomes (`POST /api/stitch/reset` + `POST /api/admin/reset`).
3. Open **Reports** in another tab if you can. Product pages must stay quiet — you will Drive from `/drive` only.

### 3. Drive FOBO / Helix

On Drive, card **FOBO / Helix** → **Drive**.

What the simulator does (same as Motif on a bus in the bank):

1. Schedules **300** Motif facts, type `MASTERBOOK_READY`, keys `MB001`…`MB300`, region `GLOBAL`, over ~**45 seconds**.
2. Each fact is `POST /api/events` on the hub (idempotent on `eventId`).

What the hub does (this is the product):

3. Outcome `FOBO_HELIX` expected-count **300**. Stage **FEEDS** while books arrive; percent climbs on Reports.
4. At 300 distinct books → **READY**. On-ready is `HTTP_COMMAND` / target `helix`.
5. ActionExecutor POSTs `http://localhost:7081/helix/analysis` with `runId`, COB, region, `inputs: 300`, `completionEvent: HELIX_ANALYSIS_COMPLETE`.
6. Mock Helix returns **202 ACCEPTED** immediately, “runs” ~**6 seconds**, then publishes `HELIX_ANALYSIS_COMPLETE` with that `runId`.
7. Engine: **READY → PROCESSING → GENERATED**. Watch **Reports**, not Home.

Same shape in production: Motif (or CDC) → `POST /api/events`; `action-targets.helix.url` points at real Helix; Helix’s callback is another fact on the hub. Heavy recon stays in Helix; we hold the fact + run id.

### 4. What to look at, in order

| Clock | Screen | You should see |
|---|---|---|
| 0–45s | **Reports** | Row **FOBO investigation** / “Can I execute FOBO analysis?” — feeds `n/300`, stage FEEDS |
| ~45s | **Reports** | READY, then PROCESSING (command in flight) |
| ~51s | **Reports** | GENERATED. Result summary: Helix analysed 300 books, N breaks |
| anytime | **Monitoring** | Tape: `MASTERBOOK_READY` then `HELIX_ANALYSIS_COMPLETE`. Outbox if routes fan out |
| anytime | **Configuration** | Pick outcome `FOBO_HELIX` — feeds, SLA 5 minutes, on-ready `HTTP_COMMAND` → helix |

Optional curl (same facts Drive sends):

```bash
curl -s -XPOST http://localhost:7070/api/admin/reset
curl -s -XPOST 'http://localhost:7081/sim/scenarios/helix?masterBooks=300&seconds=45'
curl -s http://localhost:7070/api/outcomes | python3 -m json.tool | less
```

Filter the JSON for `"outcomeId": "FOBO_HELIX"`. `stage` should move `NOT_STARTED` → `FEEDS` → `READY` → `PROCESSING` → `GENERATED`.

### 5. If it does not move

| Symptom | Cause | Fix |
|---|---|---|
| Reports empty / old 15C3 only | Header COB is not **today** | Change the date picker |
| Stuck at 300 FEEDS, never READY | Previous run already counted; or reset skipped | Drive **Reset**, Drive Helix again |
| READY but never PROCESSING | Helix URL down | Simulator must be on **7081**. Hub log: `action-targets.helix.url` |
| PROCESSING forever | Completion missing `runId` | Stale completions are ignored. Check Monitoring for `HELIX_ANALYSIS_COMPLETE` |
| “Already ran” / keys de-duped | Same `sourceKey` replayed | Reset, or new keys |

---

## Story B — the rec a controller signs (Board)

Do this **second**, with header **COB = 2026-09-12**.

1. Drive → **Reset** (if you just ran Helix, reset again).
2. Drive card **FOBO stitch** → **Drive** (~7 seconds, 7 facts).
3. **Board** / **Home**: APAC **R-1042 READY** (CATS TR-8812, Motif MB012, MBR BK-4410, Helix echo **RUN-A37C**). EMEA **R-2031 BLOCKED** on Motif **MB014**.
4. View → **Controller** → **My outcomes** → open **R-1042**. Sign off (CLEARED) or **Post to Motif** via FAS. Helix on this screen is the **iframe**, not a Home button.
5. Open **R-2031**. Named blocker only. **Escalate** to RTB. Do not invent a fix.
6. View → **RTB** → **Operations**: dead letter `DL-4402`, escalation `ESC-19`, replay.

Helix does **not** decide READY. The fold does. The controller does not re-run Helix to discover status.

---

## Production mapping (what you will change later)

| POC | Bank |
|---|---|
| Simulator POSTs facts | Motif / CATS / MBR on Kafka / MQ / CDC → same `POST /api/events` (or a thin adapter) |
| `http://localhost:7081/helix/analysis` | Real Helix command URL in `application.yml` `action-targets.helix.url` |
| 6s fake work | Helix job; completion is still an event with `runId` |
| Entitlement fail-open | CEES fail-closed; unentitled instance = **404** |
| Drive buttons | Batch / bus only. Never put scenario buttons on Home or Reports |

Do **not** add `if (FOBO)` or a Helix-specific Java type. The next analysis product is another outcome row: feeds + `HTTP_COMMAND` + `completionEvent`.

---

## Code map (when you start changing it)

| Path | Helix-related job |
|---|---|
| `onefinux-hub/.../application.yml` | `FOBO_HELIX` definition, `action-targets.helix.url` |
| `onefinux-hub/.../workflow/` | `ActionExecutor` `HTTP_COMMAND` |
| `source-simulator/.../DownstreamMocks.java` | Mock Helix 202 + delayed `HELIX_ANALYSIS_COMPLETE` |
| `source-simulator/.../ScenarioService.java` | `helix()` 300 books; `fobo()` stitch + RUN-A37C |
| `frontend/web/src/pages/Drive.jsx` | The only Helix **Drive** button |
| `frontend/web/src/pages/Reports.jsx` | Engine stages |
| `frontend/web/src/pages/Product.jsx` | Story copy (`FoboHow`) |

Review against `AGENTS.md` and `.cursor/skills/outcome-engine`, `drive-and-demo`, `colleague-view`, `embed-partner-screen`.
