# One Finance Specification

This document is the spec-driven contract for One Finance. Implementers write code and tests against REQ-IDs and AC-IDs. Narrative design remains in the companion files listed in References.

## 1. Document control

This section identifies the document, its status, and the files it sits beside.

### 1.1 Identification

| Field | Value |
| --- | --- |
| Product | One Finance |
| Document | Specification |
| Version | 1.4.0 |
| Date | 16 September 2026 |
| Owner | Praveen Kumar |
| Audience | Implementers, reviewers, architecture group |
| Rule set | LLM generic coding spec: complete sections, REQ-IDs, Given/When/Then, AC mapping, no banned wording, no H1 to H3 jumps |

### 1.2 Status

This specification describes the as-built phase-1 product: `onefinux-hub` on port 7070, `source-simulator` on port 7081, and `frontend/web` on port 7091. Later bus mix, live CEES, live Helix, and Wijmo are listed under Out of scope.

### 1.3 Companion files

This specification does not replace `as-built.md`. As-built remains the short route map. This file is the requirement and acceptance contract.

## 2. Purpose

This section states the business problem, the product purpose, and how a reviewer knows the work is done.

### 2.1 Problem

At close of business a group unit must answer one business question per outcome. Origin systems already emit facts. The unit does not get a Ready, Blocked, or Delayed answer unless a thin layer folds those facts and then acts.

### 2.2 Product purpose

One Finance folds facts into Ready, Blocked, or Delayed, executes the configured on-ready action, and governs every step. Products are data. The console is the entitled outcome surface.

### 2.3 Success

A reviewer can pick any REQ-ID, open the mapped AC-IDs, and execute those Given/When/Then cases against the running hub and console. CI `mvn -B verify` and `frontend/web` `npm run build` stay green.

## 3. Scope

This section bounds phase 1. Work outside these bounds needs a new REQ-ID before code changes.

### 3.1 In scope

HTTP ingest, feed-folder watch, JSON Schema validation, translation, Outcome Engine, Stitch fold, ActionExecutor registry, kit `userActions` including ADJUST and COUNTERSIGN, REST, SSE, outbox, audit, React console routes listed in this document, Drive scenarios on `/drive`, MITR chrome, One Finance wordmark, Reports Normal/Compact/Table, accounting item attributes on stitch instances, instance step-view GRID or IFRAME, kit-configured step-grid endpoint and request parameters, in-shell partner iframe, Event lifecycle page, and fail-closed 404 on unentitled stitch instances.

### 3.2 Out of scope

Bank Kafka or Solace, Redis, AWS SNS/SQS/Lambda as the fold, live CEES directory, live Helix/FAS/Axiom networks, Barclays Now, Wijmo analyst studio, a native second product, Drive buttons on Home or Reports, `if (FOBO)` branches, frosted glass, and any LLM on the fold.

### 3.3 Phase boundary

Phase 1 runs on-prem with HTTP ingest and the hub store. An optional later bus is an additional publisher into the same ingest contract, not a replacement of the fold.

## 4. Definitions

| Term | Meaning |
| --- | --- |
| Outcome | One business question for one group unit, COB, and region |
| OutcomeDefinition | Engine product data: question, feeds, SLA, on-ready |
| Kit | Stitch product data: sources, destinations, embed, userActions |
| Fold | Deterministic recompute of stitch instance status from readiness keys |
| Engine stage | Derived report or command lifecycle on the Outcome Engine |
| Named blocker | The required key that forced BLOCKED |
| runId | Identifier that binds one on-ready or POST command to its completion |
| CEES | Entitlement check; unentitled reads fail closed as 404 |
| View | Rail filter stored in `ofx-view`; not entitlement |
| Drive | Testing surface at `/drive` that starts simulator scenarios |
| Feed watch | Inbox folder of JSON files ingested through the same EventHubService as HTTP |
| Event lifecycle | Console walk of receive, persist, and next state for one fact |
| Step grid | GenericGrid fed by a kit destination endpoint and bound request parameters |
| SIGNED | Maker has signed off; COUNTERSIGN from a different actor is still open |
| REQ-ID | Functional requirement identifier |
| AC-ID | Acceptance criterion identifier with Given/When/Then |

## 5. References

| Document | Role |
| --- | --- |
| `docs/design/as-built.md` | Route map and what not to do |
| `docs/design/accounting-journey.md` | Controller adjust and dual sign-off |
| `docs/design/application.md` | Modules, APIs, two models |
| `docs/design/start.md` | Run steps and review rules |
| `docs/design/architecture.md` | Mermaid diagrams |
| `docs/design/event-lifecycle.md` | API vs feed contracts and the event walk |
| `contracts/openapi.yaml` | Hub HTTP surface |
| `.cursor/skills/*` | Job-specific review rules |
| `AGENTS.md` | Agent notes |

## 6. Actors

| Actor | Uses | Does not |
| --- | --- | --- |
| Outcome user | `/outcomes`, `/instance/:id` | Head roll-ups, RTB replay |
| BU head / CIO / MD | `/board` | Sign-off or post |
| Controller | `/reports`, document route | Drive buttons |
| Maker | `/onboarding` | Treat Configuration as create |
| Owner / config | `/configuration` | Create on that page |
| RTB | `/operations`, `/monitoring` | Business sign-off |
| Demo / QA | `/drive` | Scenario buttons on Home or Reports |
| Engineer | `/guide`, `/architecture` | Product-specific Java types |
| Simulator | POST facts to the hub | Write hub tables directly |

## 7. Constraints

This section lists the technical, product, and wording constraints that every REQ-ID inherits.

### 7.1 Technical constraints

The browser talks to the hub over HTTP and SSE only. The fold is deterministic. LLM output is not an input to Ready or Blocked. Phase 1 does not require Kafka, Redis, or a cloud account. Java 21 and the current Node toolchain in `frontend/web/package.json` are the build floor.

### 7.2 Product constraints

Two models stay separate. Products are data. Views are not entitlement. Configuration is not a create form. Drive is not a product page. The wordmark is One Finance.

### 7.3 Wording constraints for this specification

Requirements use must, does, returns, and rejects. Weak preference verbs, performance slang, and placeholder tokens are absent. Heading levels increase by one.

## 8. Assumptions

Operators run `./scripts/run.sh` then `frontend/web` `npm run dev`. Demo COB for stitch recs is 2026-09-12 unless a scenario says otherwise. Helix engine demos use today's COB. Group unit REV-ACC is the worked example. Entitlement in phase 1 is the hub fail-closed 404 contract with the current demo user.

## 9. System context

This section places the three processes against origins and destinations.

### 9.1 Processes

| Process | Port | Responsibility |
| --- | --- | --- |
| `onefinux-hub` | 7070 | Ingest, both folds, REST, SSE, outbox, audit, ActionExecutor |
| `source-simulator` | 7081 | Origin and destination stubs; Drive scenarios |
| `frontend/web` | 7091 | Entitled console |

### 9.2 Event path

Simulator or origin posts HTTP to `/api/events`. Hub validates, persists, translates, runs Outcome Engine, runs Stitch fold, dispatches ActionExecutor when configured, writes outbox and audit, and pushes SSE. The console reads REST and listens to SSE.

### 9.3 Adjacent systems that are not this product

Motif, SAP, Helix, Axiom, CATS, MBR, FAS, and Kafka remain origins or destinations. They publish facts or receive commands. They do not compute Ready for the group unit.

## 10. Subsystem catalog

| Code | Name | Owns |
| --- | --- | --- |
| INGEST | Event ingest and translation | `/api/events`, contracts, feed inbox, simulator HTTP |
| FOLD | Stitch fold | Readiness keys, instance status, 404 contract |
| ENGINE | Outcome Engine | Definitions, stages, report artifact |
| ACTION | Actions and executors | ActionExecutor, kit verbs, runId |
| CONSOLE | Console chrome | Brand, theme, rail, views, ribbon |
| REPORTS | Reports | Layouts, document route, stage flow |
| GOVERN | Onboarding and configuration | Create vs govern |
| OPERATE | Drive, RTB, monitor, notify | Scenarios, replay, SSE, inbox |

Each subsystem has numbered REQ-IDs and exactly 23 AC-IDs.

## 11. Functional requirements

This section states every functional REQ-ID by subsystem. Quality-attribute REQ-IDs follow the eight subsystems.

### 11.1 Event ingest and translation (INGEST)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-INGEST-001` | The hub accepts one inbound business event on POST /api/events when the body matches inbound-event-v1 and responds 202 Accepted. |
| `REQ-INGEST-002` | The hub ignores a duplicate eventId on POST /api/events and responds 200 without creating a second stored event. |
| `REQ-INGEST-003` | The hub rejects a body that fails inbound-event-v1 with HTTP 4xx and does not persist the payload. |
| `REQ-INGEST-004` | The hub accepts a batch on POST /api/events/batch and persists each valid member in arrival order. |
| `REQ-INGEST-005` | The hub persists the accepted event before Outcome Engine fold and before Stitch fold. |
| `REQ-INGEST-006` | The hub translates source keys on the event onto a business identity of group unit, COB date, region, and instance. |
| `REQ-INGEST-007` | GET /api/events returns stored events for the current tenant scope. |
| `REQ-INGEST-008` | GET /api/contracts and GET /api/contracts/{name} return the published JSON Schema documents. |
| `REQ-INGEST-009` | The browser never opens a Kafka, MQ, SNS, or SQS connection; ingest reaches the hub only over HTTP. |
| `REQ-INGEST-010` | source-simulator posts facts to the hub HTTP ingest endpoints and does not write hub tables directly. |
| `REQ-INGEST-011` | The hub watches the configured feed inbox folder, accepts JSON that matches inbound-event-v1 or feed-event-v1, persists through EventHubService.ingest, moves valid files to processed, and moves invalid files to rejected without writing event_store. |

### 11.2 Stitch fold (FOLD)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-FOLD-001` | Stitch fold sets instance status BLOCKED when any required readiness key is FAILED and records that key as the named blocker. |
| `REQ-FOLD-002` | Stitch fold sets instance status NOT_YET when no required key is FAILED and at least one required key is WAITING, and the SLA deadline has not passed. |
| `REQ-FOLD-003` | Stitch fold sets instance status DELAYED when no required key is FAILED, at least one required key is WAITING, and the SLA deadline has passed. |
| `REQ-FOLD-004` | Stitch fold sets instance status READY when every required key is COMPLETED and every required source is present. |
| `REQ-FOLD-005` | When the kit userActions list does not contain COUNTERSIGN, an entitled sign-off of a READY instance sets CLEARED. When it contains COUNTERSIGN, that sign-off sets SIGNED and records signedBy; a later COUNTERSIGN by a different entitled actor sets CLEARED. |
| `REQ-FOLD-006` | Readiness key states are WAITING, COMPLETED, FAILED, and REVOKED only. |
| `REQ-FOLD-007` | Fold uses distinct business keys; it does not count duplicate arrivals of the same key as extra progress. |
| `REQ-FOLD-008` | There is no product-specific branch on kitId FOBO or any other kit id; FOBO is kit data. |
| `REQ-FOLD-009` | GET /api/stitch/instances returns tenant-scoped instances for the selected group unit, COB, and region filters. |
| `REQ-FOLD-010` | An unknown or unentitled instance id on stitch instance reads and actions returns HTTP 404. |

### 11.3 Outcome Engine (ENGINE)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-ENGINE-001` | Outcome Engine matches accepted events to OutcomeDefinition feeds on eventType and sourceSystem and re-derives the outcome instance. |
| `REQ-ENGINE-002` | Derived engine stage walks NOT_STARTED, FEEDS, READY, PROCESSING, then GENERATED or AVAILABLE, or BLOCKED or FAILED. |
| `REQ-ENGINE-003` | When a completion event includes reportId the engine attaches a ReportArtifact and the derived stage is AVAILABLE. |
| `REQ-ENGINE-004` | When a completion event has no reportId the derived stage is GENERATED. |
| `REQ-ENGINE-005` | GET /api/outcomes returns engine projections for the selected group-unit scope. |
| `REQ-ENGINE-006` | GET /api/outcomes/{outcomeId}/{cobDate}/{region} returns one engine instance. |
| `REQ-ENGINE-007` | GET /api/outcomes/{outcomeId}/{cobDate}/{region}/report returns the attached report document when the stage is AVAILABLE. |
| `REQ-ENGINE-008` | Predicted-ready clocks are advisory and are not inputs to the readiness fold. |
| `REQ-ENGINE-009` | Seeded definitions include FOBO_HELIX, REPORT_15C3, and PNL_REPORTING in application.yml. |
| `REQ-ENGINE-010` | POST /api/outcomes/definitions creates a live OutcomeDefinition without a new Java product type. |

### 11.4 Actions and executors (ACTION)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-ACTION-001` | When engine status is READY and onReady.action is not NOTIFY_ONLY the hub dispatches ActionExecutor for that action type. |
| `REQ-ACTION-002` | Built-in ActionExecutor types are HTTP_COMMAND and LOG_COMMAND. |
| `REQ-ACTION-003` | A new on-ready type is a new ActionExecutor bean plus definition data; it is not a new product Java type. |
| `REQ-ACTION-004` | Action dispatch uses a runId and ignores a completion whose runId does not match the in-flight run. |
| `REQ-ACTION-005` | POST /api/stitch/instance/action is allowed only when the kit userActions list contains that action name. |
| `REQ-ACTION-006` | SIGN_OFF, POST, ESCALATE, ADJUST, and COUNTERSIGN keep rich behaviour; any other declared verb writes audit and WORKFLOW_<VERB>. |
| `REQ-ACTION-007` | POST /api/outcomes/{outcomeId}/{cobDate}/{region}/run re-runs the on-ready action for that instance. |
| `REQ-ACTION-008` | The console instance page renders only kit-declared actions and does not invent extra verbs. |
| `REQ-ACTION-009` | NOTIFY_ONLY on a READY engine instance does not call HTTP_COMMAND or LOG_COMMAND. |
| `REQ-ACTION-010` | A disabled action states the fold or kit reason next to the control. |
| `REQ-ACTION-011` | When ADJUST is declared, POST /api/stitch/instance/action?action=ADJUST on a BLOCKED or READY instance records a pending command_run dest FAS_MOTIF with a runId and publishes ADJUST_REQUESTED. |
| `REQ-ACTION-012` | When COUNTERSIGN is declared, SIGN_OFF on READY sets SIGNED; COUNTERSIGN by a different entitled actor sets CLEARED; COUNTERSIGN by signedBy is rejected. |
| `REQ-ACTION-013` | When a stitch event carries account, journalId, amount, or fsLine attributes, the hub copies those values onto the instance and GET instances plus GET instance return them. |

### 11.5 Console chrome (CONSOLE)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-CONSOLE-001` | The product wordmark is One Finance with no UX suffix on the rail, the document title, and the collapsed top header. |
| `REQ-CONSOLE-002` | The brand mark is a briefcase on the MITR indigo-lavender tile. |
| `REQ-CONSOLE-003` | When the rail is expanded the brand mark and wordmark appear on the rail and do not appear in the top header. |
| `REQ-CONSOLE-004` | When the rail is collapsed the brand mark and wordmark appear once in the top header beside Group unit, and the rail brand slot shows only the expand control. |
| `REQ-CONSOLE-005` | html[data-theme] is dark or light; the choice persists in localStorage ofx-theme and a URL theme= parameter overrides it. |
| `REQ-CONSOLE-006` | The context ribbon always shows group_unit, cob, region, view, instance counts, ready, blocked, and escalations. |
| `REQ-CONSOLE-007` | Top-bar View values are all, developer, architect, controller, head, rtb, and maker; a view filters the rail and is not entitlement. |
| `REQ-CONSOLE-008` | Guide routes /product, /architecture, /guide, and /lifecycle remain on the rail in every view. |
| `REQ-CONSOLE-009` | Home and Reports do not render Drive or scenario buttons. |
| `REQ-CONSOLE-010` | Below 820px the rail is an overlay drawer, a hamburger opens it, and a labelled bottom nav of five primary destinations is the primary movement control. |
| `REQ-CONSOLE-011` | Every page under frontend/web/src/pages is routed and has a job listed in this specification. |
| `REQ-CONSOLE-012` | Dropdown options for group unit, COB, and region come from hub APIs; the console does not invent those ids. |
| `REQ-CONSOLE-013` | Board and instance detail show account, journalId, amount, and fsLine when the instance carries those fields. |
| `REQ-CONSOLE-014` | Instance readiness fold hides event history until the operator clicks a feed, then GET /api/stitch/instance/step-view returns that feed's events. |
| `REQ-CONSOLE-015` | Open partner screen renders the kit embed URL as an iframe in the console and does not navigate to a new tab. |
| `REQ-CONSOLE-016` | GET /api/stitch/instance/step-view?id=&ref= returns kind GRID with columns and rows, or kind IFRAME with embedUrl, from destination surface data. A GRID destination with kit_destination.grid_endpoint binds request parameters from the instance context onto that endpoint and returns the API rows. Unentitled instances return 404. |
| `REQ-CONSOLE-017` | The Event lifecycle page at /lifecycle shows the received request body, the event_store persist, and the next stitch or engine state for a selected event. |

### 11.6 Reports index and document (REPORTS)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-REPORTS-001` | GET /reports lists engine outcomes for the selected scope. |
| `REQ-REPORTS-002` | Reports layout values are normal, compact, and table. |
| `REQ-REPORTS-003` | Reports persists the layout in localStorage ofx-reports-view and honours ?view=normal|compact|table. |
| `REQ-REPORTS-004` | Normal layout shows question, predicted ready, and per-feed meters. |
| `REQ-REPORTS-005` | Compact layout hides the question, predicted ready, and per-feed meters and keeps the stage flow. |
| `REQ-REPORTS-006` | Table layout renders one row per outcome with stage, region, COB, feeds, and Open report. |
| `REQ-REPORTS-007` | Each Reports row or card links to /reports/:outcomeId/:cobDate/:region. |
| `REQ-REPORTS-008` | The document route renders the engine instance and the report payload when present. |
| `REQ-REPORTS-009` | Reports does not render Drive or scenario buttons. |
| `REQ-REPORTS-010` | The five-stage flow uses Feeds in, Ready, Processing, Generated, and Available. |

### 11.7 Onboarding and configuration (GOVERN)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-GOVERN-001` | POST /api/outcomes/definitions creates an OutcomeDefinition from question, regions, owner, SLA, feeds, and on-ready. |
| `REQ-GOVERN-002` | /onboarding is the create surface for OutcomeDefinition and is not the govern surface. |
| `REQ-GOVERN-003` | /configuration is a master-detail govern surface for outcomes and kits and is not a create form. |
| `REQ-GOVERN-004` | POST /api/stitch/kits registers a kit with sources, destinations, embed, and userActions and does not require a new Java type. |
| `REQ-GOVERN-005` | GET /api/outcomes/definitions and GET /api/stitch/kits populate Configuration lists. |
| `REQ-GOVERN-006` | Configuration right pane shows anatomy and live state for the selected outcome or kit. |
| `REQ-GOVERN-007` | Onboarding validation rejects a definition that omits id, name, question, or feeds. |
| `REQ-GOVERN-008` | A created definition appears on Board, Reports, and Configuration for the given COB once instances exist. |
| `REQ-GOVERN-009` | Kit create remains available on POST /api/stitch/kits; the console does not add a second kit-create screen in this phase. |
| `REQ-GOVERN-010` | Configuration links makers to /onboarding when they need to create an outcome. |

### 11.8 Drive, operations, monitoring, notifications (OPERATE)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-OPERATE-001` | Drive lives at /drive and exposes Reset plus scenarios fobo, feed, helix, 15c3, pnl, restate, all, and cancel. |
| `REQ-OPERATE-002` | Drive scenario buttons do not appear on Home or Reports. |
| `REQ-OPERATE-003` | POST /api/stitch/reset clears stitch runtime state used by the demo. |
| `REQ-OPERATE-004` | POST /sim/scenarios/{name} injects facts into the hub ingest. |
| `REQ-OPERATE-005` | GET /api/stitch/rtb returns escalations, watermarks, and dead letters for Operations. |
| `REQ-OPERATE-006` | Dead-letter replay requires dual control and writes audit. |
| `REQ-OPERATE-007` | GET /api/stitch/monitor/overview, /outbox, /events, and /audit power Monitoring. |
| `REQ-OPERATE-008` | GET /api/stream is Server-Sent Events and is the live channel to the console. |
| `REQ-OPERATE-009` | The hub notifies on READY, BLOCKED, DELAYED, SLA_BREACHED, REVOKED, CLEARED, SIGNED_OFF, POSTED, ESCALATED, and kit-declared verbs. |
| `REQ-OPERATE-010` | The hub does not notify on raw facts, PROGRESS ticks, or advisory model output. |
| `REQ-OPERATE-011` | Board is the supervisor table; My outcomes is the doer card worklist; both drill to /instance/:id. |
| `REQ-OPERATE-012` | Operations does not sign off a rec or publish a kit. |

### 11.9 Quality attributes (NFR)

| REQ-ID | Requirement |
| --- | --- |
| `REQ-NFR-001` | Hub and tests run on Java 21 with mvn -B verify in CI. |
| `REQ-NFR-002` | The console builds with npm ci && npm run build in frontend/web in CI. |
| `REQ-NFR-003` | Phase 1 persistence is the hub store (H2 in the local demo) and does not require Kafka, Redis, or a cloud bus. |
| `REQ-NFR-004` | The console uses REST plus SSE only. |
| `REQ-NFR-005` | Theme tokens live in frontend/web/src/styles.css and frontend/theme/onefinux-tokens.css. |
| `REQ-NFR-006` | Partner embeds import --ofx-* tokens and omit their own masthead. |

## 12. Acceptance criteria

Each criterion is Given / When / Then and maps to one REQ-ID. Execute against the running hub and console unless the criterion names a static review.

### 12.1 Event ingest and translation (INGEST)

These 23 criteria lock INGEST behaviour. Each Maps-to line names one REQ-ID.

#### AC-INGEST-01

- Maps to: `REQ-INGEST-001`
- Given the hub process listens on port 7070
- When a client posts a body that matches inbound-event-v1 to POST /api/events
- Then the hub responds 202 Accepted and the event is available on GET /api/events

#### AC-INGEST-02

- Maps to: `REQ-INGEST-002`
- Given an event with eventId E1 is already stored
- When the client posts the same eventId E1 again to POST /api/events
- Then the hub responds 200 and GET /api/events still lists one row for E1

#### AC-INGEST-03

- Maps to: `REQ-INGEST-003`
- Given the hub is running
- When a client posts a JSON object that omits a required inbound-event-v1 field
- Then the hub responds 4xx and GET /api/events does not contain that payload

#### AC-INGEST-04

- Maps to: `REQ-INGEST-003`
- Given the hub is running
- When a client posts a body that is not JSON
- Then the hub responds 4xx and persists nothing

#### AC-INGEST-05

- Maps to: `REQ-INGEST-004`
- Given the hub is running
- When a client posts three valid members on POST /api/events/batch
- Then GET /api/events lists all three members in the order they arrived

#### AC-INGEST-06

- Maps to: `REQ-INGEST-004`
- Given the hub is running
- When a client posts a batch that mixes one valid member and one schema-invalid member
- Then the hub persists the valid member and rejects the invalid member with 4xx detail

#### AC-INGEST-07

- Maps to: `REQ-INGEST-005`
- Given Monitoring shows zero stored events for a new eventId
- When that eventId is accepted on POST /api/events
- Then the audit and event store record the persist before any OutcomeChanged or stitch instance update for that eventId

#### AC-INGEST-08

- Maps to: `REQ-INGEST-006`
- Given a Motif LEDGER_POSTED event carries book MB012
- When the hub accepts the event
- Then the translated identity includes group unit, cobDate, region, and the instance key the stitch fold uses

#### AC-INGEST-09

- Maps to: `REQ-INGEST-006`
- Given a CATS TRADE_BOOKED event carries a trade key
- When the hub accepts the event
- Then the fold can match that trade key as a readiness key on the target instance

#### AC-INGEST-10

- Maps to: `REQ-INGEST-007`
- Given three events exist for group unit REV-ACC
- When a entitled client calls GET /api/events
- Then the response lists those stored events and no other tenant's events

#### AC-INGEST-11

- Maps to: `REQ-INGEST-008`
- Given the hub is running
- When a client calls GET /api/contracts
- Then the response lists inbound-event-v1, feed-event-v1, and the generic business event schema names

#### AC-INGEST-12

- Maps to: `REQ-INGEST-008`
- Given the hub is running
- When a client calls GET /api/contracts/inbound-event-v1
- Then the response body is the inbound-event-v1 JSON Schema

#### AC-INGEST-13

- Maps to: `REQ-INGEST-009`
- Given frontend/web is loaded in a browser
- When the operator drives a COB scenario
- Then the browser issues HTTP or SSE calls to the hub or the Vite /sim proxy only

#### AC-INGEST-14

- Maps to: `REQ-INGEST-010`
- Given source-simulator listens on port 7081
- When Drive starts scenario fobo
- Then the simulator posts facts to POST /api/events on the hub

#### AC-INGEST-15

- Maps to: `REQ-INGEST-011`
- Given a valid inbound-event-v1 JSON file sits in the feed inbox
- When the hub feed watcher scans the inbox
- Then the event is stored via EventHubService.ingest and the file is moved to processed

#### AC-INGEST-16

- Maps to: `REQ-INGEST-011`
- Given an invalid JSON file sits in the feed inbox
- When the hub feed watcher scans the inbox
- Then event_store does not gain a row for that file and the file is moved to rejected

#### AC-INGEST-17

- Maps to: `REQ-INGEST-005`
- Given an OutcomeDefinition depends on eventType LEDGER_POSTED
- When that event is accepted
- Then Outcome Engine fold runs only after the event row exists in the store

#### AC-INGEST-18

- Maps to: `REQ-INGEST-006`
- Given an event carries a region the definition lists
- When the hub translates the event
- Then the engine instance key uses that region and does not invent a second region

#### AC-INGEST-19

- Maps to: `REQ-INGEST-003`
- Given the hub is running
- When a client posts an empty object to POST /api/events
- Then the hub responds 4xx

#### AC-INGEST-20

- Maps to: `REQ-INGEST-007`
- Given no events are stored
- When an entitled client calls GET /api/events
- Then the response is an empty list and HTTP 200

#### AC-INGEST-21

- Maps to: `REQ-INGEST-009`
- Given Vite proxies /api and /sim
- When the console fetches outcomes
- Then the request path on the wire is HTTP to the hub, not a bus client inside the browser

#### AC-INGEST-22

- Maps to: `REQ-INGEST-010`
- Given the hub ingest is down
- When the simulator posts a scenario fact
- Then the simulator receives a transport error and does not write the hub event table itself

#### AC-INGEST-23

- Maps to: `REQ-INGEST-002`
- Given eventId E2 was accepted earlier in this process lifetime
- When the same E2 arrives in a batch
- Then the hub does not create a second stored row for E2

### 12.2 Stitch fold (FOLD)

These 23 criteria lock FOLD behaviour. Each Maps-to line names one REQ-ID.

#### AC-FOLD-01

- Maps to: `REQ-FOLD-001`
- Given instance R-2031 requires Motif book MB014
- When Motif publishes LEDGER_REJECTED for MB014
- Then the instance status is BLOCKED and the named blocker identifies MB014

#### AC-FOLD-02

- Maps to: `REQ-FOLD-001`
- Given instance R-2031 is BLOCKED on MB014
- When Home and Board render that instance
- Then both surfaces show BLOCKED and the named blocker

#### AC-FOLD-03

- Maps to: `REQ-FOLD-002`
- Given instance R-1042 has CATS COMPLETED and Motif WAITING and SLA is in the future
- When fold recomputes
- Then the instance status is NOT_YET

#### AC-FOLD-04

- Maps to: `REQ-FOLD-003`
- Given instance R-1042 has a required key WAITING and the SLA deadline is in the past
- When fold recomputes
- Then the instance status is DELAYED

#### AC-FOLD-05

- Maps to: `REQ-FOLD-004`
- Given R-1042 required keys CATS, Motif, and MBR are COMPLETED
- When fold recomputes
- Then the instance status is READY

#### AC-FOLD-06

- Maps to: `REQ-FOLD-005`
- Given R-1042 is READY and the kit lists SIGN_OFF and COUNTERSIGN
- When an entitled user posts POST /api/stitch/instance/signoff for R-1042
- Then the instance status is SIGNED and signedBy is that user

#### AC-FOLD-07

- Maps to: `REQ-FOLD-006`
- Given a source publishes a fact for a required key
- When fold upserts the readiness key
- Then the key state is one of WAITING, COMPLETED, FAILED, REVOKED

#### AC-FOLD-08

- Maps to: `REQ-FOLD-007`
- Given key TRADE-1 is already COMPLETED
- When the same TRADE-1 fact arrives again
- Then completed count for that key stays 1 and status does not flip away from the prior derived status unless another key changed

#### AC-FOLD-09

- Maps to: `REQ-FOLD-008`
- Given the repository contains kit HELIX_RECON for FOBO
- When a reviewer searches hub Java for if (product == FOBO) or if (kitId == "FOBO")
- Then no such branch exists

#### AC-FOLD-10

- Maps to: `REQ-FOLD-009`
- Given REV-ACC has instances for COB 2026-09-12
- When GET /api/stitch/instances is called with that group unit and COB
- Then the list contains those instances only

#### AC-FOLD-11

- Maps to: `REQ-FOLD-010`
- Given the caller is not entitled to instance X
- When GET /api/stitch/instance?id=X is called
- Then the hub responds 404

#### AC-FOLD-12

- Maps to: `REQ-FOLD-010`
- Given instance Z does not exist
- When GET /api/stitch/instance?id=Z is called
- Then the hub responds 404

#### AC-FOLD-13

- Maps to: `REQ-FOLD-001`
- Given two required keys fail on the same instance
- When fold recomputes
- Then status is BLOCKED and the named blocker is a failed required key

#### AC-FOLD-14

- Maps to: `REQ-FOLD-004`
- Given a required source has not published any key
- When other required keys are COMPLETED
- Then status is not READY

#### AC-FOLD-15

- Maps to: `REQ-FOLD-002`
- Given all keys are WAITING and SLA is in the future
- When fold recomputes
- Then status is NOT_YET

#### AC-FOLD-16

- Maps to: `REQ-FOLD-005`
- Given the instance is NOT_YET
- When a user posts sign-off
- Then the hub does not set CLEARED

#### AC-FOLD-17

- Maps to: `REQ-FOLD-006`
- Given a source revokes a prior completion
- When fold upserts the key
- Then the key state is REVOKED and the instance is not READY

#### AC-FOLD-18

- Maps to: `REQ-FOLD-009`
- Given the header region filter is APAC
- When GET /api/stitch/instances runs with region APAC
- Then EMEA instances are absent from the list

#### AC-FOLD-19

- Maps to: `REQ-FOLD-008`
- Given a new kit id is registered as data
- When facts arrive for that kit
- Then fold derives status from the kit's sources and keys without a new Java type

#### AC-FOLD-20

- Maps to: `REQ-FOLD-003`
- Given the instance is DELAYED
- When the last WAITING key becomes COMPLETED before any FAILED key exists
- Then status becomes READY

#### AC-FOLD-21

- Maps to: `REQ-FOLD-010`
- Given the caller is not entitled to instance X
- When POST /api/stitch/instance/signoff is called for X
- Then the hub responds 404

#### AC-FOLD-22

- Maps to: `REQ-FOLD-007`
- Given three distinct trade keys are COMPLETED of three required
- When fold recomputes progress
- Then the meter shows 3 of 3 for that source, not a higher count

#### AC-FOLD-23

- Maps to: `REQ-FOLD-004`
- Given Board and My outcomes both list the same READY instance
- When the user opens either surface
- Then both show READY for that instance id

### 12.3 Outcome Engine (ENGINE)

These 23 criteria lock ENGINE behaviour. Each Maps-to line names one REQ-ID.

#### AC-ENGINE-01

- Maps to: `REQ-ENGINE-001`
- Given REPORT_15C3 lists a SAP trial-balance feed
- When a SAP fact with that eventType and sourceSystem is accepted
- Then the engine instance for that outcome, COB, and region moves off NOT_STARTED

#### AC-ENGINE-02

- Maps to: `REQ-ENGINE-002`
- Given no feeds have arrived
- When GET /api/outcomes reads REPORT_15C3 for that COB and region
- Then stage is NOT_STARTED

#### AC-ENGINE-03

- Maps to: `REQ-ENGINE-002`
- Given at least one feed has arrived and not all feeds are complete
- When the engine re-derives
- Then stage is FEEDS

#### AC-ENGINE-04

- Maps to: `REQ-ENGINE-002`
- Given all feeds are complete and on-ready has not finished
- When the engine re-derives
- Then stage is READY or PROCESSING according to whether the action has started

#### AC-ENGINE-05

- Maps to: `REQ-ENGINE-003`
- Given the generator publishes a completion event that includes reportId RPT-1
- When the engine handles that event
- Then stage is AVAILABLE and a ReportArtifact with reportId RPT-1 is attached

#### AC-ENGINE-06

- Maps to: `REQ-ENGINE-004`
- Given Helix publishes HELIX_ANALYSIS_COMPLETE without reportId
- When the engine handles that event
- Then stage is GENERATED

#### AC-ENGINE-07

- Maps to: `REQ-ENGINE-005`
- Given FOBO_HELIX and REPORT_15C3 have instances for the selected COB
- When GET /api/outcomes is called
- Then both projections are present

#### AC-ENGINE-08

- Maps to: `REQ-ENGINE-006`
- Given FOBO_HELIX exists for 2026-09-15 GLOBAL
- When GET /api/outcomes/FOBO_HELIX/2026-09-15/GLOBAL is called
- Then the response is that one instance

#### AC-ENGINE-09

- Maps to: `REQ-ENGINE-007`
- Given REPORT_15C3 is AVAILABLE with a report document
- When GET /api/outcomes/REPORT_15C3/{cob}/{region}/report is called
- Then the response includes reportId, rowCount, and catalogId

#### AC-ENGINE-10

- Maps to: `REQ-ENGINE-007`
- Given FOBO_HELIX is GENERATED with no reportId
- When GET .../report is called
- Then the hub responds 4xx or an empty document contract that Reports treats as not AVAILABLE

#### AC-ENGINE-11

- Maps to: `REQ-ENGINE-008`
- Given predicted ready is 19:46 and feeds are incomplete
- When fold and engine re-derive
- Then stitch status is not forced to READY by the clock

#### AC-ENGINE-12

- Maps to: `REQ-ENGINE-009`
- Given the hub starts with the seed file
- When GET /api/outcomes/definitions is called
- Then the list includes FOBO_HELIX, REPORT_15C3, and PNL_REPORTING

#### AC-ENGINE-13

- Maps to: `REQ-ENGINE-010`
- Given the maker submits the Month-end close example on /onboarding
- When the hub handles POST /api/outcomes/definitions
- Then a new definition id appears on GET /api/outcomes/definitions

#### AC-ENGINE-14

- Maps to: `REQ-ENGINE-002`
- Given a required feed publishes FAILED keys
- When the engine re-derives
- Then stage is BLOCKED

#### AC-ENGINE-15

- Maps to: `REQ-ENGINE-002`
- Given the on-ready action throws after READY
- When the engine records the failure
- Then stage is FAILED

#### AC-ENGINE-16

- Maps to: `REQ-ENGINE-001`
- Given an event has eventType that matches no definition feed
- When the engine runs
- Then no existing outcome instance stage is changed by that event

#### AC-ENGINE-17

- Maps to: `REQ-ENGINE-006`
- Given the outcomeId is unknown
- When GET /api/outcomes/{outcomeId}/{cob}/{region} is called
- Then the hub responds 404

#### AC-ENGINE-18

- Maps to: `REQ-ENGINE-008`
- Given Reports shows predicted ready
- When the operator reads the copy
- Then the surface labels the clock as predicted or advisory, not as fold status

#### AC-ENGINE-19

- Maps to: `REQ-ENGINE-010`
- Given POST /api/outcomes/definitions omits the question field
- When the hub validates the body
- Then the hub responds 4xx and does not create a definition

#### AC-ENGINE-20

- Maps to: `REQ-ENGINE-005`
- Given the selected region is AMERS
- When GET /api/outcomes is called with that region
- Then GLOBAL-only rows that are not AMERS are absent

#### AC-ENGINE-21

- Maps to: `REQ-ENGINE-003`
- Given stage is AVAILABLE
- When Reports opens the document route
- Then the page renders the attached report fields

#### AC-ENGINE-22

- Maps to: `REQ-ENGINE-004`
- Given stage is GENERATED
- When Reports offers Open report
- Then the console still opens the engine result page for that outcome key

#### AC-ENGINE-23

- Maps to: `REQ-ENGINE-001`
- Given two definitions share one eventType from different sourceSystems
- When an event arrives with one of those sourceSystems
- Then only the definition whose feed lists that pair moves

### 12.4 Actions and executors (ACTION)

These 23 criteria lock ACTION behaviour. Each Maps-to line names one REQ-ID.

#### AC-ACTION-01

- Maps to: `REQ-ACTION-001`
- Given FOBO_HELIX onReady.action is HTTP_COMMAND and the instance is READY
- When the engine emits the ready transition
- Then ActionDispatcher runs HTTP_COMMAND with a new runId

#### AC-ACTION-02

- Maps to: `REQ-ACTION-002`
- Given a definition sets onReady.action to LOG_COMMAND
- When the instance becomes READY
- Then the LOG_COMMAND executor runs

#### AC-ACTION-03

- Maps to: `REQ-ACTION-002`
- Given a definition sets onReady.action to HTTP_COMMAND
- When the instance becomes READY
- Then the HTTP_COMMAND executor runs

#### AC-ACTION-04

- Maps to: `REQ-ACTION-003`
- Given an engineer adds bean SlackCommand and a definition names SLACK_COMMAND
- When that definition becomes READY
- Then SlackCommand runs and no FOBO Java type was added

#### AC-ACTION-05

- Maps to: `REQ-ACTION-004`
- Given instance actionRunId is RUN-1
- When a completion arrives with runId RUN-2
- Then the engine does not apply that completion to the instance

#### AC-ACTION-06

- Maps to: `REQ-ACTION-004`
- Given instance actionRunId is RUN-1
- When a completion arrives with runId RUN-1 and reportId RPT-1
- Then the engine applies the completion

#### AC-ACTION-07

- Maps to: `REQ-ACTION-005`
- Given the kit userActions list contains AMEND and not APPROVE
- When POST /api/stitch/instance/action?action=AMEND is called on a entitled READY instance
- Then the hub accepts the call and writes audit

#### AC-ACTION-08

- Maps to: `REQ-ACTION-005`
- Given the kit userActions list does not contain APPROVE
- When POST /api/stitch/instance/action?action=APPROVE is called
- Then the hub rejects the call

#### AC-ACTION-09

- Maps to: `REQ-ACTION-006`
- Given the instance is READY, SIGN_OFF is declared, and COUNTERSIGN is not declared
- When POST /api/stitch/instance/signoff succeeds
- Then status becomes CLEARED

#### AC-ACTION-10

- Maps to: `REQ-ACTION-006`
- Given the instance is READY and POST is declared
- When POST /api/stitch/instance/post succeeds
- Then the hub records a command runId and dest FAS_MOTIF

#### AC-ACTION-11

- Maps to: `REQ-ACTION-006`
- Given ESCALATE is declared
- When POST /api/stitch/instance/escalate succeeds
- Then open escalation count on that instance increases by one

#### AC-ACTION-12

- Maps to: `REQ-ACTION-006`
- Given AMEND is declared and has no rich handler
- When POST /api/stitch/instance/action?action=AMEND succeeds
- Then audit contains AMEND and an event WORKFLOW_AMEND is published

#### AC-ACTION-13

- Maps to: `REQ-ACTION-007`
- Given an engine instance exists
- When POST /api/outcomes/{id}/{cob}/{region}/run is called by an entitled operator
- Then ActionDispatcher runs again with a new runId

#### AC-ACTION-14

- Maps to: `REQ-ACTION-008`
- Given the kit lists SIGN_OFF and AMEND
- When the user opens /instance/{id}
- Then the page shows SIGN_OFF and AMEND and does not show APPROVE

#### AC-ACTION-15

- Maps to: `REQ-ACTION-009`
- Given onReady.action is NOTIFY_ONLY and the instance is READY
- When the engine completes the ready transition
- Then HTTP_COMMAND and LOG_COMMAND do not run

#### AC-ACTION-16

- Maps to: `REQ-ACTION-010`
- Given the instance is BLOCKED
- When the instance page renders SIGN_OFF
- Then the control is disabled and the named blocker is visible beside it

#### AC-ACTION-17

- Maps to: `REQ-ACTION-005`
- Given the caller is not entitled to the instance
- When POST /api/stitch/instance/action is called
- Then the hub responds 404

#### AC-ACTION-18

- Maps to: `REQ-ACTION-012`
- Given the instance is READY and the kit lists SIGN_OFF and COUNTERSIGN
- When POST /api/stitch/instance/action?action=SIGN_OFF succeeds
- Then status becomes SIGNED and is not CLEARED

#### AC-ACTION-19

- Maps to: `REQ-ACTION-008`
- Given the kit userActions list is empty
- When the user opens /instance/{id}
- Then the page shows no invented verbs

#### AC-ACTION-20

- Maps to: `REQ-ACTION-012`
- Given the instance is SIGNED by alice.revacc
- When alice.revacc posts COUNTERSIGN
- Then the hub rejects the call and status stays SIGNED

#### AC-ACTION-21

- Maps to: `REQ-ACTION-007`
- Given the outcomeId is unknown
- When POST .../run is called
- Then the hub responds 404

#### AC-ACTION-22

- Maps to: `REQ-ACTION-011`
- Given ADJUST is declared and the instance is BLOCKED
- When POST /api/stitch/instance/action?action=ADJUST succeeds
- Then the hub records a command runId and dest FAS_MOTIF

#### AC-ACTION-23

- Maps to: `REQ-ACTION-012`
- Given the instance is SIGNED by alice.revacc and gla.reviewer is entitled
- When gla.reviewer posts COUNTERSIGN
- Then status becomes CLEARED

### 12.5 Console chrome (CONSOLE)

These 23 criteria lock CONSOLE behaviour. Each Maps-to line names one REQ-ID.

#### AC-CONSOLE-01

- Maps to: `REQ-CONSOLE-001`
- Given the console is loaded
- When the operator reads the document title
- Then the title is One Finance

#### AC-CONSOLE-02

- Maps to: `REQ-CONSOLE-001`
- Given the rail is expanded
- When the operator reads the rail wordmark
- Then the text is One Finance and Outcome platform with no UX suffix

#### AC-CONSOLE-03

- Maps to: `REQ-CONSOLE-002`
- Given the rail is expanded
- When the operator inspects the rail brand mark
- Then the mark is a briefcase on the MITR tile

#### AC-CONSOLE-04

- Maps to: `REQ-CONSOLE-003`
- Given ofx-rail is 0
- When the home page renders
- Then the top header does not display the top-brand block and the rail displays the brand

#### AC-CONSOLE-05

- Maps to: `REQ-CONSOLE-004`
- Given ofx-rail is 1
- When the home page renders
- Then the top header displays One Finance and Outcome platform beside Group unit and the rail brand is hidden

#### AC-CONSOLE-06

- Maps to: `REQ-CONSOLE-004`
- Given ofx-rail is 1
- When the operator inspects the rail top
- Then the only control in the brand slot is the expand chevron

#### AC-CONSOLE-07

- Maps to: `REQ-CONSOLE-005`
- Given data-theme is dark
- When the operator clicks the theme control
- Then data-theme becomes light and localStorage ofx-theme is light

#### AC-CONSOLE-08

- Maps to: `REQ-CONSOLE-005`
- Given localStorage ofx-theme is light
- When the operator opens /?theme=dark
- Then data-theme is dark

#### AC-CONSOLE-09

- Maps to: `REQ-CONSOLE-006`
- Given any product route is open
- When the operator reads the context ribbon
- Then group_unit, cob, region, view, instances, ready, blocked, and escalations are visible

#### AC-CONSOLE-10

- Maps to: `REQ-CONSOLE-007`
- Given View is set to head
- When the rail renders
- Then Drive is absent and Board remains

#### AC-CONSOLE-11

- Maps to: `REQ-CONSOLE-007`
- Given View is controller
- When the operator opens an instance they are not entitled to by URL
- Then the hub still fail-closes that instance with 404

#### AC-CONSOLE-12

- Maps to: `REQ-CONSOLE-008`
- Given View is rtb
- When the rail renders
- Then /product, /architecture, /guide, and /lifecycle remain listed

#### AC-CONSOLE-13

- Maps to: `REQ-CONSOLE-009`
- Given the operator is on /
- When the operator scans the page for scenario or Drive buttons
- Then none are present

#### AC-CONSOLE-14

- Maps to: `REQ-CONSOLE-009`
- Given the operator is on /reports
- When the operator scans the page for scenario or Drive buttons
- Then none are present

#### AC-CONSOLE-15

- Maps to: `REQ-CONSOLE-010`
- Given the viewport width is 400px
- When the console renders
- Then the rail is off-canvas until the hamburger is used and the bottom nav is visible

#### AC-CONSOLE-16

- Maps to: `REQ-CONSOLE-010`
- Given the viewport width is 400px and the drawer is closed
- When the operator uses bottom nav
- Then the five labelled destinations change the route

#### AC-CONSOLE-17

- Maps to: `REQ-CONSOLE-011`
- Given a reviewer lists frontend/web/src/pages
- When each file is opened against App.jsx routes
- Then every page component is routed

#### AC-CONSOLE-18

- Maps to: `REQ-CONSOLE-012`
- Given GET /api/stitch/context returns group units and cobDates
- When the top-bar Group unit and date controls render
- Then every option value equals a value from that API

#### AC-CONSOLE-19

- Maps to: `REQ-CONSOLE-017`
- Given an event is stored in event_store
- When the operator opens /lifecycle
- Then the page shows the request fields, the event_store persist, and the next stitch or engine state

#### AC-CONSOLE-20

- Maps to: `REQ-CONSOLE-014`
- Given instance R-2031 has CATS and MOTIF facts stored
- When the operator opens the instance page
- Then the Facts for this instance table is not shown until a feed is clicked

#### AC-CONSOLE-21

- Maps to: `REQ-CONSOLE-015`
- Given the instance kit has an embed URL
- When the operator clicks Open partner screen
- Then the partner document loads in an iframe on the instance page and the browser does not open a new tab

#### AC-CONSOLE-22

- Maps to: `REQ-CONSOLE-016`
- Given HELIX surface is IFRAME and FAS_MOTIF surface is GRID with grid_endpoint /sim/grids/investigation and params cobDate, account, journalId from the instance
- When GET step-view is called for HELIX then FAS_MOTIF on an entitled instance
- Then HELIX returns kind IFRAME with the kit embedUrl and FAS_MOTIF returns kind GRID whose query.endpoint is /sim/grids/investigation and whose query.params include the instance cobDate and account

#### AC-CONSOLE-23

- Maps to: `REQ-CONSOLE-013`
- Given instance R-2031 carries amount 12450000 and account 410000
- When the operator opens Board and the instance page
- Then both surfaces show the amount and the instance page shows account, journalId, and fsLine from REQ-ACTION-013

### 12.6 Reports index and document (REPORTS)

These 23 criteria lock REPORTS behaviour. Each Maps-to line names one REQ-ID.

#### AC-REPORTS-01

- Maps to: `REQ-REPORTS-001`
- Given engine projections exist for the selected COB
- When the operator opens /reports
- Then each projection appears as a card or table row

#### AC-REPORTS-02

- Maps to: `REQ-REPORTS-002`
- Given the operator is on /reports
- When the page header renders
- Then the segmented control lists Normal, Compact, and Table

#### AC-REPORTS-03

- Maps to: `REQ-REPORTS-003`
- Given the operator clicks Compact
- When the page re-renders
- Then localStorage ofx-reports-view is compact and cards use the compact class

#### AC-REPORTS-04

- Maps to: `REQ-REPORTS-003`
- Given ofx-reports-view is table
- When the operator opens /reports with no query
- Then the table layout renders

#### AC-REPORTS-05

- Maps to: `REQ-REPORTS-003`
- Given the operator opens /reports?view=normal
- When the page renders
- Then Normal is the selected tab regardless of prior localStorage

#### AC-REPORTS-06

- Maps to: `REQ-REPORTS-004`
- Given layout is normal and FOBO_HELIX is listed
- When the operator reads the card
- Then the question, predicted-ready block, and feed meters are visible

#### AC-REPORTS-07

- Maps to: `REQ-REPORTS-005`
- Given layout is compact and FOBO_HELIX is listed
- When the operator reads the card
- Then the question, predicted-ready block, and feed meters are absent and the stage flow is present

#### AC-REPORTS-08

- Maps to: `REQ-REPORTS-006`
- Given layout is table
- When the operator reads the grid
- Then columns include Report, Stage, Region, COB, Feeds, and an Open report control

#### AC-REPORTS-09

- Maps to: `REQ-REPORTS-007`
- Given FOBO_HELIX 2026-09-15 GLOBAL is listed
- When the operator clicks the report name
- Then the console navigates to /reports/FOBO_HELIX/2026-09-15/GLOBAL

#### AC-REPORTS-10

- Maps to: `REQ-REPORTS-007`
- Given layout is table
- When the operator clicks Open report on that row
- Then the console navigates to the same document route

#### AC-REPORTS-11

- Maps to: `REQ-REPORTS-008`
- Given the document route loads an AVAILABLE 15C3 instance
- When the page finishes rendering
- Then reportId and rowCount are visible

#### AC-REPORTS-12

- Maps to: `REQ-REPORTS-008`
- Given the document route loads a GENERATED Helix instance
- When the page finishes rendering
- Then the engine result is visible even when no reportId exists

#### AC-REPORTS-13

- Maps to: `REQ-REPORTS-009`
- Given the operator is on /reports
- When the operator scans for Reset or scenario buttons
- Then none are present

#### AC-REPORTS-14

- Maps to: `REQ-REPORTS-010`
- Given a card is in normal layout
- When the operator reads the flow
- Then the five labels are Feeds in, Ready, Processing, Generated, Available

#### AC-REPORTS-15

- Maps to: `REQ-REPORTS-010`
- Given stage is GENERATED
- When the flow renders
- Then Generated is the active step and Available is not done

#### AC-REPORTS-16

- Maps to: `REQ-REPORTS-010`
- Given stage is AVAILABLE
- When the flow renders
- Then all five steps are done

#### AC-REPORTS-17

- Maps to: `REQ-REPORTS-001`
- Given no engine projections exist for the filters
- When the operator opens /reports
- Then the page shows the empty state, not a prior COB's rows

#### AC-REPORTS-18

- Maps to: `REQ-REPORTS-002`
- Given the operator clicks Table then Normal
- When the page re-renders
- Then cards return to normal density

#### AC-REPORTS-19

- Maps to: `REQ-REPORTS-006`
- Given five outcomes exist
- When table layout renders
- Then the panel hint shows 5

#### AC-REPORTS-20

- Maps to: `REQ-REPORTS-008`
- Given the outcomeId in the URL is unknown
- When the document route loads
- Then the page shows a not-found or error banner

#### AC-REPORTS-21

- Maps to: `REQ-REPORTS-004`
- Given stage is BLOCKED
- When normal layout renders the flow
- Then the Feeds in step is in the error state

#### AC-REPORTS-22

- Maps to: `REQ-REPORTS-005`
- Given compact layout is selected on a phone-width viewport
- When the flow renders
- Then stage names remain readable in the stacked flow

#### AC-REPORTS-23

- Maps to: `REQ-REPORTS-007`
- Given the operator is on compact layout
- When the operator clicks Open report
- Then the document route opens for that outcome key

### 12.7 Onboarding and configuration (GOVERN)

These 23 criteria lock GOVERN behaviour. Each Maps-to line names one REQ-ID.

#### AC-GOVERN-01

- Maps to: `REQ-GOVERN-001`
- Given the maker is on /onboarding
- When the maker submits the Month-end close example
- Then POST /api/outcomes/definitions succeeds and the id is listed on GET /api/outcomes/definitions

#### AC-GOVERN-02

- Maps to: `REQ-GOVERN-002`
- Given the maker is on /onboarding
- When the page renders
- Then the primary action is create, not inspect of every existing outcome

#### AC-GOVERN-03

- Maps to: `REQ-GOVERN-003`
- Given the owner is on /configuration
- When the page renders
- Then the left list is pick-an-outcome-or-kit and there is no create form on that page

#### AC-GOVERN-04

- Maps to: `REQ-GOVERN-004`
- Given a client posts a kit body with kitId, sources, destinations, embed, and userActions
- When POST /api/stitch/kits succeeds
- Then GET /api/stitch/kit?id= that kitId returns the same userActions

#### AC-GOVERN-05

- Maps to: `REQ-GOVERN-005`
- Given FOBO_HELIX and HELIX_RECON exist
- When the owner opens /configuration
- Then both names appear in the master list

#### AC-GOVERN-06

- Maps to: `REQ-GOVERN-006`
- Given the owner selects REPORT_15C3
- When the right pane renders
- Then feeds, SLA, and on-ready are visible

#### AC-GOVERN-07

- Maps to: `REQ-GOVERN-006`
- Given the owner selects the FOBO kit
- When the right pane renders
- Then sources, destinations, embed URL, and userActions are visible

#### AC-GOVERN-08

- Maps to: `REQ-GOVERN-007`
- Given the maker clears the question field
- When the maker submits Onboarding
- Then the hub or the form rejects the submit and no definition is created

#### AC-GOVERN-09

- Maps to: `REQ-GOVERN-007`
- Given the maker omits feeds
- When the maker submits Onboarding
- Then the submit is rejected

#### AC-GOVERN-10

- Maps to: `REQ-GOVERN-008`
- Given a new definition is created for today's COB
- When Drive or ingest produces an instance
- Then Board and Reports list that outcome

#### AC-GOVERN-11

- Maps to: `REQ-GOVERN-008`
- Given the new definition exists
- When the owner opens /configuration
- Then the definition is in the master list

#### AC-GOVERN-12

- Maps to: `REQ-GOVERN-009`
- Given a reviewer inspects App.jsx routes
- When kit create is checked
- Then no extra kit-create page exists beyond the API and Onboarding outcome form

#### AC-GOVERN-13

- Maps to: `REQ-GOVERN-010`
- Given the owner is on /configuration
- When the owner wants to create
- Then a control links to /onboarding

#### AC-GOVERN-14

- Maps to: `REQ-GOVERN-001`
- Given the posted definition lists two regions
- When GET /api/outcomes/definitions returns it
- Then both regions are present on the record

#### AC-GOVERN-15

- Maps to: `REQ-GOVERN-004`
- Given the posted kit omits kitId
- When POST /api/stitch/kits is called
- Then the hub responds 4xx

#### AC-GOVERN-16

- Maps to: `REQ-GOVERN-003`
- Given the owner is on /configuration
- When the owner scans for a Drive scenario button
- Then none is present

#### AC-GOVERN-17

- Maps to: `REQ-GOVERN-006`
- Given live instances exist for the selected outcome
- When the right pane renders
- Then live status for the current header COB is visible

#### AC-GOVERN-18

- Maps to: `REQ-GOVERN-002`
- Given the maker is on /onboarding
- When the maker reads the page title
- Then the job is create a live OutcomeDefinition

#### AC-GOVERN-19

- Maps to: `REQ-GOVERN-005`
- Given GET /api/stitch/kits fails
- When Configuration loads kits
- Then the page shows an error banner and an empty kit list, not invented kits

#### AC-GOVERN-20

- Maps to: `REQ-GOVERN-001`
- Given onReady.action is HTTP_COMMAND in the posted body
- When the definition is stored
- Then Configuration shows HTTP_COMMAND for that outcome

#### AC-GOVERN-21

- Maps to: `REQ-GOVERN-004`
- Given userActions contains SIGN_OFF and AMEND
- When the kit is stored
- Then instance actions accept those two names only

#### AC-GOVERN-22

- Maps to: `REQ-GOVERN-010`
- Given a new joiner follows /guide
- When the first write path is described
- Then the path is Onboarding, not a Java product type

#### AC-GOVERN-23

- Maps to: `REQ-GOVERN-007`
- Given id is empty
- When the maker submits Onboarding
- Then the submit is rejected

### 12.8 Drive, operations, monitoring, notifications (OPERATE)

These 23 criteria lock OPERATE behaviour. Each Maps-to line names one REQ-ID.

#### AC-OPERATE-01

- Maps to: `REQ-OPERATE-001`
- Given the operator is on /drive
- When the page renders
- Then Reset and the named scenarios are present

#### AC-OPERATE-02

- Maps to: `REQ-OPERATE-002`
- Given the operator is on / or /reports
- When the operator scans for scenario buttons
- Then none are present

#### AC-OPERATE-03

- Maps to: `REQ-OPERATE-003`
- Given instances exist from a prior scenario
- When POST /api/stitch/reset succeeds
- Then subsequent GET /api/stitch/instances is empty for that demo tenant until new facts arrive

#### AC-OPERATE-04

- Maps to: `REQ-OPERATE-004`
- Given the hub is running
- When POST /sim/scenarios/fobo succeeds
- Then R-1042 and R-2031 appear on Board

#### AC-OPERATE-05

- Maps to: `REQ-OPERATE-004`
- Given header COB is today
- When POST /sim/scenarios/helix succeeds
- Then FOBO_HELIX appears on Reports for that COB

#### AC-OPERATE-06

- Maps to: `REQ-OPERATE-001`
- Given the operator clicks cancel on Drive
- When POST /sim/scenarios/cancel succeeds
- Then no further scheduled simulator facts are posted

#### AC-OPERATE-07

- Maps to: `REQ-OPERATE-005`
- Given an escalation exists
- When the operator opens /operations
- Then that escalation is listed

#### AC-OPERATE-08

- Maps to: `REQ-OPERATE-006`
- Given a dead letter exists and dual control is satisfied
- When replay is posted to /api/stitch/deadletters/{id}/replay
- Then audit records the replay and the event is re-offered

#### AC-OPERATE-09

- Maps to: `REQ-OPERATE-006`
- Given dual control is not satisfied
- When replay is posted
- Then the hub rejects the replay

#### AC-OPERATE-10

- Maps to: `REQ-OPERATE-007`
- Given events have been ingested
- When the operator opens /monitoring
- Then received, persisted, and audit entries are visible

#### AC-OPERATE-11

- Maps to: `REQ-OPERATE-008`
- Given the console is connected
- When the live pill renders
- Then the pill reads live while the SSE stream is open

#### AC-OPERATE-12

- Maps to: `REQ-OPERATE-008`
- Given the hub is stopped
- When the console cannot open /api/stream
- Then the live pill reads offline

#### AC-OPERATE-13

- Maps to: `REQ-OPERATE-009`
- Given R-1042 becomes READY
- When notification inbox is fetched
- Then a READY notification exists for that instance

#### AC-OPERATE-14

- Maps to: `REQ-OPERATE-010`
- Given a Motif PROGRESS tick is ingested
- When notification inbox is fetched
- Then no notification is created for that tick

#### AC-OPERATE-15

- Maps to: `REQ-OPERATE-011`
- Given R-1042 is READY
- When the head opens /board
- Then the row shows READY, blocker empty, and escalation count

#### AC-OPERATE-16

- Maps to: `REQ-OPERATE-011`
- Given R-1042 is READY
- When the doer opens /outcomes
- Then a card for R-1042 is shown

#### AC-OPERATE-17

- Maps to: `REQ-OPERATE-011`
- Given the doer clicks the R-1042 card
- When the console navigates
- Then the route is /instance/{id} for that instance

#### AC-OPERATE-18

- Maps to: `REQ-OPERATE-012`
- Given the operator is on /operations
- When the operator looks for SIGN_OFF
- Then the page does not offer sign-off

#### AC-OPERATE-19

- Maps to: `REQ-OPERATE-004`
- Given POST /sim/scenarios/15c3?failure=false succeeds
- When Reports is opened for that COB
- Then REPORT_15C3 is listed

#### AC-OPERATE-20

- Maps to: `REQ-OPERATE-009`
- Given a user signs off R-1042
- When notification inbox is fetched
- Then a SIGNED_OFF or CLEARED notification exists

#### AC-OPERATE-21

- Maps to: `REQ-OPERATE-007`
- Given outbox has a failed row
- When Monitoring outbox filter is set to that status
- Then only matching rows are listed

#### AC-OPERATE-22

- Maps to: `REQ-OPERATE-001`
- Given View is head
- When the rail renders
- Then Drive is hidden and /drive still works if opened by URL for an entitled tester

#### AC-OPERATE-23

- Maps to: `REQ-OPERATE-010`
- Given an advisory comment is stored off the fold
- When notification inbox is fetched
- Then no notification is created for that advisory comment

## 13. Traceability

This section maps every subsystem REQ-ID to AC-IDs and records NFR verification.

### 13.1 Requirement to acceptance

Every subsystem REQ-ID appears in at least one AC Maps-to line. The pairs are:

| REQ-ID | AC-IDs |
| --- | --- |
| `REQ-INGEST-001` | `AC-INGEST-01` |
| `REQ-INGEST-002` | `AC-INGEST-02`, `AC-INGEST-23` |
| `REQ-INGEST-003` | `AC-INGEST-03`, `AC-INGEST-04`, `AC-INGEST-19` |
| `REQ-INGEST-004` | `AC-INGEST-05`, `AC-INGEST-06` |
| `REQ-INGEST-005` | `AC-INGEST-07`, `AC-INGEST-17` |
| `REQ-INGEST-006` | `AC-INGEST-08`, `AC-INGEST-09`, `AC-INGEST-18` |
| `REQ-INGEST-007` | `AC-INGEST-10`, `AC-INGEST-20` |
| `REQ-INGEST-008` | `AC-INGEST-11`, `AC-INGEST-12` |
| `REQ-INGEST-009` | `AC-INGEST-13`, `AC-INGEST-21` |
| `REQ-INGEST-010` | `AC-INGEST-14`, `AC-INGEST-22` |
| `REQ-INGEST-011` | `AC-INGEST-15`, `AC-INGEST-16` |
| `REQ-FOLD-001` | `AC-FOLD-01`, `AC-FOLD-02`, `AC-FOLD-13` |
| `REQ-FOLD-002` | `AC-FOLD-03`, `AC-FOLD-15` |
| `REQ-FOLD-003` | `AC-FOLD-04`, `AC-FOLD-20` |
| `REQ-FOLD-004` | `AC-FOLD-05`, `AC-FOLD-14`, `AC-FOLD-23` |
| `REQ-FOLD-005` | `AC-FOLD-06`, `AC-FOLD-16` |
| `REQ-FOLD-006` | `AC-FOLD-07`, `AC-FOLD-17` |
| `REQ-FOLD-007` | `AC-FOLD-08`, `AC-FOLD-22` |
| `REQ-FOLD-008` | `AC-FOLD-09`, `AC-FOLD-19` |
| `REQ-FOLD-009` | `AC-FOLD-10`, `AC-FOLD-18` |
| `REQ-FOLD-010` | `AC-FOLD-11`, `AC-FOLD-12`, `AC-FOLD-21` |
| `REQ-ENGINE-001` | `AC-ENGINE-01`, `AC-ENGINE-16`, `AC-ENGINE-23` |
| `REQ-ENGINE-002` | `AC-ENGINE-02`, `AC-ENGINE-03`, `AC-ENGINE-04`, `AC-ENGINE-14`, `AC-ENGINE-15` |
| `REQ-ENGINE-003` | `AC-ENGINE-05`, `AC-ENGINE-21` |
| `REQ-ENGINE-004` | `AC-ENGINE-06`, `AC-ENGINE-22` |
| `REQ-ENGINE-005` | `AC-ENGINE-07`, `AC-ENGINE-20` |
| `REQ-ENGINE-006` | `AC-ENGINE-08`, `AC-ENGINE-17` |
| `REQ-ENGINE-007` | `AC-ENGINE-09`, `AC-ENGINE-10` |
| `REQ-ENGINE-008` | `AC-ENGINE-11`, `AC-ENGINE-18` |
| `REQ-ENGINE-009` | `AC-ENGINE-12` |
| `REQ-ENGINE-010` | `AC-ENGINE-13`, `AC-ENGINE-19` |
| `REQ-ACTION-001` | `AC-ACTION-01` |
| `REQ-ACTION-002` | `AC-ACTION-02`, `AC-ACTION-03` |
| `REQ-ACTION-003` | `AC-ACTION-04` |
| `REQ-ACTION-004` | `AC-ACTION-05`, `AC-ACTION-06` |
| `REQ-ACTION-005` | `AC-ACTION-07`, `AC-ACTION-08`, `AC-ACTION-17` |
| `REQ-ACTION-006` | `AC-ACTION-09`, `AC-ACTION-10`, `AC-ACTION-11`, `AC-ACTION-12` |
| `REQ-ACTION-007` | `AC-ACTION-13`, `AC-ACTION-21` |
| `REQ-ACTION-008` | `AC-ACTION-14`, `AC-ACTION-19` |
| `REQ-ACTION-009` | `AC-ACTION-15` |
| `REQ-ACTION-010` | `AC-ACTION-16` |
| `REQ-ACTION-011` | `AC-ACTION-22` |
| `REQ-ACTION-012` | `AC-ACTION-18`, `AC-ACTION-20`, `AC-ACTION-23` |
| `REQ-ACTION-013` |  |
| `REQ-CONSOLE-001` | `AC-CONSOLE-01`, `AC-CONSOLE-02` |
| `REQ-CONSOLE-002` | `AC-CONSOLE-03` |
| `REQ-CONSOLE-003` | `AC-CONSOLE-04` |
| `REQ-CONSOLE-004` | `AC-CONSOLE-05`, `AC-CONSOLE-06` |
| `REQ-CONSOLE-005` | `AC-CONSOLE-07`, `AC-CONSOLE-08` |
| `REQ-CONSOLE-006` | `AC-CONSOLE-09` |
| `REQ-CONSOLE-007` | `AC-CONSOLE-10`, `AC-CONSOLE-11` |
| `REQ-CONSOLE-008` | `AC-CONSOLE-12` |
| `REQ-CONSOLE-009` | `AC-CONSOLE-13`, `AC-CONSOLE-14` |
| `REQ-CONSOLE-010` | `AC-CONSOLE-15`, `AC-CONSOLE-16` |
| `REQ-CONSOLE-011` | `AC-CONSOLE-17` |
| `REQ-CONSOLE-012` | `AC-CONSOLE-18` |
| `REQ-CONSOLE-013` | `AC-CONSOLE-23` |
| `REQ-CONSOLE-014` | `AC-CONSOLE-20` |
| `REQ-CONSOLE-015` | `AC-CONSOLE-21` |
| `REQ-CONSOLE-016` | `AC-CONSOLE-22` |
| `REQ-CONSOLE-017` | `AC-CONSOLE-19` |
| `REQ-REPORTS-001` | `AC-REPORTS-01`, `AC-REPORTS-17` |
| `REQ-REPORTS-002` | `AC-REPORTS-02`, `AC-REPORTS-18` |
| `REQ-REPORTS-003` | `AC-REPORTS-03`, `AC-REPORTS-04`, `AC-REPORTS-05` |
| `REQ-REPORTS-004` | `AC-REPORTS-06`, `AC-REPORTS-21` |
| `REQ-REPORTS-005` | `AC-REPORTS-07`, `AC-REPORTS-22` |
| `REQ-REPORTS-006` | `AC-REPORTS-08`, `AC-REPORTS-19` |
| `REQ-REPORTS-007` | `AC-REPORTS-09`, `AC-REPORTS-10`, `AC-REPORTS-23` |
| `REQ-REPORTS-008` | `AC-REPORTS-11`, `AC-REPORTS-12`, `AC-REPORTS-20` |
| `REQ-REPORTS-009` | `AC-REPORTS-13` |
| `REQ-REPORTS-010` | `AC-REPORTS-14`, `AC-REPORTS-15`, `AC-REPORTS-16` |
| `REQ-GOVERN-001` | `AC-GOVERN-01`, `AC-GOVERN-14`, `AC-GOVERN-20` |
| `REQ-GOVERN-002` | `AC-GOVERN-02`, `AC-GOVERN-18` |
| `REQ-GOVERN-003` | `AC-GOVERN-03`, `AC-GOVERN-16` |
| `REQ-GOVERN-004` | `AC-GOVERN-04`, `AC-GOVERN-15`, `AC-GOVERN-21` |
| `REQ-GOVERN-005` | `AC-GOVERN-05`, `AC-GOVERN-19` |
| `REQ-GOVERN-006` | `AC-GOVERN-06`, `AC-GOVERN-07`, `AC-GOVERN-17` |
| `REQ-GOVERN-007` | `AC-GOVERN-08`, `AC-GOVERN-09`, `AC-GOVERN-23` |
| `REQ-GOVERN-008` | `AC-GOVERN-10`, `AC-GOVERN-11` |
| `REQ-GOVERN-009` | `AC-GOVERN-12` |
| `REQ-GOVERN-010` | `AC-GOVERN-13`, `AC-GOVERN-22` |
| `REQ-OPERATE-001` | `AC-OPERATE-01`, `AC-OPERATE-06`, `AC-OPERATE-22` |
| `REQ-OPERATE-002` | `AC-OPERATE-02` |
| `REQ-OPERATE-003` | `AC-OPERATE-03` |
| `REQ-OPERATE-004` | `AC-OPERATE-04`, `AC-OPERATE-05`, `AC-OPERATE-19` |
| `REQ-OPERATE-005` | `AC-OPERATE-07` |
| `REQ-OPERATE-006` | `AC-OPERATE-08`, `AC-OPERATE-09` |
| `REQ-OPERATE-007` | `AC-OPERATE-10`, `AC-OPERATE-21` |
| `REQ-OPERATE-008` | `AC-OPERATE-11`, `AC-OPERATE-12` |
| `REQ-OPERATE-009` | `AC-OPERATE-13`, `AC-OPERATE-20` |
| `REQ-OPERATE-010` | `AC-OPERATE-14`, `AC-OPERATE-23` |
| `REQ-OPERATE-011` | `AC-OPERATE-15`, `AC-OPERATE-16`, `AC-OPERATE-17` |
| `REQ-OPERATE-012` | `AC-OPERATE-18` |

### 13.2 Quality-attribute coverage

| REQ-ID | Verification |
| --- | --- |
| `REQ-NFR-001` | CI job `mvn -B verify` |
| `REQ-NFR-002` | CI job `npm ci && npm run build` in `frontend/web` |
| `REQ-NFR-003` | Local `./scripts/run.sh` starts without Kafka or Redis |
| `REQ-NFR-004` | Browser network panel shows HTTP and SSE only |
| `REQ-NFR-005` | Theme edits land in the two token files |
| `REQ-NFR-006` | Partner skill `embed-partner-screen` |

### 13.3 Completeness counts

| Subsystem | REQ count | AC count |
| --- | --- | --- |
| INGEST | 11 | 23 |
| FOLD | 10 | 23 |
| ENGINE | 10 | 23 |
| ACTION | 13 | 23 |
| CONSOLE | 17 | 23 |
| REPORTS | 10 | 23 |
| GOVERN | 10 | 23 |
| OPERATE | 12 | 23 |

## 14. Data contracts

This section names the stored shapes the hub and console share.

### 14.1 Inbound event

POST `/api/events` validates `inbound-event-v1`. Required business fields include event identity, sourceSystem, eventType, and the attributes the translator maps onto group unit, COB, region, and instance. Duplicate `eventId` is idempotent.

### 14.2 Feed event

JSON files in the feed inbox validate `feed-event-v1` (CloudEvents wrapping the inbound fields) or raw `inbound-event-v1`. Valid files persist through the same ingest as HTTP. Invalid files move to rejected and are not stored.

### 14.3 OutcomeDefinition

Fields: `id`, `name`, `question`, `regions`, `ownerGroup`, `sla`, `dependencies[]`, `onReady`. Seeded ids: `FOBO_HELIX`, `REPORT_15C3`, `PNL_REPORTING`.

### 14.4 Kit

Fields: `kitId`, sources, destinations, embed, `userActions`. FOBO is `HELIX_RECON` data.

### 14.5 Stitch instance

Status: `NOT_YET`, `READY`, `BLOCKED`, `CLEARED`, `DELAYED`. Keys: `WAITING`, `COMPLETED`, `FAILED`, `REVOKED`.

### 14.6 Engine instance

Stage: `NOT_STARTED`, `FEEDS`, `READY`, `PROCESSING`, `GENERATED`, `AVAILABLE`, `BLOCKED`, `FAILED`. A completion with `reportId` attaches `ReportArtifact`.

## 15. Interfaces

This section lists the hub HTTP paths and console routes that implement the REQ-IDs.

### 15.1 Hub HTTP

| Method | Path | Subsystem |
| --- | --- | --- |
| POST | `/api/events` | INGEST |
| POST | `/api/events/batch` | INGEST |
| GET | `/api/events` | INGEST |
| GET | `/api/events/lifecycle` | INGEST |
| GET | `/api/contracts` | INGEST |
| POST | `/api/feeds/drop` | INGEST |
| GET | `/api/feeds/watch` | INGEST |
| GET | `/api/stitch/instances` | FOLD |
| GET | `/api/stitch/instance` | FOLD |
| GET | `/api/stitch/instance/step-view` | CONSOLE |
| POST | `/api/stitch/instance/signoff` | ACTION |
| POST | `/api/stitch/instance/post` | ACTION |
| POST | `/api/stitch/instance/escalate` | ACTION |
| POST | `/api/stitch/instance/action` | ACTION |
| GET | `/api/outcomes` | ENGINE |
| GET | `/api/outcomes/{outcomeId}/{cobDate}/{region}` | ENGINE |
| GET | `/api/outcomes/{outcomeId}/{cobDate}/{region}/report` | ENGINE |
| POST | `/api/outcomes/definitions` | GOVERN |
| POST | `/api/stitch/kits` | GOVERN |
| POST | `/api/stitch/reset` | OPERATE |
| GET | `/api/stream` | OPERATE |
| GET | `/api/stitch/monitor/*` | OPERATE |
| POST | `/api/stitch/deadletters/{id}/replay` | OPERATE |
| POST | `/sim/scenarios/{name}` | OPERATE |
| GET | `/sim/grids/{name}` | CONSOLE |

### 15.2 Console routes

| Route | Subsystem |
| --- | --- |
| `/` | CONSOLE |
| `/product` `/architecture` `/guide` `/lifecycle` | CONSOLE |
| `/board` `/outcomes` `/instance/:id` | FOLD, ACTION, OPERATE |
| `/reports` `/reports/:outcomeId/:cobDate/:region` | REPORTS |
| `/onboarding` `/configuration` | GOVERN |
| `/drive` | OPERATE |
| `/operations` `/monitoring` | OPERATE |

## 16. Fail-closed behaviour and errors

This section states how the hub answers invalid, unentitled, or mismatched calls.

### 16.1 Entitlement

Unknown and unentitled stitch instance ids return HTTP 404. The API does not return 403 for those cases, so existence of another tenant's instance is not revealed.

### 16.2 Schema

Ingest bodies that fail JSON Schema return HTTP 4xx and are not persisted.

### 16.3 Commands

Kit verbs absent from `userActions` are rejected. Sign-off and POST on a non-READY instance do not change status to CLEARED and do not create a FAS run.

### 16.4 Completions

A completion whose `runId` does not match the in-flight action run is ignored.

## 17. Security and entitlement

This section separates demo identity, View filters, and dual control.

### 17.1 Demo identity

The demo console uses the current product user Praveen Kumar. `/api/auth/whoami` and `/api/auth/dev-token` support local sessions.

### 17.2 View versus CEES

The top-bar View filters navigation. It does not grant access. CEES fail-closed 404 remains in force when an instance URL is opened.

### 17.3 Dual control

Dead-letter replay on Operations requires dual control and an audit row.

## 18. Observability

This section covers the monitoring tape, the notification inbox, and the live pill.

### 18.1 Monitoring tape

Monitoring shows received, persisted, propagated, and audited. Outbox status is filterable.

### 18.2 Notifications

Inbox and SSE carry the notify set in REQ-OPERATE-009. Raw facts and PROGRESS ticks are excluded.

### 18.3 Live pill

The console live pill is `live` while SSE is open and `offline` when the stream is down.

## 19. User interface rules

This section locks brand, theme, surfaces, and mobile behaviour.

### 19.1 Brand

Wordmark: One Finance. Mark: briefcase on the MITR tile. Collapsed rail: one mark in the top header; expand control in the rail brand slot.

### 19.2 Theme

Dark canvas `#090d1c`, light canvas `#f5f6fb`, accent `#818cf8` dark and `#6366f1` light. Opaque cards. No `backdrop-filter`. Lucide stroke icons. Inter, Sora, JetBrains Mono.

### 19.3 Surfaces

Home tells today's close. Board is the head table. My outcomes is the doer list. Reports is the engine index plus document. Drive is testing. Onboarding creates. Configuration governs.

### 19.4 Mobile

Below 820px: drawer rail, hamburger, bottom nav. Below 640px: Board and Home instance tables become one card per row. Report flow stacks on a phone. Predicted-ready clocks use 24-hour time.

## 20. Quality attributes

This section states reliability, operability, maintainability, and portability without performance slang.

### 20.1 Reliability

Persist-before-fold. Idempotent `eventId`. runId-gated completions. Fail-closed 404.

### 20.2 Operability

Monitoring, outbox retry, dead-letter replay with dual control, Drive reset, and SSE live state are the operator tools in phase 1.

### 20.3 Maintainability

New engine capability = definition data plus optional ActionExecutor bean. New stitch capability = kit data plus optional declared verb. Reviewers reject `if (FOBO)`.

### 20.4 Portability

Phase 1 runs with the three local processes. Docker compose serves the console on port 8080. No cloud vendor is required.

## 21. Test strategy

This section says how AC-IDs are executed in CI, in the browser, and in static review.

### 21.1 Automated

Hub: `mvn -B test` and CI `mvn -B verify`. Map engine and fold tests to ENGINE and FOLD AC-IDs. Console: `npm run build` must succeed after chrome or Reports changes.

### 21.2 Manual Given/When/Then

Start hub and simulator with `./scripts/run.sh`. Start `frontend/web` on 7091. Execute CONSOLE, REPORTS, GOVERN, and OPERATE AC-IDs in the browser. Record the AC-ID in the pull request.

### 21.3 Static review

AC-FOLD-09, AC-CONSOLE-17, AC-GOVERN-12, and AC-ACTION-04 are repository reviews. They do not need a live scenario.

### 21.4 Gate

A change is complete when every touched REQ-ID has its mapped AC-IDs executed and `scripts/check_specification.py` still exits 0 if this document changed.

## 22. Implementer contract

This section is the coding contract for agents and humans working from this specification.

### 22.1 Allowed work

Implementers add or change behaviour only when a REQ-ID in this document demands it, or when a new REQ-ID is added in the same change with mapped AC-IDs.

### 22.2 Forbidden work

Implementers do not add Drive buttons to Home or Reports, do not collapse the two models, do not add product-specific Java branches, do not put Kafka in the browser, do not use frosted glass, and do not put an LLM on the fold.

### 22.3 Test naming

Automated tests include the AC-ID in the test name or display name, for example `ac_fold_01_named_blocker`.

### 22.4 Document updates

A behaviour change updates the REQ statement, the AC Given/When/Then, and the traceability row in the same pull request. `scripts/check_specification.py` must exit 0.

## 23. Change control

This section states how REQ-IDs and AC-IDs change after version 1.0.0.

### 23.1 Versioning

This file uses semantic versions. A new REQ-ID or AC-ID increments MINOR. A wording-only clarification increments PATCH. A removed REQ-ID increments MAJOR and records the removal reason in the pull request.

### 23.2 Ownership

Praveen Kumar owns this specification. Reviewers use the skill that matches the subsystem: `outcome-engine`, `barclays-ib-console`, `drive-and-demo`, `engineering-view`, `rtb-support-view`.

## 24. Review checklist

This section is the quality gate for the specification file itself.

### 24.1 Spec quality

| Check | Result required |
| --- | --- |
| All numbered H2 sections present | Yes |
| No empty H2 or H3 | Yes |
| Every requirement has a REQ-ID | Yes |
| Each subsystem has 23 Given/When/Then AC-IDs | Yes |
| Every AC maps to a REQ-ID | Yes |
| Every subsystem REQ-ID has at least one AC | Yes |
| Banned words absent | Yes |
| Heading levels increase by one | Yes |

### 24.2 Command

Run `python3 scripts/check_specification.py` from the repository root. Exit code 0 is the quality gate for this file.

