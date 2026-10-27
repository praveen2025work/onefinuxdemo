# One Finance — agent notes

Umbrella for **group units** and their business outcomes. FOBO Helix is one `HELIX_RECON` kit, not the app. Products are data.

Visual truth: `frontend/web` (live React console). One design standard for every accounting-space screen, framed STEPS and partners included: the STEPS look (Banking Blue `#2563eb`, page `#f8fafc`, white cards) from [`frontend/theme/`](frontend/theme/onefinux-tokens.css), served at `/theme/*`. MITR indigo stays selectable.  
Screens: read-only data is Wijmo, described as a **GridSpec** (`/grids`; `SpecGrid`, `DataView`, `Chart`), and many screens share one page on a **desk** (`/desks`), one desk per business outcome or a blank one. Screens link with FDC3 (`window.fdc3`); outcome desk channels and `activity` reach every tab and browser through the hub (`/api/ws`, SSE fallback).  
Design folder (only one): [`docs/design/`](docs/design/README.md).  
Spec-driven contract (REQ-IDs + Given/When/Then): [`docs/design/specification.md`](docs/design/specification.md). Gate: `python3 scripts/check_specification.py`.  
New developer on-ramp: [`docs/design/start.md`](docs/design/start.md) and console **`/guide`**. Architecture diagrams: console **`/architecture`**. Product story: **`/product`**.

## Jobs → skills

| Job | Skill |
|---|---|
| Chrome / theme / design tokens / mobile shell | `.cursor/skills/barclays-ib-console` |
| Desks, screen-to-screen links (FDC3), outcome channels, activity, hub contexts / intents | `.cursor/skills/workspace-interop` |
| Create a live outcome or kit | `.cursor/skills/register-outcome-kit` |
| Outcome Engine fold + ActionExecutor | `.cursor/skills/outcome-engine` |
| Inspect / govern the live registry | `.cursor/skills/engineering-view` |
| Drive a COB scenario / exec demo | `.cursor/skills/drive-and-demo` |
| CIO / MD traffic-light board | `.cursor/skills/bu-head-view` |
| Controller worklist + sign-off / post / amend | `.cursor/skills/colleague-view` |
| RTB delays / escalations / dead letters | `.cursor/skills/rtb-support-view` |
| Bind a source or destination | `.cursor/skills/bind-source-destination` |
| Partner or STEPS iframe + shared theme | `.cursor/skills/embed-partner-screen` |
| Grids (GridSpec, grid library, embed / `<ofx-grid>`), pivots, charts; analyst explorer | `.cursor/skills/wijmo-outcome-grid` |

## Never

- `if (product == FOBO)`
- Rebuild a partner screen that can be iframed
- A React report per analyst ask (Wijmo def or partner iframe)
- Drive / scenario buttons on Home or Reports
- LLM on the readiness path
- Kafka in the browser
- Colours outside `frontend/theme` tokens, or a second stylesheet per screen / team
- An HTML data table or another chart library where `DataGrid` / `DataView` / `Chart` fits
- A private postMessage protocol between screens (FDC3 channels and intents)
- Polling or a side channel to tell other screens about an action (publish `activity` / share on the outcome channel)
- A hand-coded read-only grid component per screen or per team (a GridSpec, rendered by `SpecGrid` / `<ofx-grid>`)

## Views

The **Settings** panel (group unit, region, and view) persists `localStorage['ofx-view']`. Options: `all`, `developer`, `architect`, `controller`, `head`, `rtb`, `maker`. A view filters the rail. It is **not** CEES and it is not a Home screen. Instance detail stays reachable from a row.

## Code review

GitHub PR against `main`. CI: `mvn -B verify` + `frontend/web` `npm ci && npm test && npm run build`. No CODEOWNERS. Review against this Never list and the skill for the job that changed.
