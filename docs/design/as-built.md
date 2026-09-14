# Product as built — 14 September 2026

Status: current design truth for One Finance UX after Drive, Configuration master-detail, Barclays theme, 15C3 report flow, and pluggable capability registries.

## Intent

A group unit answers one business question per outcome. The platform is a thin outcome layer. Products are data. Two models stay separate; each launches new capabilities by configuration.

## Surfaces

| Route | Creates / shows | Does not |
|---|---|---|
| `/onboarding` | A live `OutcomeDefinition` (question, feeds, SLA, on-ready) | Inspect every existing outcome in detail |
| `/configuration` | Master-detail registry: pick an outcome or kit, see anatomy + live state | Create (link to Onboarding) |
| `/drive` | Run / reset COB scenarios | Live on Home or Reports |
| `/reports` | Engine outcomes + 15C3 five-stage flow + viewable artifact | Scenario buttons |
| `/board` | Unit traffic lights for CIO / MD / BU head | Sign-off / post |
| `/outcomes` | Doer's card worklist | Head roll-ups or RTB queues |
| `/instance/:id` | Fold + embed + kit-declared actions | Invent verbs not on the kit |
| `/operations` | Escalations, watermarks, dead letters, dual-control replay | Sign off a rec or publish a kit |
| `/monitoring` | Ingest / outbox / audit | Business sign-off |

## Capability registries

- Outcome: `ActionExecutor` beans keyed by `onReady.action`. Built-in: `HTTP_COMMAND`, `LOG_COMMAND`. New type = new bean + config.
- Stitch: `POST /api/stitch/instance/action` gated by kit `userActions`. New verb = add it to the kit.

## Brand

Cerulean `#00aeef` accent. Charcoal canvas `#0b1220`, opaque cards, dark navy rail. Status colour on KPI tiles (ready / blocked / delayed). Light theme keeps the same dark rail on an off-white page. No frosted glass.

## Mobile

Below 820px the rail collapses to icons; grids stack; tables scroll horizontally. Management and worklist screens are first-class on a phone. A native app can wrap this shell; do not build a second product.

## What not to do

- Put Drive buttons back on Home or Reports.
- Collapse the two models into one without a presentation binding design.
- Add `if (FOBO)` or a per-product module.
- Treat Configuration as a create form (that is Onboarding).
- Jump screens in an exec demo — hold each surface long enough to read.
- Ship a day-one Analyst explorer (that is later, Wijmo).
