---
name: barclays-ib-console
description: Use when building One Finance chrome or when another team must copy the One Fin UX theme for an iframed screen. Also use when a mock looks editorial, cream, serif, or unlike FoboControlTower_V2.
---

# Barclays IB console

One Finance UX is a **full-viewport application shell**, not a document. Navy rail, cyan accent, cool grey canvas, dense data. Never a magazine.

## Reference implementation — read before writing CSS

| Path | What it is |
|---|---|
| `docs/design/mockups/app.css` | The design system: app shell, tables, pills, meters, forms, pipeline, embed frame |
| `docs/design/mockups/components.html` | Every component rendered on one page |
| `docs/design/mockups/*.html` | The four jobs + stitch, built only from that CSS |
| `experience/theme/onefinux-tokens.css` | The `--ofx-*` subset partner teams copy |

Build new screens by composing existing classes. If a screen needs a primitive that is not there, add it to `app.css` once — do not inline a one-off style.

## Tokens

| Token | Value | Use |
|---|---|---|
| navy | `#002D5F` | Rail, primary action, table lead |
| navy deep | `#001B3A` / `#00132B` | Context ribbon, code blocks |
| cyan | `#00AEEF` | Accent, active tab, focus, live |
| page | `#E9EEF5` | Canvas behind panels |
| card | `#FFFFFF` | Panels |
| ink | `#0B1A2E` · muted `#5B7288` | Text |
| ok | `#0E7C4A` | READY, COMPLETED, CLEARED |
| warn | `#9A5B06` | WAITING, at risk, HOLD |
| fail | `#B3221F` | BLOCKED, FAILED |
| back office | `#4E3C9A` | Maker-checker, automation |

Font: IBM Plex Sans, IBM Plex Mono for ids, offsets, times, money. Self-hosted in `docs/design/dreamliner/fonts/` — do not add a Google Fonts link. Numerics are `tabular-nums`.

## Layout rules

- `.app` is a `100dvh` grid: rail + main. Only `.body` scrolls.
- Every screen keeps the **context ribbon** (`.ctxbar`) so the stitch keys stay visible: group unit, kit, instance, origins, run.
- Content sits in `.panel` blocks with a `.panel-hd` that names the table or view behind it.
- Detail screens use `.split` — content plus a 340px right rail for facts, event trail and rules.
- Status is a `.pill` with the platform vocabulary: `NOT_YET`, `BLOCKED`, `READY`, `CLEARED`, `DELAYED`.
- A disabled action is a **fact**, not a style: it is off because the fold says so. Say why next to it.

## Other teams

Serve `experience/theme/onefinux-tokens.css` as `/theme/onefinux-tokens.css`. Partners import it, use `--ofx-*` only, set `data-ofx-embedded="1"`, and **omit** their own masthead. **REQUIRED:** `embed-partner-screen` for the host contract.

## Common mistakes

- Centring content in a narrow column — this is a console, use the width
- Dreamliner cream/serif screens as visual truth — **V2 + `docs/design/mockups/` are truth**
- Hard-coding "FOBO Control Tower" as the platform title — the title is the current product
- Recharts as the break viewer — Wijmo (`wijmo-outcome-grid`)
- A new stylesheet per screen instead of extending `app.css`
