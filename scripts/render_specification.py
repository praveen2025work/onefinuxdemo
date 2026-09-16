#!/usr/bin/env python3
"""Render docs/design/specification.md from structured requirement data."""
from __future__ import annotations

from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs/design/specification.md"

# Each subsystem: list of (req_id, statement), list of (ac_id, req_id, given, when, then)
# Exactly 23 ACs. Every REQ is referenced by at least one AC.


def ac(n: str, req: str, given: str, when: str, then: str) -> tuple:
    return (n, req, given, when, then)


INGEST_REQ = [
    ("REQ-INGEST-001", "The hub accepts one inbound business event on POST /api/events when the body matches inbound-event-v1 and responds 202 Accepted."),
    ("REQ-INGEST-002", "The hub ignores a duplicate eventId on POST /api/events and responds 200 without creating a second stored event."),
    ("REQ-INGEST-003", "The hub rejects a body that fails inbound-event-v1 with HTTP 4xx and does not persist the payload."),
    ("REQ-INGEST-004", "The hub accepts a batch on POST /api/events/batch and persists each valid member in arrival order."),
    ("REQ-INGEST-005", "The hub persists the accepted event before Outcome Engine fold and before Stitch fold."),
    ("REQ-INGEST-006", "The hub translates source keys on the event onto a business identity of group unit, COB date, region, and instance."),
    ("REQ-INGEST-007", "GET /api/events returns stored events for the current tenant scope."),
    ("REQ-INGEST-008", "GET /api/contracts and GET /api/contracts/{name} return the published JSON Schema documents."),
    ("REQ-INGEST-009", "The browser never opens a Kafka, MQ, SNS, or SQS connection; ingest reaches the hub only over HTTP."),
    ("REQ-INGEST-010", "source-simulator posts facts to the hub HTTP ingest endpoints and does not write hub tables directly."),
]

INGEST_AC = [
    ac("AC-INGEST-01", "REQ-INGEST-001", "the hub process listens on port 7070", "a client posts a body that matches inbound-event-v1 to POST /api/events", "the hub responds 202 Accepted and the event is available on GET /api/events"),
    ac("AC-INGEST-02", "REQ-INGEST-002", "an event with eventId E1 is already stored", "the client posts the same eventId E1 again to POST /api/events", "the hub responds 200 and GET /api/events still lists one row for E1"),
    ac("AC-INGEST-03", "REQ-INGEST-003", "the hub is running", "a client posts a JSON object that omits a required inbound-event-v1 field", "the hub responds 4xx and GET /api/events does not contain that payload"),
    ac("AC-INGEST-04", "REQ-INGEST-003", "the hub is running", "a client posts a body that is not JSON", "the hub responds 4xx and persists nothing"),
    ac("AC-INGEST-05", "REQ-INGEST-004", "the hub is running", "a client posts three valid members on POST /api/events/batch", "GET /api/events lists all three members in the order they arrived"),
    ac("AC-INGEST-06", "REQ-INGEST-004", "the hub is running", "a client posts a batch that mixes one valid member and one schema-invalid member", "the hub persists the valid member and rejects the invalid member with 4xx detail"),
    ac("AC-INGEST-07", "REQ-INGEST-005", "Monitoring shows zero stored events for a new eventId", "that eventId is accepted on POST /api/events", "the audit and event store record the persist before any OutcomeChanged or stitch instance update for that eventId"),
    ac("AC-INGEST-08", "REQ-INGEST-006", "a Motif LEDGER_POSTED event carries book MB012", "the hub accepts the event", "the translated identity includes group unit, cobDate, region, and the instance key the stitch fold uses"),
    ac("AC-INGEST-09", "REQ-INGEST-006", "a CATS TRADE_BOOKED event carries a trade key", "the hub accepts the event", "the fold can match that trade key as a readiness key on the target instance"),
    ac("AC-INGEST-10", "REQ-INGEST-007", "three events exist for group unit REV-ACC", "a entitled client calls GET /api/events", "the response lists those stored events and no other tenant's events"),
    ac("AC-INGEST-11", "REQ-INGEST-008", "the hub is running", "a client calls GET /api/contracts", "the response lists inbound-event-v1 and the generic business event schema names"),
    ac("AC-INGEST-12", "REQ-INGEST-008", "the hub is running", "a client calls GET /api/contracts/inbound-event-v1", "the response body is the inbound-event-v1 JSON Schema"),
    ac("AC-INGEST-13", "REQ-INGEST-009", "frontend/web is loaded in a browser", "the operator drives a COB scenario", "the browser issues HTTP or SSE calls to the hub or the Vite /sim proxy only"),
    ac("AC-INGEST-14", "REQ-INGEST-010", "source-simulator listens on port 7081", "Drive starts scenario fobo", "the simulator posts facts to POST /api/events on the hub"),
    ac("AC-INGEST-15", "REQ-INGEST-001", "the hub is running", "a client posts a valid event with sourceSystem MOTIF and eventType LEDGER_POSTED", "the stored event retains sourceSystem MOTIF and eventType LEDGER_POSTED"),
    ac("AC-INGEST-16", "REQ-INGEST-001", "the hub is running", "a client posts a valid event that includes cobDate 2026-09-12 and region APAC", "the stored event retains cobDate 2026-09-12 and region APAC"),
    ac("AC-INGEST-17", "REQ-INGEST-005", "an OutcomeDefinition depends on eventType LEDGER_POSTED", "that event is accepted", "Outcome Engine fold runs only after the event row exists in the store"),
    ac("AC-INGEST-18", "REQ-INGEST-006", "an event carries a region the definition lists", "the hub translates the event", "the engine instance key uses that region and does not invent a second region"),
    ac("AC-INGEST-19", "REQ-INGEST-003", "the hub is running", "a client posts an empty object to POST /api/events", "the hub responds 4xx"),
    ac("AC-INGEST-20", "REQ-INGEST-007", "no events are stored", "an entitled client calls GET /api/events", "the response is an empty list and HTTP 200"),
    ac("AC-INGEST-21", "REQ-INGEST-009", "Vite proxies /api and /sim", "the console fetches outcomes", "the request path on the wire is HTTP to the hub, not a bus client inside the browser"),
    ac("AC-INGEST-22", "REQ-INGEST-010", "the hub ingest is down", "the simulator posts a scenario fact", "the simulator receives a transport error and does not write the hub event table itself"),
    ac("AC-INGEST-23", "REQ-INGEST-002", "eventId E2 was accepted earlier in this process lifetime", "the same E2 arrives in a batch", "the hub does not create a second stored row for E2"),
]

FOLD_REQ = [
    ("REQ-FOLD-001", "Stitch fold sets instance status BLOCKED when any required readiness key is FAILED and records that key as the named blocker."),
    ("REQ-FOLD-002", "Stitch fold sets instance status NOT_YET when no required key is FAILED and at least one required key is WAITING, and the SLA deadline has not passed."),
    ("REQ-FOLD-003", "Stitch fold sets instance status DELAYED when no required key is FAILED, at least one required key is WAITING, and the SLA deadline has passed."),
    ("REQ-FOLD-004", "Stitch fold sets instance status READY when every required key is COMPLETED and every required source is present."),
    ("REQ-FOLD-005", "When the kit userActions list does not contain COUNTERSIGN, an entitled sign-off of a READY instance sets CLEARED. When it contains COUNTERSIGN, that sign-off sets SIGNED and records signedBy; a later COUNTERSIGN by a different entitled actor sets CLEARED."),
    ("REQ-FOLD-006", "Readiness key states are WAITING, COMPLETED, FAILED, and REVOKED only."),
    ("REQ-FOLD-007", "Fold uses distinct business keys; it does not count duplicate arrivals of the same key as extra progress."),
    ("REQ-FOLD-008", "There is no product-specific branch on kitId FOBO or any other kit id; FOBO is kit data."),
    ("REQ-FOLD-009", "GET /api/stitch/instances returns tenant-scoped instances for the selected group unit, COB, and region filters."),
    ("REQ-FOLD-010", "An unknown or unentitled instance id on stitch instance reads and actions returns HTTP 404."),
]

FOLD_AC = [
    ac("AC-FOLD-01", "REQ-FOLD-001", "instance R-2031 requires Motif book MB014", "Motif publishes LEDGER_REJECTED for MB014", "the instance status is BLOCKED and the named blocker identifies MB014"),
    ac("AC-FOLD-02", "REQ-FOLD-001", "instance R-2031 is BLOCKED on MB014", "Home and Board render that instance", "both surfaces show BLOCKED and the named blocker"),
    ac("AC-FOLD-03", "REQ-FOLD-002", "instance R-1042 has CATS COMPLETED and Motif WAITING and SLA is in the future", "fold recomputes", "the instance status is NOT_YET"),
    ac("AC-FOLD-04", "REQ-FOLD-003", "instance R-1042 has a required key WAITING and the SLA deadline is in the past", "fold recomputes", "the instance status is DELAYED"),
    ac("AC-FOLD-05", "REQ-FOLD-004", "R-1042 required keys CATS, Motif, and MBR are COMPLETED", "fold recomputes", "the instance status is READY"),
    ac("AC-FOLD-06", "REQ-FOLD-005", "R-1042 is READY and the kit lists SIGN_OFF and COUNTERSIGN", "an entitled user posts POST /api/stitch/instance/signoff for R-1042", "the instance status is SIGNED and signedBy is that user"),
    ac("AC-FOLD-07", "REQ-FOLD-006", "a source publishes a fact for a required key", "fold upserts the readiness key", "the key state is one of WAITING, COMPLETED, FAILED, REVOKED"),
    ac("AC-FOLD-08", "REQ-FOLD-007", "key TRADE-1 is already COMPLETED", "the same TRADE-1 fact arrives again", "completed count for that key stays 1 and status does not flip away from the prior derived status unless another key changed"),
    ac("AC-FOLD-09", "REQ-FOLD-008", "the repository contains kit HELIX_RECON for FOBO", "a reviewer searches hub Java for if (product == FOBO) or if (kitId == \"FOBO\")", "no such branch exists"),
    ac("AC-FOLD-10", "REQ-FOLD-009", "REV-ACC has instances for COB 2026-09-12", "GET /api/stitch/instances is called with that group unit and COB", "the list contains those instances only"),
    ac("AC-FOLD-11", "REQ-FOLD-010", "the caller is not entitled to instance X", "GET /api/stitch/instance?id=X is called", "the hub responds 404"),
    ac("AC-FOLD-12", "REQ-FOLD-010", "instance Z does not exist", "GET /api/stitch/instance?id=Z is called", "the hub responds 404"),
    ac("AC-FOLD-13", "REQ-FOLD-001", "two required keys fail on the same instance", "fold recomputes", "status is BLOCKED and the named blocker is a failed required key"),
    ac("AC-FOLD-14", "REQ-FOLD-004", "a required source has not published any key", "other required keys are COMPLETED", "status is not READY"),
    ac("AC-FOLD-15", "REQ-FOLD-002", "all keys are WAITING and SLA is in the future", "fold recomputes", "status is NOT_YET"),
    ac("AC-FOLD-16", "REQ-FOLD-005", "the instance is NOT_YET", "a user posts sign-off", "the hub does not set CLEARED"),
    ac("AC-FOLD-17", "REQ-FOLD-006", "a source revokes a prior completion", "fold upserts the key", "the key state is REVOKED and the instance is not READY"),
    ac("AC-FOLD-18", "REQ-FOLD-009", "the header region filter is APAC", "GET /api/stitch/instances runs with region APAC", "EMEA instances are absent from the list"),
    ac("AC-FOLD-19", "REQ-FOLD-008", "a new kit id is registered as data", "facts arrive for that kit", "fold derives status from the kit's sources and keys without a new Java type"),
    ac("AC-FOLD-20", "REQ-FOLD-003", "the instance is DELAYED", "the last WAITING key becomes COMPLETED before any FAILED key exists", "status becomes READY"),
    ac("AC-FOLD-21", "REQ-FOLD-010", "the caller is not entitled to instance X", "POST /api/stitch/instance/signoff is called for X", "the hub responds 404"),
    ac("AC-FOLD-22", "REQ-FOLD-007", "three distinct trade keys are COMPLETED of three required", "fold recomputes progress", "the meter shows 3 of 3 for that source, not a higher count"),
    ac("AC-FOLD-23", "REQ-FOLD-004", "Board and My outcomes both list the same READY instance", "the user opens either surface", "both show READY for that instance id"),
]

ENGINE_REQ = [
    ("REQ-ENGINE-001", "Outcome Engine matches accepted events to OutcomeDefinition feeds on eventType and sourceSystem and re-derives the outcome instance."),
    ("REQ-ENGINE-002", "Derived engine stage walks NOT_STARTED, FEEDS, READY, PROCESSING, then GENERATED or AVAILABLE, or BLOCKED or FAILED."),
    ("REQ-ENGINE-003", "When a completion event includes reportId the engine attaches a ReportArtifact and the derived stage is AVAILABLE."),
    ("REQ-ENGINE-004", "When a completion event has no reportId the derived stage is GENERATED."),
    ("REQ-ENGINE-005", "GET /api/outcomes returns engine projections for the selected group-unit scope."),
    ("REQ-ENGINE-006", "GET /api/outcomes/{outcomeId}/{cobDate}/{region} returns one engine instance."),
    ("REQ-ENGINE-007", "GET /api/outcomes/{outcomeId}/{cobDate}/{region}/report returns the attached report document when the stage is AVAILABLE."),
    ("REQ-ENGINE-008", "Predicted-ready clocks are advisory and are not inputs to the readiness fold."),
    ("REQ-ENGINE-009", "Seeded definitions include FOBO_HELIX, REPORT_15C3, and PNL_REPORTING in application.yml."),
    ("REQ-ENGINE-010", "POST /api/outcomes/definitions creates a live OutcomeDefinition without a new Java product type."),
]

ENGINE_AC = [
    ac("AC-ENGINE-01", "REQ-ENGINE-001", "REPORT_15C3 lists a SAP trial-balance feed", "a SAP fact with that eventType and sourceSystem is accepted", "the engine instance for that outcome, COB, and region moves off NOT_STARTED"),
    ac("AC-ENGINE-02", "REQ-ENGINE-002", "no feeds have arrived", "GET /api/outcomes reads REPORT_15C3 for that COB and region", "stage is NOT_STARTED"),
    ac("AC-ENGINE-03", "REQ-ENGINE-002", "at least one feed has arrived and not all feeds are complete", "the engine re-derives", "stage is FEEDS"),
    ac("AC-ENGINE-04", "REQ-ENGINE-002", "all feeds are complete and on-ready has not finished", "the engine re-derives", "stage is READY or PROCESSING according to whether the action has started"),
    ac("AC-ENGINE-05", "REQ-ENGINE-003", "the generator publishes a completion event that includes reportId RPT-1", "the engine handles that event", "stage is AVAILABLE and a ReportArtifact with reportId RPT-1 is attached"),
    ac("AC-ENGINE-06", "REQ-ENGINE-004", "Helix publishes HELIX_ANALYSIS_COMPLETE without reportId", "the engine handles that event", "stage is GENERATED"),
    ac("AC-ENGINE-07", "REQ-ENGINE-005", "FOBO_HELIX and REPORT_15C3 have instances for the selected COB", "GET /api/outcomes is called", "both projections are present"),
    ac("AC-ENGINE-08", "REQ-ENGINE-006", "FOBO_HELIX exists for 2026-09-15 GLOBAL", "GET /api/outcomes/FOBO_HELIX/2026-09-15/GLOBAL is called", "the response is that one instance"),
    ac("AC-ENGINE-09", "REQ-ENGINE-007", "REPORT_15C3 is AVAILABLE with a report document", "GET /api/outcomes/REPORT_15C3/{cob}/{region}/report is called", "the response includes reportId, rowCount, and catalogId"),
    ac("AC-ENGINE-10", "REQ-ENGINE-007", "FOBO_HELIX is GENERATED with no reportId", "GET .../report is called", "the hub responds 4xx or an empty document contract that Reports treats as not AVAILABLE"),
    ac("AC-ENGINE-11", "REQ-ENGINE-008", "predicted ready is 19:46 and feeds are incomplete", "fold and engine re-derive", "stitch status is not forced to READY by the clock"),
    ac("AC-ENGINE-12", "REQ-ENGINE-009", "the hub starts with the seed file", "GET /api/outcomes/definitions is called", "the list includes FOBO_HELIX, REPORT_15C3, and PNL_REPORTING"),
    ac("AC-ENGINE-13", "REQ-ENGINE-010", "the maker submits the Month-end close example on /onboarding", "the hub handles POST /api/outcomes/definitions", "a new definition id appears on GET /api/outcomes/definitions"),
    ac("AC-ENGINE-14", "REQ-ENGINE-002", "a required feed publishes FAILED keys", "the engine re-derives", "stage is BLOCKED"),
    ac("AC-ENGINE-15", "REQ-ENGINE-002", "the on-ready action throws after READY", "the engine records the failure", "stage is FAILED"),
    ac("AC-ENGINE-16", "REQ-ENGINE-001", "an event has eventType that matches no definition feed", "the engine runs", "no existing outcome instance stage is changed by that event"),
    ac("AC-ENGINE-17", "REQ-ENGINE-006", "the outcomeId is unknown", "GET /api/outcomes/{outcomeId}/{cob}/{region} is called", "the hub responds 404"),
    ac("AC-ENGINE-18", "REQ-ENGINE-008", "Reports shows predicted ready", "the operator reads the copy", "the surface labels the clock as predicted or advisory, not as fold status"),
    ac("AC-ENGINE-19", "REQ-ENGINE-010", "POST /api/outcomes/definitions omits the question field", "the hub validates the body", "the hub responds 4xx and does not create a definition"),
    ac("AC-ENGINE-20", "REQ-ENGINE-005", "the selected region is AMERS", "GET /api/outcomes is called with that region", "GLOBAL-only rows that are not AMERS are absent"),
    ac("AC-ENGINE-21", "REQ-ENGINE-003", "stage is AVAILABLE", "Reports opens the document route", "the page renders the attached report fields"),
    ac("AC-ENGINE-22", "REQ-ENGINE-004", "stage is GENERATED", "Reports offers Open report", "the console still opens the engine result page for that outcome key"),
    ac("AC-ENGINE-23", "REQ-ENGINE-001", "two definitions share one eventType from different sourceSystems", "an event arrives with one of those sourceSystems", "only the definition whose feed lists that pair moves"),
]

ACTION_REQ = [
    ("REQ-ACTION-001", "When engine status is READY and onReady.action is not NOTIFY_ONLY the hub dispatches ActionExecutor for that action type."),
    ("REQ-ACTION-002", "Built-in ActionExecutor types are HTTP_COMMAND and LOG_COMMAND."),
    ("REQ-ACTION-003", "A new on-ready type is a new ActionExecutor bean plus definition data; it is not a new product Java type."),
    ("REQ-ACTION-004", "Action dispatch uses a runId and ignores a completion whose runId does not match the in-flight run."),
    ("REQ-ACTION-005", "POST /api/stitch/instance/action is allowed only when the kit userActions list contains that action name."),
    ("REQ-ACTION-006", "SIGN_OFF, POST, ESCALATE, ADJUST, and COUNTERSIGN keep rich behaviour; any other declared verb writes audit and WORKFLOW_<VERB>."),
    ("REQ-ACTION-007", "POST /api/outcomes/{outcomeId}/{cobDate}/{region}/run re-runs the on-ready action for that instance."),
    ("REQ-ACTION-008", "The console instance page renders only kit-declared actions and does not invent extra verbs."),
    ("REQ-ACTION-009", "NOTIFY_ONLY on a READY engine instance does not call HTTP_COMMAND or LOG_COMMAND."),
    ("REQ-ACTION-010", "A disabled action states the fold or kit reason next to the control."),
    ("REQ-ACTION-011", "When ADJUST is declared, POST /api/stitch/instance/action?action=ADJUST on a BLOCKED or READY instance records a pending command_run dest FAS_MOTIF with a runId and publishes ADJUST_REQUESTED."),
    ("REQ-ACTION-012", "When COUNTERSIGN is declared, SIGN_OFF on READY sets SIGNED; COUNTERSIGN by a different entitled actor sets CLEARED; COUNTERSIGN by signedBy is rejected."),
    ("REQ-ACTION-013", "When a stitch event carries account, journalId, amount, or fsLine attributes, the hub copies those values onto the instance and GET instances plus GET instance return them."),
]

ACTION_AC = [
    ac("AC-ACTION-01", "REQ-ACTION-001", "FOBO_HELIX onReady.action is HTTP_COMMAND and the instance is READY", "the engine emits the ready transition", "ActionDispatcher runs HTTP_COMMAND with a new runId"),
    ac("AC-ACTION-02", "REQ-ACTION-002", "a definition sets onReady.action to LOG_COMMAND", "the instance becomes READY", "the LOG_COMMAND executor runs"),
    ac("AC-ACTION-03", "REQ-ACTION-002", "a definition sets onReady.action to HTTP_COMMAND", "the instance becomes READY", "the HTTP_COMMAND executor runs"),
    ac("AC-ACTION-04", "REQ-ACTION-003", "an engineer adds bean SlackCommand and a definition names SLACK_COMMAND", "that definition becomes READY", "SlackCommand runs and no FOBO Java type was added"),
    ac("AC-ACTION-05", "REQ-ACTION-004", "instance actionRunId is RUN-1", "a completion arrives with runId RUN-2", "the engine does not apply that completion to the instance"),
    ac("AC-ACTION-06", "REQ-ACTION-004", "instance actionRunId is RUN-1", "a completion arrives with runId RUN-1 and reportId RPT-1", "the engine applies the completion"),
    ac("AC-ACTION-07", "REQ-ACTION-005", "the kit userActions list contains AMEND and not APPROVE", "POST /api/stitch/instance/action?action=AMEND is called on a entitled READY instance", "the hub accepts the call and writes audit"),
    ac("AC-ACTION-08", "REQ-ACTION-005", "the kit userActions list does not contain APPROVE", "POST /api/stitch/instance/action?action=APPROVE is called", "the hub rejects the call"),
    ac("AC-ACTION-09", "REQ-ACTION-006", "the instance is READY, SIGN_OFF is declared, and COUNTERSIGN is not declared", "POST /api/stitch/instance/signoff succeeds", "status becomes CLEARED"),
    ac("AC-ACTION-10", "REQ-ACTION-006", "the instance is READY and POST is declared", "POST /api/stitch/instance/post succeeds", "the hub records a command runId and dest FAS_MOTIF"),
    ac("AC-ACTION-11", "REQ-ACTION-006", "ESCALATE is declared", "POST /api/stitch/instance/escalate succeeds", "open escalation count on that instance increases by one"),
    ac("AC-ACTION-12", "REQ-ACTION-006", "AMEND is declared and has no rich handler", "POST /api/stitch/instance/action?action=AMEND succeeds", "audit contains AMEND and an event WORKFLOW_AMEND is published"),
    ac("AC-ACTION-13", "REQ-ACTION-007", "an engine instance exists", "POST /api/outcomes/{id}/{cob}/{region}/run is called by an entitled operator", "ActionDispatcher runs again with a new runId"),
    ac("AC-ACTION-14", "REQ-ACTION-008", "the kit lists SIGN_OFF and AMEND", "the user opens /instance/{id}", "the page shows SIGN_OFF and AMEND and does not show APPROVE"),
    ac("AC-ACTION-15", "REQ-ACTION-009", "onReady.action is NOTIFY_ONLY and the instance is READY", "the engine completes the ready transition", "HTTP_COMMAND and LOG_COMMAND do not run"),
    ac("AC-ACTION-16", "REQ-ACTION-010", "the instance is BLOCKED", "the instance page renders SIGN_OFF", "the control is disabled and the named blocker is visible beside it"),
    ac("AC-ACTION-17", "REQ-ACTION-005", "the caller is not entitled to the instance", "POST /api/stitch/instance/action is called", "the hub responds 404"),
    ac("AC-ACTION-18", "REQ-ACTION-012", "the instance is READY and the kit lists SIGN_OFF and COUNTERSIGN", "POST /api/stitch/instance/action?action=SIGN_OFF succeeds", "status becomes SIGNED and is not CLEARED"),
    ac("AC-ACTION-19", "REQ-ACTION-008", "the kit userActions list is empty", "the user opens /instance/{id}", "the page shows no invented verbs"),
    ac("AC-ACTION-20", "REQ-ACTION-012", "the instance is SIGNED by alice.revacc", "alice.revacc posts COUNTERSIGN", "the hub rejects the call and status stays SIGNED"),
    ac("AC-ACTION-21", "REQ-ACTION-007", "the outcomeId is unknown", "POST .../run is called", "the hub responds 404"),
    ac("AC-ACTION-22", "REQ-ACTION-011", "ADJUST is declared and the instance is BLOCKED", "POST /api/stitch/instance/action?action=ADJUST succeeds", "the hub records a command runId and dest FAS_MOTIF"),
    ac("AC-ACTION-23", "REQ-ACTION-012", "the instance is SIGNED by alice.revacc and gla.reviewer is entitled", "gla.reviewer posts COUNTERSIGN", "status becomes CLEARED"),
]

CONSOLE_REQ = [
    ("REQ-CONSOLE-001", "The product wordmark is One Finance with no UX suffix on the rail, the document title, and the collapsed top header."),
    ("REQ-CONSOLE-002", "The brand mark is a briefcase on the MITR indigo-lavender tile."),
    ("REQ-CONSOLE-003", "When the rail is expanded the brand mark and wordmark appear on the rail and do not appear in the top header."),
    ("REQ-CONSOLE-004", "When the rail is collapsed the brand mark and wordmark appear once in the top header beside Group unit, and the rail brand slot shows only the expand control."),
    ("REQ-CONSOLE-005", "html[data-theme] is dark or light; the choice persists in localStorage ofx-theme and a URL theme= parameter overrides it."),
    ("REQ-CONSOLE-006", "The context ribbon always shows group_unit, cob, region, view, instance counts, ready, blocked, and escalations."),
    ("REQ-CONSOLE-007", "Top-bar View values are all, developer, architect, controller, head, rtb, and maker; a view filters the rail and is not entitlement."),
    ("REQ-CONSOLE-008", "Guide routes /product, /architecture, and /guide remain on the rail in every view."),
    ("REQ-CONSOLE-009", "Home and Reports do not render Drive or scenario buttons."),
    ("REQ-CONSOLE-010", "Below 820px the rail is an overlay drawer, a hamburger opens it, and a labelled bottom nav of five primary destinations is the primary movement control."),
    ("REQ-CONSOLE-011", "Every page under frontend/web/src/pages is routed and has a job listed in this specification."),
    ("REQ-CONSOLE-012", "Dropdown options for group unit, COB, and region come from hub APIs; the console does not invent those ids."),
    ("REQ-CONSOLE-013", "Board and instance detail show account, journalId, amount, and fsLine when the instance carries those fields."),
    ("REQ-CONSOLE-014", "Instance readiness fold hides event history until the operator clicks a feed, then GET /api/stitch/instance/step-view returns that feed's events."),
    ("REQ-CONSOLE-015", "Open partner screen renders the kit embed URL as an iframe in the console and does not navigate to a new tab."),
    ("REQ-CONSOLE-016", "GET /api/stitch/instance/step-view?id=&ref= returns kind GRID with columns and rows, or kind IFRAME with embedUrl, from destination surface data, and 404 when the instance is unentitled."),
]

CONSOLE_AC = [
    ac("AC-CONSOLE-01", "REQ-CONSOLE-001", "the console is loaded", "the operator reads the document title", "the title is One Finance"),
    ac("AC-CONSOLE-02", "REQ-CONSOLE-001", "the rail is expanded", "the operator reads the rail wordmark", "the text is One Finance and Outcome platform with no UX suffix"),
    ac("AC-CONSOLE-03", "REQ-CONSOLE-002", "the rail is expanded", "the operator inspects the rail brand mark", "the mark is a briefcase on the MITR tile"),
    ac("AC-CONSOLE-04", "REQ-CONSOLE-003", "ofx-rail is 0", "the home page renders", "the top header does not display the top-brand block and the rail displays the brand"),
    ac("AC-CONSOLE-05", "REQ-CONSOLE-004", "ofx-rail is 1", "the home page renders", "the top header displays One Finance and Outcome platform beside Group unit and the rail brand is hidden"),
    ac("AC-CONSOLE-06", "REQ-CONSOLE-004", "ofx-rail is 1", "the operator inspects the rail top", "the only control in the brand slot is the expand chevron"),
    ac("AC-CONSOLE-07", "REQ-CONSOLE-005", "data-theme is dark", "the operator clicks the theme control", "data-theme becomes light and localStorage ofx-theme is light"),
    ac("AC-CONSOLE-08", "REQ-CONSOLE-005", "localStorage ofx-theme is light", "the operator opens /?theme=dark", "data-theme is dark"),
    ac("AC-CONSOLE-09", "REQ-CONSOLE-006", "any product route is open", "the operator reads the context ribbon", "group_unit, cob, region, view, instances, ready, blocked, and escalations are visible"),
    ac("AC-CONSOLE-10", "REQ-CONSOLE-007", "View is set to head", "the rail renders", "Drive is absent and Board remains"),
    ac("AC-CONSOLE-11", "REQ-CONSOLE-007", "View is controller", "the operator opens an instance they are not entitled to by URL", "the hub still fail-closes that instance with 404"),
    ac("AC-CONSOLE-12", "REQ-CONSOLE-008", "View is rtb", "the rail renders", "/product, /architecture, and /guide remain listed"),
    ac("AC-CONSOLE-13", "REQ-CONSOLE-009", "the operator is on /", "the operator scans the page for scenario or Drive buttons", "none are present"),
    ac("AC-CONSOLE-14", "REQ-CONSOLE-009", "the operator is on /reports", "the operator scans the page for scenario or Drive buttons", "none are present"),
    ac("AC-CONSOLE-15", "REQ-CONSOLE-010", "the viewport width is 400px", "the console renders", "the rail is off-canvas until the hamburger is used and the bottom nav is visible"),
    ac("AC-CONSOLE-16", "REQ-CONSOLE-010", "the viewport width is 400px and the drawer is closed", "the operator uses bottom nav", "the five labelled destinations change the route"),
    ac("AC-CONSOLE-17", "REQ-CONSOLE-011", "a reviewer lists frontend/web/src/pages", "each file is opened against App.jsx routes", "every page component is routed"),
    ac("AC-CONSOLE-18", "REQ-CONSOLE-012", "GET /api/stitch/context returns group units and cobDates", "the top-bar Group unit and date controls render", "every option value equals a value from that API"),
    ac("AC-CONSOLE-19", "REQ-CONSOLE-012", "the hub returns no extra group unit NEW-UNIT", "the Group unit control renders", "NEW-UNIT is absent"),
    ac("AC-CONSOLE-20", "REQ-CONSOLE-014", "instance R-2031 has CATS and MOTIF facts stored", "the operator opens the instance page", "the Facts for this instance table is not shown until a feed is clicked"),
    ac("AC-CONSOLE-21", "REQ-CONSOLE-015", "the instance kit has an embed URL", "the operator clicks Open partner screen", "the partner document loads in an iframe on the instance page and the browser does not open a new tab"),
    ac("AC-CONSOLE-22", "REQ-CONSOLE-016", "HELIX surface is IFRAME and FAS_MOTIF surface is GRID with report_source_id MOTIF", "GET step-view is called for HELIX then FAS_MOTIF on an entitled instance", "HELIX returns kind IFRAME with the kit embedUrl and FAS_MOTIF returns kind GRID of Motif events"),
    ac("AC-CONSOLE-23", "REQ-CONSOLE-013", "instance R-2031 carries amount 12450000 and account 410000", "the operator opens Board and the instance page", "both surfaces show the amount and the instance page shows account, journalId, and fsLine from REQ-ACTION-013"),
]

REPORTS_REQ = [
    ("REQ-REPORTS-001", "GET /reports lists engine outcomes for the selected scope."),
    ("REQ-REPORTS-002", "Reports layout values are normal, compact, and table."),
    ("REQ-REPORTS-003", "Reports persists the layout in localStorage ofx-reports-view and honours ?view=normal|compact|table."),
    ("REQ-REPORTS-004", "Normal layout shows question, predicted ready, and per-feed meters."),
    ("REQ-REPORTS-005", "Compact layout hides the question, predicted ready, and per-feed meters and keeps the stage flow."),
    ("REQ-REPORTS-006", "Table layout renders one row per outcome with stage, region, COB, feeds, and Open report."),
    ("REQ-REPORTS-007", "Each Reports row or card links to /reports/:outcomeId/:cobDate/:region."),
    ("REQ-REPORTS-008", "The document route renders the engine instance and the report payload when present."),
    ("REQ-REPORTS-009", "Reports does not render Drive or scenario buttons."),
    ("REQ-REPORTS-010", "The five-stage flow uses Feeds in, Ready, Processing, Generated, and Available."),
]

REPORTS_AC = [
    ac("AC-REPORTS-01", "REQ-REPORTS-001", "engine projections exist for the selected COB", "the operator opens /reports", "each projection appears as a card or table row"),
    ac("AC-REPORTS-02", "REQ-REPORTS-002", "the operator is on /reports", "the page header renders", "the segmented control lists Normal, Compact, and Table"),
    ac("AC-REPORTS-03", "REQ-REPORTS-003", "the operator clicks Compact", "the page re-renders", "localStorage ofx-reports-view is compact and cards use the compact class"),
    ac("AC-REPORTS-04", "REQ-REPORTS-003", "ofx-reports-view is table", "the operator opens /reports with no query", "the table layout renders"),
    ac("AC-REPORTS-05", "REQ-REPORTS-003", "the operator opens /reports?view=normal", "the page renders", "Normal is the selected tab regardless of prior localStorage"),
    ac("AC-REPORTS-06", "REQ-REPORTS-004", "layout is normal and FOBO_HELIX is listed", "the operator reads the card", "the question, predicted-ready block, and feed meters are visible"),
    ac("AC-REPORTS-07", "REQ-REPORTS-005", "layout is compact and FOBO_HELIX is listed", "the operator reads the card", "the question, predicted-ready block, and feed meters are absent and the stage flow is present"),
    ac("AC-REPORTS-08", "REQ-REPORTS-006", "layout is table", "the operator reads the grid", "columns include Report, Stage, Region, COB, Feeds, and an Open report control"),
    ac("AC-REPORTS-09", "REQ-REPORTS-007", "FOBO_HELIX 2026-09-15 GLOBAL is listed", "the operator clicks the report name", "the console navigates to /reports/FOBO_HELIX/2026-09-15/GLOBAL"),
    ac("AC-REPORTS-10", "REQ-REPORTS-007", "layout is table", "the operator clicks Open report on that row", "the console navigates to the same document route"),
    ac("AC-REPORTS-11", "REQ-REPORTS-008", "the document route loads an AVAILABLE 15C3 instance", "the page finishes rendering", "reportId and rowCount are visible"),
    ac("AC-REPORTS-12", "REQ-REPORTS-008", "the document route loads a GENERATED Helix instance", "the page finishes rendering", "the engine result is visible even when no reportId exists"),
    ac("AC-REPORTS-13", "REQ-REPORTS-009", "the operator is on /reports", "the operator scans for Reset or scenario buttons", "none are present"),
    ac("AC-REPORTS-14", "REQ-REPORTS-010", "a card is in normal layout", "the operator reads the flow", "the five labels are Feeds in, Ready, Processing, Generated, Available"),
    ac("AC-REPORTS-15", "REQ-REPORTS-010", "stage is GENERATED", "the flow renders", "Generated is the active step and Available is not done"),
    ac("AC-REPORTS-16", "REQ-REPORTS-010", "stage is AVAILABLE", "the flow renders", "all five steps are done"),
    ac("AC-REPORTS-17", "REQ-REPORTS-001", "no engine projections exist for the filters", "the operator opens /reports", "the page shows the empty state, not a prior COB's rows"),
    ac("AC-REPORTS-18", "REQ-REPORTS-002", "the operator clicks Table then Normal", "the page re-renders", "cards return to normal density"),
    ac("AC-REPORTS-19", "REQ-REPORTS-006", "five outcomes exist", "table layout renders", "the panel hint shows 5"),
    ac("AC-REPORTS-20", "REQ-REPORTS-008", "the outcomeId in the URL is unknown", "the document route loads", "the page shows a not-found or error banner"),
    ac("AC-REPORTS-21", "REQ-REPORTS-004", "stage is BLOCKED", "normal layout renders the flow", "the Feeds in step is in the error state"),
    ac("AC-REPORTS-22", "REQ-REPORTS-005", "compact layout is selected on a phone-width viewport", "the flow renders", "stage names remain readable in the stacked flow"),
    ac("AC-REPORTS-23", "REQ-REPORTS-007", "the operator is on compact layout", "the operator clicks Open report", "the document route opens for that outcome key"),
]

GOVERN_REQ = [
    ("REQ-GOVERN-001", "POST /api/outcomes/definitions creates an OutcomeDefinition from question, regions, owner, SLA, feeds, and on-ready."),
    ("REQ-GOVERN-002", "/onboarding is the create surface for OutcomeDefinition and is not the govern surface."),
    ("REQ-GOVERN-003", "/configuration is a master-detail govern surface for outcomes and kits and is not a create form."),
    ("REQ-GOVERN-004", "POST /api/stitch/kits registers a kit with sources, destinations, embed, and userActions and does not require a new Java type."),
    ("REQ-GOVERN-005", "GET /api/outcomes/definitions and GET /api/stitch/kits populate Configuration lists."),
    ("REQ-GOVERN-006", "Configuration right pane shows anatomy and live state for the selected outcome or kit."),
    ("REQ-GOVERN-007", "Onboarding validation rejects a definition that omits id, name, question, or feeds."),
    ("REQ-GOVERN-008", "A created definition appears on Board, Reports, and Configuration for the given COB once instances exist."),
    ("REQ-GOVERN-009", "Kit create remains available on POST /api/stitch/kits; the console does not add a second kit-create screen in this phase."),
    ("REQ-GOVERN-010", "Configuration links makers to /onboarding when they need to create an outcome."),
]

GOVERN_AC = [
    ac("AC-GOVERN-01", "REQ-GOVERN-001", "the maker is on /onboarding", "the maker submits the Month-end close example", "POST /api/outcomes/definitions succeeds and the id is listed on GET /api/outcomes/definitions"),
    ac("AC-GOVERN-02", "REQ-GOVERN-002", "the maker is on /onboarding", "the page renders", "the primary action is create, not inspect of every existing outcome"),
    ac("AC-GOVERN-03", "REQ-GOVERN-003", "the owner is on /configuration", "the page renders", "the left list is pick-an-outcome-or-kit and there is no create form on that page"),
    ac("AC-GOVERN-04", "REQ-GOVERN-004", "a client posts a kit body with kitId, sources, destinations, embed, and userActions", "POST /api/stitch/kits succeeds", "GET /api/stitch/kit?id= that kitId returns the same userActions"),
    ac("AC-GOVERN-05", "REQ-GOVERN-005", "FOBO_HELIX and HELIX_RECON exist", "the owner opens /configuration", "both names appear in the master list"),
    ac("AC-GOVERN-06", "REQ-GOVERN-006", "the owner selects REPORT_15C3", "the right pane renders", "feeds, SLA, and on-ready are visible"),
    ac("AC-GOVERN-07", "REQ-GOVERN-006", "the owner selects the FOBO kit", "the right pane renders", "sources, destinations, embed URL, and userActions are visible"),
    ac("AC-GOVERN-08", "REQ-GOVERN-007", "the maker clears the question field", "the maker submits Onboarding", "the hub or the form rejects the submit and no definition is created"),
    ac("AC-GOVERN-09", "REQ-GOVERN-007", "the maker omits feeds", "the maker submits Onboarding", "the submit is rejected"),
    ac("AC-GOVERN-10", "REQ-GOVERN-008", "a new definition is created for today's COB", "Drive or ingest produces an instance", "Board and Reports list that outcome"),
    ac("AC-GOVERN-11", "REQ-GOVERN-008", "the new definition exists", "the owner opens /configuration", "the definition is in the master list"),
    ac("AC-GOVERN-12", "REQ-GOVERN-009", "a reviewer inspects App.jsx routes", "kit create is checked", "no extra kit-create page exists beyond the API and Onboarding outcome form"),
    ac("AC-GOVERN-13", "REQ-GOVERN-010", "the owner is on /configuration", "the owner wants to create", "a control links to /onboarding"),
    ac("AC-GOVERN-14", "REQ-GOVERN-001", "the posted definition lists two regions", "GET /api/outcomes/definitions returns it", "both regions are present on the record"),
    ac("AC-GOVERN-15", "REQ-GOVERN-004", "the posted kit omits kitId", "POST /api/stitch/kits is called", "the hub responds 4xx"),
    ac("AC-GOVERN-16", "REQ-GOVERN-003", "the owner is on /configuration", "the owner scans for a Drive scenario button", "none is present"),
    ac("AC-GOVERN-17", "REQ-GOVERN-006", "live instances exist for the selected outcome", "the right pane renders", "live status for the current header COB is visible"),
    ac("AC-GOVERN-18", "REQ-GOVERN-002", "the maker is on /onboarding", "the maker reads the page title", "the job is create a live OutcomeDefinition"),
    ac("AC-GOVERN-19", "REQ-GOVERN-005", "GET /api/stitch/kits fails", "Configuration loads kits", "the page shows an error banner and an empty kit list, not invented kits"),
    ac("AC-GOVERN-20", "REQ-GOVERN-001", "onReady.action is HTTP_COMMAND in the posted body", "the definition is stored", "Configuration shows HTTP_COMMAND for that outcome"),
    ac("AC-GOVERN-21", "REQ-GOVERN-004", "userActions contains SIGN_OFF and AMEND", "the kit is stored", "instance actions accept those two names only"),
    ac("AC-GOVERN-22", "REQ-GOVERN-010", "a new joiner follows /guide", "the first write path is described", "the path is Onboarding, not a Java product type"),
    ac("AC-GOVERN-23", "REQ-GOVERN-007", "id is empty", "the maker submits Onboarding", "the submit is rejected"),
]

OPERATE_REQ = [
    ("REQ-OPERATE-001", "Drive lives at /drive and exposes Reset plus scenarios fobo, helix, 15c3, pnl, restate, all, and cancel."),
    ("REQ-OPERATE-002", "Drive scenario buttons do not appear on Home or Reports."),
    ("REQ-OPERATE-003", "POST /api/stitch/reset clears stitch runtime state used by the demo."),
    ("REQ-OPERATE-004", "POST /sim/scenarios/{name} injects facts into the hub ingest."),
    ("REQ-OPERATE-005", "GET /api/stitch/rtb returns escalations, watermarks, and dead letters for Operations."),
    ("REQ-OPERATE-006", "Dead-letter replay requires dual control and writes audit."),
    ("REQ-OPERATE-007", "GET /api/stitch/monitor/overview, /outbox, /events, and /audit power Monitoring."),
    ("REQ-OPERATE-008", "GET /api/stream is Server-Sent Events and is the live channel to the console."),
    ("REQ-OPERATE-009", "The hub notifies on READY, BLOCKED, DELAYED, SLA_BREACHED, REVOKED, CLEARED, SIGNED_OFF, POSTED, ESCALATED, and kit-declared verbs."),
    ("REQ-OPERATE-010", "The hub does not notify on raw facts, PROGRESS ticks, or advisory model output."),
    ("REQ-OPERATE-011", "Board is the supervisor table; My outcomes is the doer card worklist; both drill to /instance/:id."),
    ("REQ-OPERATE-012", "Operations does not sign off a rec or publish a kit."),
]

OPERATE_AC = [
    ac("AC-OPERATE-01", "REQ-OPERATE-001", "the operator is on /drive", "the page renders", "Reset and the named scenarios are present"),
    ac("AC-OPERATE-02", "REQ-OPERATE-002", "the operator is on / or /reports", "the operator scans for scenario buttons", "none are present"),
    ac("AC-OPERATE-03", "REQ-OPERATE-003", "instances exist from a prior scenario", "POST /api/stitch/reset succeeds", "subsequent GET /api/stitch/instances is empty for that demo tenant until new facts arrive"),
    ac("AC-OPERATE-04", "REQ-OPERATE-004", "the hub is running", "POST /sim/scenarios/fobo succeeds", "R-1042 and R-2031 appear on Board"),
    ac("AC-OPERATE-05", "REQ-OPERATE-004", "header COB is today", "POST /sim/scenarios/helix succeeds", "FOBO_HELIX appears on Reports for that COB"),
    ac("AC-OPERATE-06", "REQ-OPERATE-001", "the operator clicks cancel on Drive", "POST /sim/scenarios/cancel succeeds", "no further scheduled simulator facts are posted"),
    ac("AC-OPERATE-07", "REQ-OPERATE-005", "an escalation exists", "the operator opens /operations", "that escalation is listed"),
    ac("AC-OPERATE-08", "REQ-OPERATE-006", "a dead letter exists and dual control is satisfied", "replay is posted to /api/stitch/deadletters/{id}/replay", "audit records the replay and the event is re-offered"),
    ac("AC-OPERATE-09", "REQ-OPERATE-006", "dual control is not satisfied", "replay is posted", "the hub rejects the replay"),
    ac("AC-OPERATE-10", "REQ-OPERATE-007", "events have been ingested", "the operator opens /monitoring", "received, persisted, and audit entries are visible"),
    ac("AC-OPERATE-11", "REQ-OPERATE-008", "the console is connected", "the live pill renders", "the pill reads live while the SSE stream is open"),
    ac("AC-OPERATE-12", "REQ-OPERATE-008", "the hub is stopped", "the console cannot open /api/stream", "the live pill reads offline"),
    ac("AC-OPERATE-13", "REQ-OPERATE-009", "R-1042 becomes READY", "notification inbox is fetched", "a READY notification exists for that instance"),
    ac("AC-OPERATE-14", "REQ-OPERATE-010", "a Motif PROGRESS tick is ingested", "notification inbox is fetched", "no notification is created for that tick"),
    ac("AC-OPERATE-15", "REQ-OPERATE-011", "R-1042 is READY", "the head opens /board", "the row shows READY, blocker empty, and escalation count"),
    ac("AC-OPERATE-16", "REQ-OPERATE-011", "R-1042 is READY", "the doer opens /outcomes", "a card for R-1042 is shown"),
    ac("AC-OPERATE-17", "REQ-OPERATE-011", "the doer clicks the R-1042 card", "the console navigates", "the route is /instance/{id} for that instance"),
    ac("AC-OPERATE-18", "REQ-OPERATE-012", "the operator is on /operations", "the operator looks for SIGN_OFF", "the page does not offer sign-off"),
    ac("AC-OPERATE-19", "REQ-OPERATE-004", "POST /sim/scenarios/15c3?failure=false succeeds", "Reports is opened for that COB", "REPORT_15C3 is listed"),
    ac("AC-OPERATE-20", "REQ-OPERATE-009", "a user signs off R-1042", "notification inbox is fetched", "a SIGNED_OFF or CLEARED notification exists"),
    ac("AC-OPERATE-21", "REQ-OPERATE-007", "outbox has a failed row", "Monitoring outbox filter is set to that status", "only matching rows are listed"),
    ac("AC-OPERATE-22", "REQ-OPERATE-001", "View is head", "the rail renders", "Drive is hidden and /drive still works if opened by URL for an entitled tester"),
    ac("AC-OPERATE-23", "REQ-OPERATE-010", "an advisory comment is stored off the fold", "notification inbox is fetched", "no notification is created for that advisory comment"),
]

NFR_REQ = [
    ("REQ-NFR-001", "Hub and tests run on Java 21 with mvn -B verify in CI."),
    ("REQ-NFR-002", "The console builds with npm ci && npm run build in frontend/web in CI."),
    ("REQ-NFR-003", "Phase 1 persistence is the hub store (H2 in the local demo) and does not require Kafka, Redis, or a cloud bus."),
    ("REQ-NFR-004", "The console uses REST plus SSE only."),
    ("REQ-NFR-005", "Theme tokens live in frontend/web/src/styles.css and frontend/theme/onefinux-tokens.css."),
    ("REQ-NFR-006", "Partner embeds import --ofx-* tokens and omit their own masthead."),
]

SUBSYSTEMS = [
    ("INGEST", "Event ingest and translation", INGEST_REQ, INGEST_AC),
    ("FOLD", "Stitch fold", FOLD_REQ, FOLD_AC),
    ("ENGINE", "Outcome Engine", ENGINE_REQ, ENGINE_AC),
    ("ACTION", "Actions and executors", ACTION_REQ, ACTION_AC),
    ("CONSOLE", "Console chrome", CONSOLE_REQ, CONSOLE_AC),
    ("REPORTS", "Reports index and document", REPORTS_REQ, REPORTS_AC),
    ("GOVERN", "Onboarding and configuration", GOVERN_REQ, GOVERN_AC),
    ("OPERATE", "Drive, operations, monitoring, notifications", OPERATE_REQ, OPERATE_AC),
]


def render() -> str:
    lines: list[str] = []
    a = lines.append

    a("# One Finance Specification")
    a("")
    a("This document is the spec-driven contract for One Finance. Implementers write code and tests against REQ-IDs and AC-IDs. Narrative design remains in the companion files listed in References.")
    a("")

    a("## 1. Document control")
    a("")
    a("This section identifies the document, its status, and the files it sits beside.")
    a("")
    a("### 1.1 Identification")
    a("")
    a("| Field | Value |")
    a("| --- | --- |")
    a("| Product | One Finance |")
    a("| Document | Specification |")
    a("| Version | 1.2.0 |")
    a("| Date | 16 September 2026 |")
    a("| Owner | Praveen Kumar |")
    a("| Audience | Implementers, reviewers, architecture group |")
    a("| Rule set | LLM generic coding spec: complete sections, REQ-IDs, Given/When/Then, AC mapping, no banned wording, no H1 to H3 jumps |")
    a("")
    a("### 1.2 Status")
    a("")
    a("This specification describes the as-built phase-1 product: `onefinux-hub` on port 7070, `source-simulator` on port 7081, and `frontend/web` on port 7091. Later bus mix, live CEES, live Helix, and Wijmo are listed under Out of scope.")
    a("")
    a("### 1.3 Companion files")
    a("")
    a("This specification does not replace `as-built.md`. As-built remains the short route map. This file is the requirement and acceptance contract.")
    a("")

    a("## 2. Purpose")
    a("")
    a("This section states the business problem, the product purpose, and how a reviewer knows the work is done.")
    a("")
    a("### 2.1 Problem")
    a("")
    a("At close of business a group unit must answer one business question per outcome. Origin systems already emit facts. The unit does not get a Ready, Blocked, or Delayed answer unless a thin layer folds those facts and then acts.")
    a("")
    a("### 2.2 Product purpose")
    a("")
    a("One Finance folds facts into Ready, Blocked, or Delayed, executes the configured on-ready action, and governs every step. Products are data. The console is the entitled outcome surface.")
    a("")
    a("### 2.3 Success")
    a("")
    a("A reviewer can pick any REQ-ID, open the mapped AC-IDs, and execute those Given/When/Then cases against the running hub and console. CI `mvn -B verify` and `frontend/web` `npm run build` stay green.")
    a("")

    a("## 3. Scope")
    a("")
    a("This section bounds phase 1. Work outside these bounds needs a new REQ-ID before code changes.")
    a("")
    a("### 3.1 In scope")
    a("")
    a("HTTP ingest, JSON Schema validation, translation, Outcome Engine, Stitch fold, ActionExecutor registry, kit `userActions` including ADJUST and COUNTERSIGN, REST, SSE, outbox, audit, React console routes listed in this document, Drive scenarios on `/drive`, MITR chrome, One Finance wordmark, Reports Normal/Compact/Table, accounting item attributes on stitch instances, instance step-view GRID or IFRAME, in-shell partner iframe, and fail-closed 404 on unentitled stitch instances.")
    a("")
    a("### 3.2 Out of scope")
    a("")
    a("Bank Kafka or Solace, Redis, AWS SNS/SQS/Lambda as the fold, live CEES directory, live Helix/FAS/Axiom networks, Barclays Now, Wijmo analyst studio, a native second product, Drive buttons on Home or Reports, `if (FOBO)` branches, frosted glass, and any LLM on the fold.")
    a("")
    a("### 3.3 Phase boundary")
    a("")
    a("Phase 1 runs on-prem with HTTP ingest and the hub store. An optional later bus is an additional publisher into the same ingest contract, not a replacement of the fold.")
    a("")

    a("## 4. Definitions")
    a("")
    a("| Term | Meaning |")
    a("| --- | --- |")
    a("| Outcome | One business question for one group unit, COB, and region |")
    a("| OutcomeDefinition | Engine product data: question, feeds, SLA, on-ready |")
    a("| Kit | Stitch product data: sources, destinations, embed, userActions |")
    a("| Fold | Deterministic recompute of stitch instance status from readiness keys |")
    a("| Engine stage | Derived report or command lifecycle on the Outcome Engine |")
    a("| Named blocker | The required key that forced BLOCKED |")
    a("| runId | Identifier that binds one on-ready or POST command to its completion |")
    a("| CEES | Entitlement check; unentitled reads fail closed as 404 |")
    a("| View | Rail filter stored in `ofx-view`; not entitlement |")
    a("| Drive | Testing surface at `/drive` that starts simulator scenarios |")
    a("| SIGNED | Maker has signed off; COUNTERSIGN from a different actor is still open |")
    a("| REQ-ID | Functional requirement identifier |")
    a("| AC-ID | Acceptance criterion identifier with Given/When/Then |")
    a("")

    a("## 5. References")
    a("")
    a("| Document | Role |")
    a("| --- | --- |")
    a("| `docs/design/as-built.md` | Route map and what not to do |")
    a("| `docs/design/accounting-journey.md` | Controller adjust and dual sign-off |")
    a("| `docs/design/application.md` | Modules, APIs, two models |")
    a("| `docs/design/start.md` | Run steps and review rules |")
    a("| `docs/design/architecture.md` | Mermaid diagrams |")
    a("| `contracts/inbound-event-v1` via `/api/contracts` | Ingest schema |")
    a("| `contracts/openapi.yaml` | Hub HTTP surface |")
    a("| `.cursor/skills/*` | Job-specific review rules |")
    a("| `AGENTS.md` | Agent notes |")
    a("")

    a("## 6. Actors")
    a("")
    a("| Actor | Uses | Does not |")
    a("| --- | --- | --- |")
    a("| Outcome user | `/outcomes`, `/instance/:id` | Head roll-ups, RTB replay |")
    a("| BU head / CIO / MD | `/board` | Sign-off or post |")
    a("| Controller | `/reports`, document route | Drive buttons |")
    a("| Maker | `/onboarding` | Treat Configuration as create |")
    a("| Owner / config | `/configuration` | Create on that page |")
    a("| RTB | `/operations`, `/monitoring` | Business sign-off |")
    a("| Demo / QA | `/drive` | Scenario buttons on Home or Reports |")
    a("| Engineer | `/guide`, `/architecture` | Product-specific Java types |")
    a("| Simulator | POST facts to the hub | Write hub tables directly |")
    a("")

    a("## 7. Constraints")
    a("")
    a("This section lists the technical, product, and wording constraints that every REQ-ID inherits.")
    a("")
    a("### 7.1 Technical constraints")
    a("")
    a("The browser talks to the hub over HTTP and SSE only. The fold is deterministic. LLM output is not an input to Ready or Blocked. Phase 1 does not require Kafka, Redis, or a cloud account. Java 21 and the current Node toolchain in `frontend/web/package.json` are the build floor.")
    a("")
    a("### 7.2 Product constraints")
    a("")
    a("Two models stay separate. Products are data. Views are not entitlement. Configuration is not a create form. Drive is not a product page. The wordmark is One Finance.")
    a("")
    a("### 7.3 Wording constraints for this specification")
    a("")
    a("Requirements use must, does, returns, and rejects. Weak preference verbs, performance slang, and placeholder tokens are absent. Heading levels increase by one.")
    a("")

    a("## 8. Assumptions")
    a("")
    a("Operators run `./scripts/run.sh` then `frontend/web` `npm run dev`. Demo COB for stitch recs is 2026-09-12 unless a scenario says otherwise. Helix engine demos use today's COB. Group unit REV-ACC is the worked example. Entitlement in phase 1 is the hub fail-closed 404 contract with the current demo user.")
    a("")

    a("## 9. System context")
    a("")
    a("This section places the three processes against origins and destinations.")
    a("")
    a("### 9.1 Processes")
    a("")
    a("| Process | Port | Responsibility |")
    a("| --- | --- | --- |")
    a("| `onefinux-hub` | 7070 | Ingest, both folds, REST, SSE, outbox, audit, ActionExecutor |")
    a("| `source-simulator` | 7081 | Origin and destination stubs; Drive scenarios |")
    a("| `frontend/web` | 7091 | Entitled console |")
    a("")
    a("### 9.2 Event path")
    a("")
    a("Simulator or origin posts HTTP to `/api/events`. Hub validates, persists, translates, runs Outcome Engine, runs Stitch fold, dispatches ActionExecutor when configured, writes outbox and audit, and pushes SSE. The console reads REST and listens to SSE.")
    a("")
    a("### 9.3 Adjacent systems that are not this product")
    a("")
    a("Motif, SAP, Helix, Axiom, CATS, MBR, FAS, and Kafka remain origins or destinations. They publish facts or receive commands. They do not compute Ready for the group unit.")
    a("")

    a("## 10. Subsystem catalog")
    a("")
    a("| Code | Name | Owns |")
    a("| --- | --- | --- |")
    a("| INGEST | Event ingest and translation | `/api/events`, contracts, simulator HTTP |")
    a("| FOLD | Stitch fold | Readiness keys, instance status, 404 contract |")
    a("| ENGINE | Outcome Engine | Definitions, stages, report artifact |")
    a("| ACTION | Actions and executors | ActionExecutor, kit verbs, runId |")
    a("| CONSOLE | Console chrome | Brand, theme, rail, views, ribbon |")
    a("| REPORTS | Reports | Layouts, document route, stage flow |")
    a("| GOVERN | Onboarding and configuration | Create vs govern |")
    a("| OPERATE | Drive, RTB, monitor, notify | Scenarios, replay, SSE, inbox |")
    a("")
    a("Each subsystem has numbered REQ-IDs and exactly 23 AC-IDs.")
    a("")

    a("## 11. Functional requirements")
    a("")
    a("This section states every functional REQ-ID by subsystem. Quality-attribute REQ-IDs follow the eight subsystems.")
    a("")
    for code, name, reqs, _acs in SUBSYSTEMS:
        a(f"### 11.{SUBSYSTEMS.index((code, name, reqs, _acs)) + 1} {name} ({code})")
        a("")
        a("| REQ-ID | Requirement |")
        a("| --- | --- |")
        for rid, stmt in reqs:
            a(f"| `{rid}` | {stmt} |")
        a("")

    a("### 11.9 Quality attributes (NFR)")
    a("")
    a("| REQ-ID | Requirement |")
    a("| --- | --- |")
    for rid, stmt in NFR_REQ:
        a(f"| `{rid}` | {stmt} |")
    a("")

    a("## 12. Acceptance criteria")
    a("")
    a("Each criterion is Given / When / Then and maps to one REQ-ID. Execute against the running hub and console unless the criterion names a static review.")
    a("")
    for i, (code, name, _reqs, acs) in enumerate(SUBSYSTEMS, start=1):
        a(f"### 12.{i} {name} ({code})")
        a("")
        a(f"These 23 criteria lock {code} behaviour. Each Maps-to line names one REQ-ID.")
        a("")
        for ac_id, req_id, given, when, then in acs:
            a(f"#### {ac_id}")
            a("")
            a(f"- Maps to: `{req_id}`")
            a(f"- Given {given}")
            a(f"- When {when}")
            a(f"- Then {then}")
            a("")

    a("## 13. Traceability")
    a("")
    a("This section maps every subsystem REQ-ID to AC-IDs and records NFR verification.")
    a("")
    a("### 13.1 Requirement to acceptance")
    a("")
    a("Every subsystem REQ-ID appears in at least one AC Maps-to line. The pairs are:")
    a("")
    a("| REQ-ID | AC-IDs |")
    a("| --- | --- |")
    for code, name, reqs, acs in SUBSYSTEMS:
        by_req = {rid: [] for rid, _ in reqs}
        for ac_id, req_id, *_ in acs:
            by_req.setdefault(req_id, []).append(ac_id)
        for rid, _stmt in reqs:
            ids = ", ".join(f"`{x}`" for x in by_req.get(rid, []))
            a(f"| `{rid}` | {ids} |")
    a("")
    a("### 13.2 Quality-attribute coverage")
    a("")
    a("| REQ-ID | Verification |")
    a("| --- | --- |")
    a("| `REQ-NFR-001` | CI job `mvn -B verify` |")
    a("| `REQ-NFR-002` | CI job `npm ci && npm run build` in `frontend/web` |")
    a("| `REQ-NFR-003` | Local `./scripts/run.sh` starts without Kafka or Redis |")
    a("| `REQ-NFR-004` | Browser network panel shows HTTP and SSE only |")
    a("| `REQ-NFR-005` | Theme edits land in the two token files |")
    a("| `REQ-NFR-006` | Partner skill `embed-partner-screen` |")
    a("")
    a("### 13.3 Completeness counts")
    a("")
    a("| Subsystem | REQ count | AC count |")
    a("| --- | --- | --- |")
    for code, name, reqs, acs in SUBSYSTEMS:
        a(f"| {code} | {len(reqs)} | {len(acs)} |")
    a("")

    a("## 14. Data contracts")
    a("")
    a("This section names the stored shapes the hub and console share.")
    a("")
    a("### 14.1 Inbound event")
    a("")
    a("POST `/api/events` validates `inbound-event-v1`. Required business fields include event identity, sourceSystem, eventType, and the attributes the translator maps onto group unit, COB, region, and instance. Duplicate `eventId` is idempotent.")
    a("")
    a("### 14.2 OutcomeDefinition")
    a("")
    a("Fields: `id`, `name`, `question`, `regions`, `ownerGroup`, `sla`, `dependencies[]`, `onReady`. Seeded ids: `FOBO_HELIX`, `REPORT_15C3`, `PNL_REPORTING`.")
    a("")
    a("### 14.3 Kit")
    a("")
    a("Fields: `kitId`, sources, destinations, embed, `userActions`. FOBO is `HELIX_RECON` data.")
    a("")
    a("### 14.4 Stitch instance")
    a("")
    a("Status: `NOT_YET`, `READY`, `BLOCKED`, `CLEARED`, `DELAYED`. Keys: `WAITING`, `COMPLETED`, `FAILED`, `REVOKED`.")
    a("")
    a("### 14.5 Engine instance")
    a("")
    a("Stage: `NOT_STARTED`, `FEEDS`, `READY`, `PROCESSING`, `GENERATED`, `AVAILABLE`, `BLOCKED`, `FAILED`. A completion with `reportId` attaches `ReportArtifact`.")
    a("")

    a("## 15. Interfaces")
    a("")
    a("This section lists the hub HTTP paths and console routes that implement the REQ-IDs.")
    a("")
    a("### 15.1 Hub HTTP")
    a("")
    a("| Method | Path | Subsystem |")
    a("| --- | --- | --- |")
    a("| POST | `/api/events` | INGEST |")
    a("| POST | `/api/events/batch` | INGEST |")
    a("| GET | `/api/events` | INGEST |")
    a("| GET | `/api/contracts` | INGEST |")
    a("| GET | `/api/stitch/instances` | FOLD |")
    a("| GET | `/api/stitch/instance` | FOLD |")
    a("| POST | `/api/stitch/instance/signoff` | ACTION |")
    a("| POST | `/api/stitch/instance/post` | ACTION |")
    a("| POST | `/api/stitch/instance/escalate` | ACTION |")
    a("| POST | `/api/stitch/instance/action` | ACTION |")
    a("| GET | `/api/outcomes` | ENGINE |")
    a("| GET | `/api/outcomes/{outcomeId}/{cobDate}/{region}` | ENGINE |")
    a("| GET | `/api/outcomes/{outcomeId}/{cobDate}/{region}/report` | ENGINE |")
    a("| POST | `/api/outcomes/definitions` | GOVERN |")
    a("| POST | `/api/stitch/kits` | GOVERN |")
    a("| POST | `/api/stitch/reset` | OPERATE |")
    a("| GET | `/api/stream` | OPERATE |")
    a("| GET | `/api/stitch/monitor/*` | OPERATE |")
    a("| POST | `/api/stitch/deadletters/{id}/replay` | OPERATE |")
    a("| POST | `/sim/scenarios/{name}` | OPERATE |")
    a("")
    a("### 15.2 Console routes")
    a("")
    a("| Route | Subsystem |")
    a("| --- | --- |")
    a("| `/` | CONSOLE |")
    a("| `/product` `/architecture` `/guide` | CONSOLE |")
    a("| `/board` `/outcomes` `/instance/:id` | FOLD, ACTION, OPERATE |")
    a("| `/reports` `/reports/:outcomeId/:cobDate/:region` | REPORTS |")
    a("| `/onboarding` `/configuration` | GOVERN |")
    a("| `/drive` | OPERATE |")
    a("| `/operations` `/monitoring` | OPERATE |")
    a("")

    a("## 16. Fail-closed behaviour and errors")
    a("")
    a("This section states how the hub answers invalid, unentitled, or mismatched calls.")
    a("")
    a("### 16.1 Entitlement")
    a("")
    a("Unknown and unentitled stitch instance ids return HTTP 404. The API does not return 403 for those cases, so existence of another tenant's instance is not revealed.")
    a("")
    a("### 16.2 Schema")
    a("")
    a("Ingest bodies that fail JSON Schema return HTTP 4xx and are not persisted.")
    a("")
    a("### 16.3 Commands")
    a("")
    a("Kit verbs absent from `userActions` are rejected. Sign-off and POST on a non-READY instance do not change status to CLEARED and do not create a FAS run.")
    a("")
    a("### 16.4 Completions")
    a("")
    a("A completion whose `runId` does not match the in-flight action run is ignored.")
    a("")

    a("## 17. Security and entitlement")
    a("")
    a("This section separates demo identity, View filters, and dual control.")
    a("")
    a("### 17.1 Demo identity")
    a("")
    a("The demo console uses the current product user Praveen Kumar. `/api/auth/whoami` and `/api/auth/dev-token` support local sessions.")
    a("")
    a("### 17.2 View versus CEES")
    a("")
    a("The top-bar View filters navigation. It does not grant access. CEES fail-closed 404 remains in force when an instance URL is opened.")
    a("")
    a("### 17.3 Dual control")
    a("")
    a("Dead-letter replay on Operations requires dual control and an audit row.")
    a("")

    a("## 18. Observability")
    a("")
    a("This section covers the monitoring tape, the notification inbox, and the live pill.")
    a("")
    a("### 18.1 Monitoring tape")
    a("")
    a("Monitoring shows received, persisted, propagated, and audited. Outbox status is filterable.")
    a("")
    a("### 18.2 Notifications")
    a("")
    a("Inbox and SSE carry the notify set in REQ-OPERATE-009. Raw facts and PROGRESS ticks are excluded.")
    a("")
    a("### 18.3 Live pill")
    a("")
    a("The console live pill is `live` while SSE is open and `offline` when the stream is down.")
    a("")

    a("## 19. User interface rules")
    a("")
    a("This section locks brand, theme, surfaces, and mobile behaviour.")
    a("")
    a("### 19.1 Brand")
    a("")
    a("Wordmark: One Finance. Mark: briefcase on the MITR tile. Collapsed rail: one mark in the top header; expand control in the rail brand slot.")
    a("")
    a("### 19.2 Theme")
    a("")
    a("Dark canvas `#090d1c`, light canvas `#f5f6fb`, accent `#818cf8` dark and `#6366f1` light. Opaque cards. No `backdrop-filter`. Lucide stroke icons. Inter, Sora, JetBrains Mono.")
    a("")
    a("### 19.3 Surfaces")
    a("")
    a("Home tells today's close. Board is the head table. My outcomes is the doer list. Reports is the engine index plus document. Drive is testing. Onboarding creates. Configuration governs.")
    a("")
    a("### 19.4 Mobile")
    a("")
    a("Below 820px: drawer rail, hamburger, bottom nav. Below 640px: Board and Home instance tables become one card per row. Report flow stacks on a phone. Predicted-ready clocks use 24-hour time.")
    a("")

    a("## 20. Quality attributes")
    a("")
    a("This section states reliability, operability, maintainability, and portability without performance slang.")
    a("")
    a("### 20.1 Reliability")
    a("")
    a("Persist-before-fold. Idempotent `eventId`. runId-gated completions. Fail-closed 404.")
    a("")
    a("### 20.2 Operability")
    a("")
    a("Monitoring, outbox retry, dead-letter replay with dual control, Drive reset, and SSE live state are the operator tools in phase 1.")
    a("")
    a("### 20.3 Maintainability")
    a("")
    a("New engine capability = definition data plus optional ActionExecutor bean. New stitch capability = kit data plus optional declared verb. Reviewers reject `if (FOBO)`.")
    a("")
    a("### 20.4 Portability")
    a("")
    a("Phase 1 runs with the three local processes. Docker compose serves the console on port 8080. No cloud vendor is required.")
    a("")

    a("## 21. Test strategy")
    a("")
    a("This section says how AC-IDs are executed in CI, in the browser, and in static review.")
    a("")
    a("### 21.1 Automated")
    a("")
    a("Hub: `mvn -B test` and CI `mvn -B verify`. Map engine and fold tests to ENGINE and FOLD AC-IDs. Console: `npm run build` must succeed after chrome or Reports changes.")
    a("")
    a("### 21.2 Manual Given/When/Then")
    a("")
    a("Start hub and simulator with `./scripts/run.sh`. Start `frontend/web` on 7091. Execute CONSOLE, REPORTS, GOVERN, and OPERATE AC-IDs in the browser. Record the AC-ID in the pull request.")
    a("")
    a("### 21.3 Static review")
    a("")
    a("AC-FOLD-09, AC-CONSOLE-17, AC-GOVERN-12, and AC-ACTION-04 are repository reviews. They do not need a live scenario.")
    a("")
    a("### 21.4 Gate")
    a("")
    a("A change is complete when every touched REQ-ID has its mapped AC-IDs executed and `scripts/check_specification.py` still exits 0 if this document changed.")
    a("")

    a("## 22. Implementer contract")
    a("")
    a("This section is the coding contract for agents and humans working from this specification.")
    a("")
    a("### 22.1 Allowed work")
    a("")
    a("Implementers add or change behaviour only when a REQ-ID in this document demands it, or when a new REQ-ID is added in the same change with mapped AC-IDs.")
    a("")
    a("### 22.2 Forbidden work")
    a("")
    a("Implementers do not add Drive buttons to Home or Reports, do not collapse the two models, do not add product-specific Java branches, do not put Kafka in the browser, do not use frosted glass, and do not put an LLM on the fold.")
    a("")
    a("### 22.3 Test naming")
    a("")
    a("Automated tests include the AC-ID in the test name or display name, for example `ac_fold_01_named_blocker`.")
    a("")
    a("### 22.4 Document updates")
    a("")
    a("A behaviour change updates the REQ statement, the AC Given/When/Then, and the traceability row in the same pull request. `scripts/check_specification.py` must exit 0.")
    a("")

    a("## 23. Change control")
    a("")
    a("This section states how REQ-IDs and AC-IDs change after version 1.0.0.")
    a("")
    a("### 23.1 Versioning")
    a("")
    a("This file uses semantic versions. A new REQ-ID or AC-ID increments MINOR. A wording-only clarification increments PATCH. A removed REQ-ID increments MAJOR and records the removal reason in the pull request.")
    a("")
    a("### 23.2 Ownership")
    a("")
    a("Praveen Kumar owns this specification. Reviewers use the skill that matches the subsystem: `outcome-engine`, `barclays-ib-console`, `drive-and-demo`, `engineering-view`, `rtb-support-view`.")
    a("")

    a("## 24. Review checklist")
    a("")
    a("This section is the quality gate for the specification file itself.")
    a("")
    a("### 24.1 Spec quality")
    a("")
    a("| Check | Result required |")
    a("| --- | --- |")
    a("| All numbered H2 sections present | Yes |")
    a("| No empty H2 or H3 | Yes |")
    a("| Every requirement has a REQ-ID | Yes |")
    a("| Each subsystem has 23 Given/When/Then AC-IDs | Yes |")
    a("| Every AC maps to a REQ-ID | Yes |")
    a("| Every subsystem REQ-ID has at least one AC | Yes |")
    a("| Banned words absent | Yes |")
    a("| Heading levels increase by one | Yes |")
    a("")
    a("### 24.2 Command")
    a("")
    a("Run `python3 scripts/check_specification.py` from the repository root. Exit code 0 is the quality gate for this file.")
    a("")

    return "\n".join(lines) + "\n"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render(), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
