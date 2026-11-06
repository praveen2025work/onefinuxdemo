# Product as built — 6 November 2026

Status: current design truth for One Finance after Drive, Configuration master-detail, the STEPS Banking Blue standard with Barclays Effra type, 15C3 report flow, pluggable capability registries, and the One UX platform (search, assistant, desks, write-back, access, sign-in).

## Intent

A group unit answers one business question per outcome. The platform is a thin outcome layer. Products are data. Two models stay separate; each launches new capabilities by configuration.

## Surfaces

| Route | Creates / shows | Does not |
|---|---|---|
| `/` Home | Today’s close story + fold. View is the top-bar select | Scenario buttons, role picker, duplicate Guide buttons |
| `/product` | Product story a BU head recognises | Live outcomes or Drive |
| `/architecture` | Same diagrams as `docs/design` | Live outcomes or Drive |
| `/lifecycle` | Received request, event_store persist, next stitch/engine state | Invent a second fold |
| `/onboarding` | A live `OutcomeDefinition` (question, feeds, SLA, on-ready, grids) | Inspect every existing outcome in detail |
| `/configuration` | Master-detail registry; Edit saves PUT including grids | Create (link to Onboarding) |
| `/drive` | Run / reset COB scenarios | Live on Home or Reports |
| `/reports` | Engine outcomes + 15C3 five-stage flow + predicted ready; Normal / Compact / Table layouts | Scenario buttons |
| `/reports/:outcomeId/:cobDate/:region` | Produced report document; Grid view opens lineage Wijmo grids | Drive / generate |
| `/board` | Unit traffic lights for CIO / MD / BU head | Sign-off / post |
| `/outcomes` | Doer's card worklist | Head roll-ups or RTB queues |
| `/instance/:id` | Fold + destinations first; dest click opens full-width stage; Close restores the split; Partner view and Grid view on demand; accounting item + kit-declared actions | Invent verbs not on the kit; open Helix in a new tab; mount embed or grids on page open |
| `/operations` | Escalations, watermarks, dead letters, dual-control replay | Sign off a rec or publish a kit |
| `/monitoring` | Ingest / outbox / audit | Business sign-off |
| `/desks` | Many screens on one page, one desk per business outcome or blank; FDC3 links and outcome channels | A private postMessage protocol between screens |
| `/grids` | Grid library: GridSpecs (Platform · Unit · Mine), live preview, propose from a source, write-back with maker-checker | A hand-coded grid per screen |
| `/finance` | STEPS-style finance dashboards: live readiness tiles next to seeded finance datasets | Another chart library |
| `/notifications` | Notification inbox, live over the hub link | Notify on progress ticks |
| `/access` | What you hold, role-structure verbs, access requests, approvals, periodic reviews | A role check in code |
| `/usage` | Screens and views opened, features used, feedback, A-B experiment results | Track outside the hub |
| `/guide` | Developer on-ramp | Live outcomes or Drive |

## Capability registries

- Outcome: `ActionExecutor` beans keyed by `onReady.action`. Built-in: `HTTP_COMMAND`, `LOG_COMMAND`. New type = new bean + config.
- Stitch: `POST /api/stitch/instance/action` gated by kit `userActions`. Rich verbs: `SIGN_OFF`, `POST`, `ESCALATE`, `ADJUST`, `COUNTERSIGN`. Other verbs are generic. New verb = add it to the kit. `GET /api/stitch/instance/step-view` returns GRID of event-store rows or IFRAME for a feed or destination. Outcome `grids` open after Grid view on the instance and the report document. The console fetches the configured endpoint.

## Brand

Wordmark is **One Finance**. Brand mark is the One Finance app icon (a light and a dark variant that follow the mode), shown once in the top header; the rail is a floating overlay opened from an edge tab. Default theme is **STEPS Banking Blue**: accent `#2563eb`, page `#f8fafc`, white cards with 1px slate borders; **STEPS dark** is its peer (accent `#3b83f6`, page `#0b111e`). The earlier MITR indigo-lavender themes stay selectable from the theme menu. Status colour on KPI tiles (ready / blocked / delayed). Barclays Effra (Source Sans 3 where Effra is not installed) + JetBrains Mono at light weights, Lucide icons. No frosted glass.

## Mobile

Below 820px the left rail is an overlay drawer (hamburger). A labelled bottom nav (five primary destinations; the rest stay in the drawer) is the way to move. Grids stack. The top-bar filters and the context ribbon each sit on one swipeable row. Below 640px the Board and Home instance tables become one card per row so status stays on screen; other tables swipe sideways. On a phone the report flow stacks vertically so stage names stay readable. Predicted-ready clocks use 24-hour time. A native app can wrap this shell; do not build a second product.

## What not to do

- Put Drive buttons back on Home or Reports.
- Collapse the two models into one without a presentation binding design.
- Add `if (FOBO)` or a per-product module.
- Treat Configuration as a create form (that is Onboarding).
- Treat a View as entitlement (that is CEES; a view only hides nav).
- Put the ETA on the readiness fold. Predictions are advisory.
- Jump screens in an exec demo — hold each surface long enough to read.
- Build a React report per analyst ask: analysts compose GridSpecs in the grid library (`/grids`), or the partner screen is framed.
