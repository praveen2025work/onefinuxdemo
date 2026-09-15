# Design

This is the only design folder. Live visual truth is `frontend/web`. Console **Guide** rail: `/product` (story), `/architecture` (diagrams), `/guide` (developer on-ramp). Not static HTML.

| Document | Audience | What it is |
|---|---|---|
| [`as-built.md`](as-built.md) | Everyone | Current product: routes, two models, brand, what not to do |
| [`start.md`](start.md) | New developers | Plain-language idea, how to run it, first change, how we review PRs |
| [`architecture-group.md`](architecture-group.md) | Architecture group, CIO, MD | Problem, two models, what executives see |
| [`application.md`](application.md) | Build team | Modules, APIs, screens, capabilities, demo vs later |
| [`onboarding.md`](onboarding.md) | Operators | Create an outcome, inspect it, drive the day |
| [`helix-walkthrough.md`](helix-walkthrough.md) | Lead / joining engineer | Real-time Helix: engine (Reports) vs stitch rec (Board) |
| [`helix-silent-walkthrough.md`](helix-silent-walkthrough.md) | Anyone | Silent UI recording: group unit, onboard, Drive Helix, Reports |
| [`helix-silent-walkthrough.mp4`](helix-silent-walkthrough.mp4) | Anyone | Captioned walkthrough, no voice |
| [`architecture.md`](architecture.md) | Engineers / exec | Mermaid diagrams (source + SVG/PNG in [`diagrams/`](diagrams/)) |
| [`executive-brief.md`](executive-brief.md) | MD / CIO demo | Narrative, value, ask |
| [`demo-runsheet.md`](demo-runsheet.md) | Facilitator | Timed CIO/MD script |
| [`narration-script.txt`](narration-script.txt) | Voiceover | Spoken demo script |
| [`cio-md-demo.mp4`](cio-md-demo.mp4) | Stakeholders | Recorded narrated demo |

## Product in one paragraph

At close of business a group unit answers one question per outcome. One Finance UX is a thin outcome layer: it folds facts systems already emit into Ready / Blocked / Delayed, acts when ready, and governs every step. Products are data.

1. **Outcome Engine** — question + feeds + SLA + on-ready (`ActionExecutor` registry).
2. **Stitch console kit** — sources + destinations + embed + `userActions`.

## Skills

| Job | Skill |
|---|---|
| Chrome / theme / mobile | `barclays-ib-console` |
| Create an outcome or kit | `register-outcome-kit` |
| Outcome Engine fold | `outcome-engine` |
| Configuration / bindings | `engineering-view` |
| Drive / exec demo | `drive-and-demo` |
| CIO / MD board | `bu-head-view` |
| Sign-off / post / amend | `colleague-view` |
| RTB | `rtb-support-view` |
| Bind source / destination | `bind-source-destination` |
| Partner iframe | `embed-partner-screen` |
| Analyst grid (later) | `wijmo-outcome-grid` |
