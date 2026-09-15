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
| `/guide` | Developer on-ramp: run it, add data, review a PR | Live outcomes or Drive |
| `/onboarding` | A live `OutcomeDefinition` (question, feeds, SLA, on-ready) | Inspect every existing outcome in detail |
| `/configuration` | Master-detail registry: pick an outcome or kit, see anatomy + live state | Create (link to Onboarding) |
| `/drive` | Run / reset COB scenarios | Live on Home or Reports |
| `/reports` | Engine outcomes + 15C3 five-stage flow + predicted ready (from arrived facts + prior-COB P50) + viewable artifact | Scenario buttons |
| `/board` | Unit traffic lights for CIO / MD / BU head | Sign-off / post |
| `/outcomes` | Doer's card worklist | Head roll-ups or RTB queues |
| `/instance/:id` | Fold + embed + kit-declared actions | Invent verbs not on the kit |
| `/operations` | Escalations, watermarks, dead letters, dual-control replay | Sign off a rec or publish a kit |
| `/monitoring` | Ingest / outbox / audit | Business sign-off |

## Capability registries

- Outcome: `ActionExecutor` beans keyed by `onReady.action`. Built-in: `HTTP_COMMAND`, `LOG_COMMAND`. New type = new bean + config.
- Stitch: `POST /api/stitch/instance/action` gated by kit `userActions`. New verb = add it to the kit.

## Brand

Wordmark is **One Finance**. Brand mark is one coin (singular scope) with a currency mark — not a stitch stack and not a bar chart. When the left rail is collapsed, the wordmark moves to the top header beside Group unit. MITR indigo-lavender accent (`#818cf8` dark / `#6366f1` light). Canvas `#090d1c` dark / `#f5f6fb` light, opaque cards, dark indigo rail. Status colour on KPI tiles (ready / blocked / delayed). Light theme keeps the same dark rail. Inter + Sora + JetBrains Mono, Lucide icons. No frosted glass.

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
