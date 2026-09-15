# Build vs buy — why this outcome layer is in-house

Owner: Praveen Kumar · Audience: architecture group, CIO / MD, enterprise architecture · Status: companion to `architecture-group.md` and `executive-brief.md`.

This note backs the plan: **reuse the bank’s bus and batch engines; build a thin outcome layer in-house.** It is written for a room that will ask “why not Kafka?”, “why not Airflow?”, and “why not zero new code?”

The working proof is the POC in this repo (`onefinux-hub` + `frontend/web`). Production swaps adapters (Kafka, CEES, live Helix), not the fold.

---

## 0. Decision in one page

| Question | Answer |
|---|---|
| Can a vendor product replace One Finance UX with **no new code**? | **No.** |
| Do we rebuild Motif, Helix, Kafka, Airflow, CEES? | **No.** |
| What do we **buy / already own**? | Bus (Kafka / Solace / MQ), identity + CEES, systems of record, batch schedulers, observability. |
| What do we **build**? | A thin **outcome layer**: ingest a fact, fold distinct keys into Ready / Blocked / Delayed, command a destination only when READY, entitle the row fail-closed, audit the human step, show one board. |
| Why in-house? | The fold, entitlement contract, and control surface are **bank close semantics**. They are not a Kafka feature, not an Airflow DAG, and not a BI dashboard. Every team that skips this layer will re-implement Ready/Blocked in a different tool. |

**Plan the architecture group is asked to endorse**

```
Origins (Motif, CATS, MBR, SAP, …)  --facts-->  Kafka / Solace
                                                      |
                                                      v
                                            One Finance hub (this code)
                                              fold + command + audit
                                                      |
                      +-------------------------------+-------------------------------+
                      |                               |                               |
                      v                               v                               v
              Helix / Axiom / FAS              entitled console                  Airflow / Control-M
              (destinations; heavy recon)      (Board, Reports, sign-off)        (batch AFTER ready)
```

Kafka moves bytes. Airflow runs jobs **after** the fold says ready. This hub **decides** ready, names the blocker, and is the only place a controller signs.

---

## 1. What leaders are comparing (and why the comparison is usually wrong)

The estate already has excellent tools. They solve **adjacent** problems. Treating them as substitutes for the outcome layer is a category error.

| Tool people name | What it is good at | What the close actually needs | Gap |
|---|---|---|---|
| **Kafka / Solace / MQ** | Durable log, fan-out, back-pressure, replay of *messages* | One row per outcome × COB × region with a **business** status | A topic offset is not “R-2031 BLOCKED on Motif MB014” |
| **Kafka Connect / CDC** | Getting DB/Q changes onto the bus | A canonical fact (`eventType`, `sourceKey`, `cobDate`) | Still need a contract and a fold |
| **Kafka Streams / Flink / ksqlDB** | High-volume matching, windows, joins | Distinct-key fold + SLA + command + UI + CEES | Streaming SQL is not fail-closed sign-off |
| **Airflow / Control-M / Autosys** | Scheduled DAGs, batch SLAs, operator UI for *jobs* | Event-driven fold while 300 books drip in over ~45s | Polling Motif recreates the late/racy close |
| **Camunda / Temporal / BPMN** | Orchestrating **steps you write** | Subscribe to origin facts; fold keys; entitle the artefact | You still write adapters, fold, console, CEES |
| **NiFi / Informatica** | Pipeline plumbing | Named blocker, run-id command, dual-control replay | ETL is not a control surface |
| **Grafana / Splunk / Prometheus** | Service health, lag, error rate | “Can I execute this rec?” | Green consumer-lag is not READY |
| **Power BI / Tableau / Fabric** | Historic packs, after-the-fact MI | Live command + 404 for unentitled rows | A report is not a system of decision |
| **ServiceNow / Jira** | Tickets **after** escalate | The fold **before** a ticket exists | Tickets duplicate status; they do not create it |
| **Power Automate / n8n / Zapier** | Lightweight glue for office workflows | Deterministic, replayable, regulated close | Not fail-closed CEES; not audit-grade event store |
| **Palantir / Foundry / similar** | Data platform + apps, long integration | Thin stitch over **unchanged** systems of record | Rip-and-replace / data-copy is the opposite of this plan |
| **Helix / Motif / CATS / MBR / Axiom** | Heavy recon, books, breaks, packs | One answer across them | We must **not** clone their screens |

The POC already states the production mapping: simulator POSTs are the stand-in for Motif-on-Kafka; `action-targets.helix.url` is the stand-in for real Helix. Same fact shape. `helix-walkthrough.md`, `architecture-group.md` §6.

---

## 2. The in-house slice — five capabilities no platform product owns together

These are implemented in `onefinux-hub` today. They are the justification, not a slide.

### 2.1 Distinct-key fold (engine)

An outcome is READY only when **every expected distinct `sourceKey`** has `COMPLETED`. Re-sending the same key does not double-count. One `FAILED` key **blocks**. `REVOKED` **withdraws** a prior completion (restatement). Completions of a downstream command are ignored unless they carry the **same `runId`** the hub minted.

That is unit-tested, not implied:

- `becomesReadyOnlyWhenEveryDistinctInputHasArrived` — duplicate `CC-4410` does not count twice; 75% until the last distinct key.
- `oneEventFeedsEveryOutcomeThatDependsOnIt` — one SAP fact feeds both 15C3 and PnL.
- `failureBlocksAndRetryUnblocks`.
- Stale `runId` is ignored (`OutcomeEngine.applyActionResult`).

Code: `OutcomeEngine`, `OutcomeEngineTest`. Kafka can store those facts. Kafka will not derive this status.

### 2.2 Stitch fold (human rec)

For a named instance (R-1042 / R-2031):

- any required key `FAILED` → **BLOCKED** with a **named blocker** (`MOTIF MB014 FAILED`)
- else any key `WAITING` → **NOT_YET** (or DELAYED past SLA)
- else all required sources `COMPLETED` → **READY**
- Helix on this path is an **echo of `runId`**, not a Home button
- no `if (kit == FOBO)`

Code: `StitchFold`. A Grafana count of `LEDGER_REJECTED` does not produce instance R-2031 or escalation ESC-19.

### 2.3 Command on ready — no polling

When the engine hits READY and `onReady.action` is `HTTP_COMMAND`, `HttpCommandExecutor` POSTs Helix/Axiom with `runId`, COB, region, inputs. Helix answers 202 and later **publishes** `HELIX_ANALYSIS_COMPLETE` as another fact. The hub never polls Helix.

Airflow *could* POST Helix on a schedule. It cannot know “300 distinct books just landed for this COB” unless it **reimplements the fold**. At that point you have written this hub inside a DAG, poorly.

### 2.4 Fail-closed entitlement and audited human commands

Unentitled / unknown instance → **404, never 403** (existence must not leak). Sign-off, post, escalate are workflow events through the hub so they **replay**. Views in the UI only hide the rail; they are not CEES.

Code: `StitchController`, `StitchService`, `Entitlements`. Power BI RLS and a ServiceNow ACL are not this contract.

### 2.5 Outbox + audit + browser transport

Fact persist and fan-out are the same flow (`PropagationService` transactional outbox). Relay is at-least-once; subscribers de-dupe on `eventId`. Replays at startup **do not** re-propagate. Browsers get REST snapshots + **SSE**. Nothing in the browser talks to Kafka.

That last sentence is a hard architecture rule (`architecture-group.md` §8). Putting a KafkaJS consumer in Chrome would fail security review even if someone called it “zero extra backend”.

---

## 3. Worked example: FOBO / Helix (why Airflow + Kafka is not enough)

**Production shape (already demoed)**

1. Motif publishes 300 × `MASTERBOOK_READY` (keys `MB001`…`MB300`), COB = today (NY).
2. Hub counts **distinct** books on outcome `FOBO_HELIX`. Stage FEEDS while `n < 300`.
3. At 300 → READY. `ActionExecutor` POSTs Helix (`runId`, COB, region, `inputs: 300`, `completionEvent: HELIX_ANALYSIS_COMPLETE`).
4. Helix 202, ~6s work, publishes completion with **that** `runId`.
5. Stage PROCESSING → GENERATED. Controller watches **Reports**, not Home.
6. Monitoring tape shows the facts. Outbox fans out if routes exist.

**If we only had Kafka**

- 300 messages on `motif.book.lifecycle` — ops can prove produce/consume.
- Nobody can answer “can I execute FOBO analysis?” without a consumer that **is** this fold.
- Helix still needs a command **once**, not 300 times, and a callback with `runId`. That consumer is the hub.

**If we only had Airflow**

Typical DAG: `sleep → poll Motif API → if count>=300 trigger Helix → poll Helix`.

| Failure | What happens in Airflow | What happens in this fold |
|---|---|---|
| Same book published twice | Easy to double-count | Distinct `sourceKey`; duplicate is a no-op |
| Book 147 fails | Job fails or continues with a generic error | Named key; BLOCKED; RTB replay |
| Helix completion for yesterday’s run | Easy to apply to today’s DAG run | Stale `runId` ignored |
| Motif late by 20s | Next poke interval (often minutes) | Event arrives, fold updates immediately |
| Controller signs the rec | Not Airflow’s job | Stitch instance + audit event |
| Next outcome (month-end) | New DAG, new operators, new SLA code | `POST /api/outcomes/definitions` — data |

**If we mix Kafka + Airflow + Grafana (the usual counter-proposal)**

| Layer | Role in the mix | Still missing |
|---|---|---|
| Kafka | Transport | Fold, CEES, UI, command-once |
| Airflow | Maybe generate 15C3 **after** READY | Must not wait on feeds |
| Grafana | Hub lag, outbox depth | Not the board |
| **This hub** | Fold, command, entitle, audit, console | — |

That mix **is** the plan. The hub is the missing piece, not a rival to Kafka.

---

## 4. Cost of *not* building the layer (the real alternative)

The alternative is not “zero code”. It is **N copies of the same code**, one per team:

| Team | Typical shadow fold | What breaks at group level |
|---|---|---|
| FOBO | Spreadsheet / Helix screen / chat | Head cannot see Ready/Blocked without asking |
| 15C3 | Control-M job + email | Different status words than FOBO |
| PnL | “wait for SAP” checklist | Shared SAP fact counted twice or not at all |
| RTB | Ticket queues | No named key; replay is tribal knowledge |
| Audit | Screenshot packs | No append-only event + who/when/why |

That is the problem statement already agreed in `architecture-group.md` §1: each origin has its own status word; there is no single row for outcome × date × region × run.

**Build once as data** (`OutcomeDefinition` + kit rows) vs **build per product as a Java service / DAG / dashboard**. The POC’s test of that claim is onboarding Month-end close from the console with no new type. `onboarding.md`, `OutcomeEngine.register`.

---

## 5. What we refuse to build (so the plan stays thin)

| Do not build in this repo | Because the bank already has |
|---|---|
| Kafka / Solace brokers | Enterprise event platform |
| Motif books grid, Helix recon, Axiom pack UI | Partner systems; we **iframe** Helix when needed |
| CEES / IdP | Enterprise entitlement |
| Airflow/Control-M replacements | Batch estate — use **after** READY |
| Second mobile product | Wrap the same responsive shell |
| LLM on the Ready/Blocked fold | Advisory only (ETA / explanation). The fold stays deterministic. |
| `if (FOBO)` modules | Next product is configuration |

Scope line (demo vs later) remains: real Kafka watermarks, live CEES fail-closed, live Helix URL — **adapters**, not a new product. `architecture-group.md` §6.

---

## 6. Production mix (how Kafka and Airflow sit *with* this code)

### 6.1 Ingest

```
Motif / CATS / MBR / SAP  →  Kafka topic (CloudEvents)
                              →  thin adapter  →  POST /api/events  (same JSON Schema as the POC)
```

The adapter is tens of lines per origin, not a new fold. Idempotency stays on `eventId`.

### 6.2 Command

```
hub ActionExecutor  →  HTTP_COMMAND
                    →  real Helix / Axiom URL  (application.yml action-targets)
Helix job finishes  →  fact HELIX_ANALYSIS_COMPLETE { runId }  →  same ingest path
```

Optional: Axiom generation **job** is submitted to Airflow/Control-M **by** Helix/Axiom themselves, or by a destination adapter. The hub still only knows READY → command → completion fact.

### 6.3 Browser

```
hub REST + SSE  →  frontend/web
Kafka           →  never in the browser
```

### 6.4 Batch that is allowed

Airflow/Control-M may:

- load warehouses **after** `GENERATED` / `AVAILABLE`
- run overnight restatements that **publish** `REVOKED` facts into the hub
- operate the hub itself (deploy, backup)

Airflow/Control-M may **not**:

- be the system of record for Ready/Blocked
- poll Motif to decide Helix
- own controller sign-off

---

## 7. Objection register (architecture-room FAQ)

**Q1. Why not wait for a vendor “outcome fabric” / “control tower” RFP?**  
Because the close is running now, the facts already exist, and the fold is small and specific (distinct keys, named blocker, run-id command, CEES 404). An RFP does not stitch REV-ACC tomorrow. The POC is the prototype of the standard; production is the same API with real adapters.

**Q2. Isn’t this an ESB / another canonical model?**  
No. We do not own Motif’s book or Helix’s breaks. We own a **fact envelope** and a **fold**. Origins stay origins. That is the opposite of a canonical data warehouse.

**Q3. Flink could count 300 MASTERBOOK_READY.**  
It could. Then you still need: COB/region partitioning, SLA, HTTP command, run-id match, Reports UI, CEES, sign-off, outbox, audit. Flink is an optional acceleration **inside** the hub for volume, not a replacement of the product.

**Q4. Temporal/Camunda is the industry pattern for this.**  
They orchestrate **our** activities. The activities would be: ingest, fold, command, notify. Those activities **are this hub**. Buying an orchestrator to call our fold does not remove the fold. For this grain (facts on a bus → one row), an event-sourced fold is simpler than a workflow instance per book.

**Q5. Can’t CEES + a portal show a traffic light?**  
A portal can show a colour if something else computes it. The question is **who computes it and who is allowed to act**. Without the hub, each colour is a different team’s query. CEES scopes artefacts; it does not fold Motif keys.

**Q6. Zero-code: ServiceNow IntegrationHub listens to Kafka.**  
You can land messages in a ticket. You cannot (credibly, for a regulated close): distinct-key fold, stale run-id ignore, fail-closed 404, replay-from-event-store, or onboard a new outcome as data. You also couple the close to ticket SLAs.

**Q7. What about Microsoft Fabric / Databricks dashboards on the Kafka lake?**  
Excellent for **yesterday’s** MI. The controller’s question is **this COB, this minute**, and the action is a command + sign-off. Lakehouse latency and interactive BI identity are the wrong control plane.

**Q8. Palantir / similar can build the app.**  
They can build *an* app, usually by copying data. This plan is **subscribe, don’t replace**. Cost, lock-in, and “second Motif” risk are why the architecture group already drew systems of record as **unchanged**. `architecture.md` diagram 1.

**Q9. How much code is “thin”?**  
Three processes: hub, console, simulator (sim dies in production). New outcomes = YAML / `POST /definitions`. New on-ready type = one `ActionExecutor` bean. New kit verb = `userActions` data. That is the extensibility test.

**Q10. Duplicate of Notification / Barclays Now?**  
Notifications are a **channel**. The fold is the **source of truth**. Now can wrap the same events later (`architecture-group.md` §6). Do not put Ready/Blocked only in a push message.

**Q11. Duplicate of IBOR / recon platforms?**  
Those own positions and breaks. We own **whether the business question can proceed**. Helix keeps recon; we keep the fact + run id + deep link.

**Q12. What if Kafka already has a ksql “ready” table?**  
Then that table **is** an unofficial fold, unentitled, unsigned, and not reused by 15C3. Promote the fold into this hub (one contract) or you will debug two truths every COB.

**Q13. Availability: another runtime?**  
Yes — a small one. It is stateless-per-fold, rebuilds from the event store, and is cheaper than N Airflow pools doing the same wait. DR/NFR evidence is the next hardening step, not a reason to skip the layer. `executive-brief.md` §8.

**Q14. Data residency / PII?**  
We store facts and keys (book ids, run ids), not Helix’s full recon set. Heavy payloads stay in the origin. That is a **reduction** of data sprawl versus copying grids into a new warehouse.

**Q15. Maker-checker / SOX?**  
Human commands are already events (who/when/why). Production adds maker-checker in front of `POST /definitions` and dual-control replay (RTB already has the dual-control replay path on Operations). The event store is the evidence pack.

**Q16. Why a custom UI instead of extending Motif?**  
Motif cannot see CATS+MBR+Helix as one rec. Helix cannot entitle a FOBO instance as CEES `product:FOBO`. The board is **cross-origin by design**. Partner screens stay iframes.

**Q17. Can we open-source / buy “event-driven architecture” training instead of code?**  
Training does not ship R-1042 READY. The POC *is* the pattern library: ingest, fold, command, SSE.

**Q18. Timeline vs waiting for enterprise Kafka programme X?**  
The POC ingest is already the production API. Kafka programme X becomes the adapter behind `/api/events`. Waiting on X before agreeing the fold means every team invents a fold in the meantime.

**Q19. How do we prove we will not grow into a monolith that rebuilds Helix?**  
Written non-goals: no book grid, no Drive on Home, no `if (FOBO)`, LLM off the fold, Configuration is not a create form. Skills and PR checklist enforce this. `as-built.md` “What not to do”.

**Q20. What do we measure after go-live?**  
Not “Kafka messages processed”. Measure: time-to-named-blocker, % outcomes READY before SLA, sign-offs on the instance (not in email), replay MTTR, new outcome onboarded without a release. Value model: `executive-brief.md` §4.

---

## 8. Evidence already in this repository (not slideware)

| Claim | Where to point in the room |
|---|---|
| Distinct keys, duplicate no-op, FAILED blocks, REVOKED withdraws | `OutcomeEngineTest` (Maven: “7 engine tests” in `README.md`) |
| Stitch named blocker, no FOBO branch | `StitchFold` javadoc + FOBO R-2031 / MB014 story |
| Command Helix without polling | `HttpCommandExecutor` + Drive **FOBO / Helix** + Reports GENERATED |
| Onboard without a Java type | `/onboarding` → `POST /api/outcomes/definitions` |
| Outbox + audit tape | `/monitoring`, `PropagationService` |
| Fail-closed instance | `StitchController` 404 contract |
| Exec / silent walkthrough of the same path | `cio-md-demo.mp4`, `helix-silent-walkthrough.mp4` |
| Transport rule | `architecture-group.md` §4 and §8 |

If a counter-proposal cannot point to an equivalent artefact for **named blocker + run-id + 404 + onboard-as-data**, it is not a replacement.

---

## 9. Decision record (what to minuted)

1. **Endorse** the outcome-layer approach: subscribe to facts; do not replace systems of record.  
2. **Reuse** Kafka/Solace (or current MQ) as the production bus; Airflow/Control-M only **after** READY or for restatement facts.  
3. **Build** the hub + entitled console in-house as the only Ready/Blocked system of decision for group-unit close.  
4. **Standardise** ingest on the POC event contract so the next origin is an adapter, not a new product.  
5. **First production outcome:** FOBO (engine Helix on Reports + stitch rec on the Board), live CEES fail-closed.  
6. **Non-goals remain binding** so the layer stays thin.

Companion asks: `executive-brief.md` §7. Builder’s BRD: `application.md`. Visual truth: `frontend/web`.
