# One Finance UX — agent notes

Umbrella for **group units** and their business outcomes. FOBO Helix is one `HELIX_RECON` kit, not the app. Products are data.

Visual truth: `frontend/web` (live React console; solid finance dashboard, Cerulean `#00aeef` accent, charcoal canvas).  
Design folder (only one): [`docs/design/`](docs/design/README.md).  
New developer on-ramp: [`docs/design/start.md`](docs/design/start.md) and console `/product?tab=start`.

## Jobs → skills

| Job | Skill |
|---|---|
| Chrome / theme / mobile shell | `.cursor/skills/barclays-ib-console` |
| Create a live outcome or kit | `.cursor/skills/register-outcome-kit` |
| Outcome Engine fold + ActionExecutor | `.cursor/skills/outcome-engine` |
| Inspect / govern the live registry | `.cursor/skills/engineering-view` |
| Drive a COB scenario / exec demo | `.cursor/skills/drive-and-demo` |
| CIO / MD traffic-light board | `.cursor/skills/bu-head-view` |
| Controller worklist + sign-off / post / amend | `.cursor/skills/colleague-view` |
| RTB delays / escalations / dead letters | `.cursor/skills/rtb-support-view` |
| Bind a source or destination | `.cursor/skills/bind-source-destination` |
| Partner iframe + shared theme | `.cursor/skills/embed-partner-screen` |
| Analyst explorer (later, same unit) | `.cursor/skills/wijmo-outcome-grid` |

## Never

- `if (product == FOBO)`
- Rebuild a partner screen that can be iframed
- A React report per analyst ask (Wijmo def or partner iframe)
- Drive / scenario buttons on Home or Reports
- LLM on the readiness path
- Kafka in the browser

## Views

Home and the top-bar **View** select persist `localStorage['ofx-view']`. Options: `all`, `developer`, `architect`, `controller`, `head`, `rtb`, `maker`. A view filters the rail and Home start cards. It is **not** CEES. Instance detail stays reachable from a row.

## Code review

GitHub PR against `main`. CI: `mvn -B verify` + `frontend/web` `npm ci && npm run build`. No CODEOWNERS. Review against this Never list and the skill for the job that changed.
