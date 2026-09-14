---
name: barclays-ib-console
description: Use when building One Finance chrome or when another team must copy the One Fin UX theme for an iframed screen. Also use when a mock looks glassy, editorial, cream, serif, or unlike the live frontend/web console.
---

# Barclays IB console

One Finance UX is a **solid finance dashboard**: opaque cards, a dark navy rail, and status colour on KPIs. Not frosted glass, not cyan glow, not a magazine, not a 2016 admin theme. Dark charcoal is the default canvas; light (`data-theme="light"`) is a first-class peer with the **same dark rail**.

## Reference implementation — read before writing CSS

| Path | What it is |
|---|---|
| `frontend/web` | Live React console — visual truth for routes, chrome, and theme |
| `frontend/web/src/styles.css` | Console design system |
| `frontend/theme/onefinux-tokens.css` | The `--ofx-*` subset partner teams copy |
| `docs/design/` | Requirements, as-built, architecture diagrams |

Build new screens by composing existing classes in `frontend/web/src/styles.css`. If a screen needs a primitive that is not there, add it there once — do not inline a one-off style.

## Tokens

| Token | Value | Use |
|---|---|---|
| canvas | charcoal `#0b1220` dark · `#eef1f6` light | Ambient page |
| surface | opaque `#152033` dark · white light | Panels, cards |
| rail | solid `#07111c` in both themes | Left nav |
| cerulean | `#00aeef` | Brand accent, primary actions, active nav |
| gold | `#eab308` | Env chip, finance ticker accent |
| ink | `#eef3f8` dark · `#102033` light | Body text |
| ok | `#22c55e` | READY, COMPLETED, CLEARED |
| warn | `#f59e0b` | WAITING, at risk, HOLD |
| fail | `#ef4444` | BLOCKED, FAILED |
| back office | `#a78bfa` | Maker-checker |

Font: IBM Plex Sans, IBM Plex Mono for ids, offsets, times, money. Numerics are `tabular-nums`.

Never use `backdrop-filter`, translucent `--glass` fills, or radial cyan washes on the page.

## Layout rules

- `.app` is a `100dvh` grid: rail + main. Only `.body` scrolls. Below 820px the rail becomes an overlay drawer, a hamburger opens it, and a labelled bottom nav is the primary way to move. Do not leave a 66px icon strip eating the phone width.
- Every screen keeps the **context ribbon** (`.ctxbar`) so the stitch keys stay visible: group unit, kit, instance, origins, run. On a phone the ribbon wraps; filters stay in the top bar.
- Content sits in `.panel` blocks with a `.panel-hd` that names the table or view behind it.
- KPI tiles use `.stat` plus `.ok` / `.fail` / `.warn` / `.info` — left colour bar, tinted fill.
- Detail screens use `.split` — content plus a 340px right rail for facts, event trail and rules.
- Status is a `.pill` with the platform vocabulary: `NOT_YET`, `BLOCKED`, `READY`, `CLEARED`, `DELAYED`.
- A disabled action is a **fact**, not a style: it is off because the fold says so. Say why next to it.

## Other teams

Serve `frontend/theme/onefinux-tokens.css` as `/theme/onefinux-tokens.css`. Partners import it, use `--ofx-*` only, set `data-ofx-embedded="1"`, and **omit** their own masthead. Host chrome sets `html[data-theme=dark|light]` and passes `theme=` on the iframe query. **REQUIRED:** `embed-partner-screen` for the host contract.

Theme is persisted in `localStorage['ofx-theme']`. A review link can force it: `index.html?theme=light`. Default is dark.

## Common mistakes

- Restoring frosted glass / blur — the team rejected that look
- Centring content in a narrow column — this is a console, use the width
- Archived HTML or a second stylesheet as visual truth — **`frontend/web` is truth**
- Hard-coding "FOBO Control Tower" as the platform title — the title is the current product
- Recharts as the break viewer — Wijmo (`wijmo-outcome-grid`)
- A new stylesheet per screen instead of extending `styles.css`
