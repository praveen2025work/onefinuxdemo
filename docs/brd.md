# One Finance UX — Business Requirements (index)

Owner: Praveen Kumar · Status: current as of 14 September 2026.

This is the entry point for anyone joining the product. Read the short architecture-group brief first, then the application BRD for the build surface.

| Document | Audience | What it is |
|---|---|---|
| [`docs/brd/architecture-group.md`](brd/architecture-group.md) | Architecture group, CIO, MD | The problem, the two models, what executives see, how we keep one design. |
| [`docs/brd/application.md`](brd/application.md) | Build team | Entities, APIs, screens, onboarding, Drive, capabilities, demo vs later. |
| [`docs/onboarding.md`](onboarding.md) | Operators | Step-by-step: create an outcome, inspect it, drive the day. |
| [`docs/exec/executive-brief.md`](exec/executive-brief.md) | MD / CIO demo | One-page narrative + value + architecture. |
| [`docs/exec/demo-runsheet.md`](exec/demo-runsheet.md) | Facilitator | Timed script for the 2–3 minute narrated demo and the longer CIO track. |
| [`docs/superpowers/specs/2026-09-14-product-as-built.md`](superpowers/specs/2026-09-14-product-as-built.md) | Design truth | As-built product design after the Drive / Configuration / capability-registry work. |

## Product in one paragraph

At close of business a group unit must answer one question per outcome — *Can I execute this rec? Can I produce the 15C3 report? Can I close the books?* One Finance UX is a thin **outcome layer** on the existing estate. It listens to facts systems already emit, folds them into Ready / Blocked / Delayed, acts when ready, and governs every step. Products are **data**, not modules.

Two models, both extensible by configuration:

1. **Outcome Engine** — business question + feeds + SLA + on-ready action. New action types plug in through an `ActionExecutor` registry.
2. **Stitch console kit** — sources + destinations + embed + human `userActions`. New console verbs are declared on the kit and handled by one generic action endpoint.

## Skills that own the surface

| Job | Skill |
|---|---|
| Chrome / theme / mobile shell | `barclays-ib-console` |
| Create a live outcome (question, feeds, SLA, action) | `register-outcome-kit` |
| Inspect / govern the live registry | `engineering-view` |
| Drive a COB scenario (testing) | `drive-and-demo` |
| Outcome Engine fold and on-ready capabilities | `outcome-engine` |
| CIO / MD traffic-light board | `bu-head-view` |
| Controller worklist + sign-off / post / amend | `colleague-view` |
| Run-the-bank delays, escalations, dead letters | `rtb-support-view` |
| Bind a source or destination | `bind-source-destination` |
| Partner iframe | `embed-partner-screen` |
| Analyst grid (later) | `wijmo-outcome-grid` |
