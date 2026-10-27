---
name: barclays-ib-console
description: Use when building One Finance chrome or a screen, or when another team (STEPS, a partner) must paint from the One Finance design standard in a framed screen. Also use when a mock looks glassy, editorial, cream, serif, or unlike the live frontend/web console.
---

# Barclays IB console

One Finance hosts every accounting-space UI, so there is **one design standard** for all of them: the STEPS (stepsv3) look. It is a clean, solid finance dashboard: white cards on a slate page, Banking Blue accent, 1px slate borders, small radii, system UI type, and status colour on KPIs. It is not frosted glass, not a magazine, and not a 2016 admin theme. STEPS Banking Blue (light) is the default; STEPS dark is its peer. The earlier MITR indigo look ("One Finance dark / light") can still be picked from the theme menu.

## Reference implementation — read before writing CSS

| Path | What it is |
|---|---|
| `frontend/theme/onefinux-tokens.css` | **The palette.** Every `--ofx-*` token for each skin and mode, the shadcn bridge for framed Tailwind apps, and the partner classes (`.ofx-card`, `.ofx-btn`, `.ofx-pill-*`, `.ofx-tbl`) |
| `frontend/theme/onefinux-wijmo.css` | The shared Wijmo skin: grid, filter, pivot and chart look the same in every screen |
| `frontend/web/src/styles.css` | Console components. Its `:root` only aliases the tokens (`--surface: var(--ofx-card)` …); it never defines colours |
| `frontend/web/theme-files.js` | Serves both theme files at `/theme/*` (dev and build) so framed apps link the same files |
| `frontend/web` | Live React console: the visual truth for routes and chrome |

Build new screens by composing existing classes in `styles.css`. If a screen needs a primitive that is not there, add it there once, using tokens. Never inline a one-off style or hard-code a colour.

## Themes

`html[data-skin]` picks the palette and `html[data-theme]` picks the mode. `src/lib/themes.js` lists them; `src/theme.js` sets both attributes.

| Theme id | Skin / mode | Use |
|---|---|---|
| `steps` (default) | `steps` / light | STEPS Banking Blue |
| `steps-dark` | `steps` / dark | STEPS dark |
| `dark`, `light` | `ofx` / dark, light | Earlier MITR indigo look |

## Tokens (STEPS skin)

| Token | Light · dark | Use |
|---|---|---|
| `--ofx-page` | `#f8fafc` · `#0b111e` | Page |
| `--ofx-card` | `#ffffff` · `#10192d` | Panels, cards, rail |
| `--ofx-surface-2` | `#f1f5f9` · `#1d2839` | Grid headers, hover, wells |
| `--ofx-line` | `#e2e8f0` · `#2b3b55` | 1px borders |
| `--ofx-ink` / `--ofx-ink-2` | `#020817` / `#64748b` · `#f8fafc` / `#94a3b8` | Text / secondary text |
| `--ofx-accent` | `#2563eb` · `#3b83f6` | Primary actions, active nav, selection |
| `--ofx-ok` | `#059669` · `#34d399` | READY, COMPLETED, CLEARED |
| `--ofx-warn` | `#d97706` · `#fbbf24` | WAITING, at risk, HOLD |
| `--ofx-fail` | `#dc2626` · `#f87171` | BLOCKED, FAILED |
| `--ofx-chart-1..6` | accent-led | Chart series (read by `components/Chart.jsx`) |

Each status has `-bg` and `-line` tints. Radii are `--ofx-r-ctl` 8px, cards 10px and `--ofx-r-lg` 12px. Type is the system UI stack (`--ofx-font`), with `--ofx-mono` (JetBrains Mono) for ids, offsets, times and money. Numerics are `tabular-nums`. Icons are Lucide-style strokes from `components/Icon.jsx`.

Never use `backdrop-filter`, translucent fills, or radial washes on the page.

## Layout rules

- **Floating rail.** The left nav is an overlay, closed by default, so content uses the full width. A small edge tab (`.rail-tab`) on the left opens it; the scrim, Escape or a navigation closes it. Do not bring back a docked icon strip.
- **Compact chrome.** The top header is one 48px row: the product name with UAT and the live dot under it, the **page label** (icon + title, lifted from `PageHeader` via `chrome/PageChrome.jsx`), the business date, and the ready / blocked / escalation counts; then search, and quiet icon buttons (transparent until hover) for install, desktop alerts, theme, notifications, refresh, settings and profile. Group unit, region and view live together in the settings panel. There is no separate ribbon row. Do not add captions, text chips or a second row. Vertical scrollbars are hidden; the page and grids still scroll.
- **Page tools, not page titles.** Every screen uses `PageHeader` (`components/bits.jsx`) to publish its label into the top bar. On the page it draws the info icon (context + explanation), an optional one-line live summary, and the screen's tools — never a second big title. Put a screen's toolbar in it rather than in a panel underneath. Descriptive paragraphs go behind the info icon, never as a paragraph on the page. On a desk view the lift is skipped (the view title bar names it) unless `keepTitle` (titles that change, like an instance id).
- **Full-bleed content.** `.wrap` has no max-width; pages use the full main column (only the floating rail overlays). Do not bring back a centred content column.
- Content sits in `.panel` blocks with a `.panel-hd` that names the table or view behind it.
- KPI tiles use `.stat` plus `.ok` / `.fail` / `.warn` / `.info`.
- Detail screens use `.split`: content plus a 340px right rail for facts, event trail and rules.
- Status is a `.pill` with the platform vocabulary: `NOT_YET`, `BLOCKED`, `READY`, `CLEARED`, `DELAYED`.
- Read-only data is a GridSpec rendered by `SpecGrid` (a `DataView`: grid, pivot, chart), and charts use `Chart`. **REQUIRED:** `wijmo-outcome-grid`.
- A disabled action is a **fact**, not a style: it is off because the fold says so. Say why next to it.

## Framed screens (STEPS, partners)

Framed screens link `/theme/onefinux-tokens.css` (and `/theme/onefinux-wijmo.css` if they use Wijmo) from the host. They set `html[data-ofx-embedded="1"]` and the host's `data-theme` / `data-skin` (sent as `theme=` / `skin=` on the iframe URL, then as `ofx.theme` messages), and they **omit** their own masthead. Tailwind/shadcn apps such as STEPS get their `--background`, `--primary`… from the bridge in the tokens file, so they repaint with the host. **REQUIRED:** `embed-partner-screen` for the host contract and `workspace-interop` for screen-to-screen links.

The theme is persisted in `localStorage['ofx-theme']`. A review link can force it: `?theme=steps-dark`.

## Common mistakes

- Defining colours in `styles.css` or a component instead of `--ofx-*` tokens
- A second stylesheet per screen or per team: one standard, `frontend/theme`
- Restoring frosted glass / blur
- Centring content in a narrow column: this is a console, use the width
- A docked rail that eats the content width
- Eyebrows, subtitles or description paragraphs above the content: use `PageHeader`'s info hint
- Hard-coding "FOBO Control Tower" as the platform title: the title is the current product
- A hand-built table or another chart library where `DataGrid` / `DataView` / `Chart` fits
