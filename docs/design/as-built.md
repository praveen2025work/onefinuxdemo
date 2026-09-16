# Product as built — 14 September 2026

Status: current design truth for One Finance after Drive, Configuration master-detail, Barclays theme, 15C3 report flow, and pluggable capability registries.

## Intent

A group unit answers one business question per outcome. The platform is a thin outcome layer. Products are data. Two models stay separate; each launches new capabilities by configuration.

## Surfaces

| Route | Creates / shows | Does not |
|---|---|---|
| `/` Home | Today’s close story + fold. View is the top-bar select | Scenario buttons, role picker, duplicate Guide buttons |
| `/product` | Product story a BU head recognises | Live outcomes or Drive |
| `/architecture` | Same diagrams as `docs/design` | Live outcomes or Drive |
| `/lifecycle` | Received request, event_store persist, next stitch/engine state | Invent a second fold |
| `/onboarding` | A live `OutcomeDefinition` (question, feeds, SLA, on-ready) | Inspect every existing outcome in detail |
| `/configuration` | Master-detail registry: pick an outcome or kit, see anatomy + live state | Create (link to Onboarding) |
| `/drive` | Run / reset COB scenarios | Live on Home or Reports |
| `/reports` | Engine outcomes + 15C3 five-stage flow + predicted ready; Normal / Compact / Table layouts | Scenario buttons |
| `/reports/:outcomeId/:cobDate/:region` | The produced report document (open from any Reports layout) | Drive / generate |
| `/board` | Unit traffic lights for CIO / MD / BU head | Sign-off / post |
| `/outcomes` | Doer's card worklist | Head roll-ups or RTB queues |
| `/instance/:id` | Fold (click a feed for history) + accounting item + in-shell partner iframe + kit-declared actions | Invent verbs not on the kit; open Helix in a new tab |
| `/operations` | Escalations, watermarks, dead letters, dual-control replay | Sign off a rec or publish a kit |
| `/monitoring` | Ingest / outbox / audit | Business sign-off |

## Capability registries

- Outcome: `ActionExecutor` beans keyed by `onReady.action`. Built-in: `HTTP_COMMAND`, `LOG_COMMAND`. New type = new bean + config.
- Stitch: `POST /api/stitch/instance/action` gated by kit `userActions`. Rich verbs: `SIGN_OFF`, `POST`, `ESCALATE`, `ADJUST`, `COUNTERSIGN`. Other verbs are generic. New verb = add it to the kit. `GET /api/stitch/instance/step-view` returns GRID or IFRAME for a feed or destination.

## Brand

Wordmark is **One Finance**. Brand mark is a generic briefcase on the MITR tile. When the left rail is collapsed, that mark appears once — in the top header beside Group unit — and the rail keeps only the expand control in the brand slot. MITR indigo-lavender accent (`#818cf8` dark / `#6366f1` light). Canvas `#090d1c` dark / `#f5f6fb` light, opaque cards. Left rail follows the theme (navy `#090d1c` dark / white `#ffffff` light). Status colour on KPI tiles (ready / blocked / delayed). Inter + Sora + JetBrains Mono, Lucide icons. No frosted glass.

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
- Ship a day-one Analyst explorer (that is later, Wijmo).
