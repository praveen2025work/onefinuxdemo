# One Finance UX — agent notes

Umbrella for **group units** and their business outcomes. FOBO Helix is one `HELIX_RECON` kit, not the app. Products are data.

Visual truth: `frontend/web` (live React console; Barclays Cerulean `#00aeef`, Astronaut Blue `#00395d`). Static reference: `docs/design/mockups/`. Design truth: `docs/superpowers/specs/2026-09-14-product-as-built.md`.

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

Requirements: [`docs/brd.md`](docs/brd.md) → architecture-group + application BRDs.  
Onboarding: `docs/onboarding.md`  
Stitch schema: `docs/schema/onefinux-stitch.sql` + `docs/superpowers/specs/2026-09-12-stitching-schema.md`

## Never

- `if (product == FOBO)`
- Rebuild a partner screen that can be iframed
- A React report per analyst ask (Wijmo def or partner iframe)
- Drive / scenario buttons on Home or Reports
- LLM on the readiness path
- Kafka in the browser
