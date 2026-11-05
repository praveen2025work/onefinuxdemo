---
name: barclays-ib-console
description: Use when building One Finance chrome or a screen, or when another team (STEPS, MITR AI, a partner) must paint from the One Finance design standard. Also use when a mock looks glassy, editorial, cream, serif, off-brand, or unlike the live frontend/web console, or when text sizes drift off the STEPS type scale.
---

# Barclays IB console

One Finance hosts every accounting-space UI, so there is **one design standard** for all of them: **Barclays brand colours on the STEPS v3 structure**. It is a clean, solid finance dashboard: white cards on a light grey page, Royal Blue for everything interactive, 1px hairline borders, 10–12px radii, the STEPS type scale, system UI type (Barclays Effra where installed), and status colour on KPIs. It is not frosted glass, not a magazine, and not a 2016 admin theme. Barclays (light) is the default and Barclays dark (Midnight) its peer; STEPS Banking Blue and the earlier MITR indigo look stay in the theme menu.

The team-facing contract is [`docs/design/design-standard.md`](../../../docs/design/design-standard.md); the live catalogue is the console's **`/standards`** page.

## Reference implementation — read before writing CSS

| Path | What it is |
|---|---|
| `frontend/theme/onefinux-tokens.css` | **The standard.** Every `--ofx-*` token per skin and mode, the type scale (`--ofx-text-*`), shell and control metrics, the shadcn bridge (framed or `data-ofx-vars="shadcn"`), the MITR bridge, the Barclays Tailwind ramps, and the page kit (`.ofx-page`, `.ofx-card`, `.ofx-btn`, `.ofx-kpi`, `.ofx-grid-12` …) |
| `frontend/theme/onefinux-wijmo.css` | The shared Wijmo skin: grid, filter, pivot and chart look the same in every screen |
| `frontend/theme/onefinux-tailwind-preset.cjs` | Tailwind 3 preset (STEPS): `blue` / `slate` / `gray` follow the brand, `bg-ofx-*` colours |
| `frontend/web/src/styles.css` | Console components. Its `:root` only aliases the tokens (`--surface: var(--ofx-card)` …); it never defines colours or px font sizes |
| `frontend/web/src/lib/tokens.js` + `tokens.test.js` | The standard read as data; the AA-contrast, completeness and no-px-font gates |
| `frontend/web/src/pages/Standards.jsx` + `src/lib/standards.js` | The `/standards` page: palette, type, controls, the five page templates as copyable HTML, layout, grid, embedding, checklist |
| `frontend/web/parity/` | The cross-app parity audit (`npm run parity`) |
| `frontend/web/theme-files.js` | Serves the theme files at `/theme/*` (dev and build) so framed apps link the same files |

Build new screens by composing existing classes in `styles.css`. If a screen needs a primitive that is not there, add it there once, using tokens. Never inline a one-off style or hard-code a colour or a px font size.

## Themes

`html[data-skin]` picks the palette and `html[data-theme]` the mode. `src/lib/themes.js` lists them; `src/theme.js` sets both attributes. The STEPS structure rules in `styles.css` apply to both STEPS-structured skins: `:is([data-skin="steps"], [data-skin="barclays"])`.

| Theme id | Skin / mode | Use |
|---|---|---|
| `barclays` (default) | `barclays` / light | Barclays: Royal Blue on the Barclays neutrals |
| `barclays-dark` | `barclays` / dark | Midnight |
| `steps`, `steps-dark` | `steps` / light, dark | STEPS Banking Blue |
| `dark`, `light` | `ofx` / dark, light | Earlier MITR indigo look |

## Tokens (Barclays skin)

| Token | Light · dark | Use |
|---|---|---|
| `--ofx-page` | `#f6f6f6` · `#161b2f` | Page |
| `--ofx-card` | `#ffffff` · `#1a2142` | Panels, cards, rail, header |
| `--ofx-surface-2` | `#f0f0f0` · `#232b52` | Grid headers, hover, wells |
| `--ofx-line` | `#e2e2e2` · `#2e3866` | 1px borders |
| `--ofx-ink` / `--ofx-ink-2` / `--ofx-ink-3` | `#272727` / `#515151` / `#6b6b6b` · `#f5f6fa` / `#cbccd1` / `#9a9fb5` | Text / secondary / captions |
| `--ofx-accent` | `#006de3` · `#3696fc` | Primary actions, links, active nav, selection |
| `--ofx-ok` / `--ofx-warn` / `--ofx-fail` | `#077a1d` / `#9a5b00` / `#c8000d` · `#34c759` / `#ffba00` / `#ff6b6b` | READY · WAITING · BLOCKED (text-safe) |
| `--ofx-gold` | `#ffba00` | Warning fills and highlights, never text |
| `--ofx-navy` / `--ofx-sky` | `#1a2142` Midnight / `#00aeef` Sky | Dark bands / the brand mark only |
| `--ofx-chart-1..6` | brand-led | Chart series (read by `components/Chart.jsx`) |

Each status has `-bg` and `-line` tints. Every text token meets WCAG AA on cards, the page and its own tint in every skin (`tokens.test.js`).

## Type scale (STEPS v3)

Every text size is one of `--ofx-text-micro` 10 · `-2xs` 11 · `-xs` 12 · `-sm` 14 · `-base` 16 · `-lg` 18 · `-xl` 20 · `-2xl` 24 · `-3xl` 30px. Body text is 14px; meta 12px; card titles 16/600; the header's page title 18/700; page titles and KPI values 24px. Grid cells keep 13px (`--ofx-grid-fs`) inside a data grid only. Never 12.5px, 13px, 13.5px or 15px.

## Controls

| Control | Rule |
|---|---|
| Button | compact `--ofx-ctl-h` 32px, 12px/500 (toolbars, filters, card and grid tools — STEPS `sm`); default `--ofx-ctl-h-lg` 36px, 14px/500 (forms, dialogs, page actions); 10px corners, `--ofx-ctl-sh` |
| Input, select, drop-down trigger | 32px in a toolbar, `--ofx-field-h` 36px in a form; `--ofx-ctl-bg`, 1px `--ofx-ctl-line`, 14px text, focus `--ofx-focus` |
| Label · tab · chip | 14px/500 · 14px/500 · 12px/400 pill |
| Wijmo grid | 33px rows and header, 13px cells, 12px semibold uppercase header on a half band over a 2px rule (`onefinux-wijmo.css`) |

Partner screens use the kit: `.ofx-btn` (+ `-2`, `-ghost`, `-danger`, `-lg`, `-xs`), `.ofx-input`, `.ofx-select`, `.ofx-label`, `.ofx-pill-*`, `.ofx-badge`, `.ofx-tabs`/`.ofx-tab`, and the page templates. STEPS and MITR AI copy the theme files with `npm run sync:ofx-theme`; edit them here, never in a copy.

Never use `backdrop-filter`, translucent fills, or radial washes on the page.

## Layout rules

- **Floating rail.** The left nav is an overlay, closed by default, so content uses the full width. A small edge tab (`.rail-tab`) on the left opens it; the scrim, Escape or a navigation closes it. Nav items are 36px, 14px/500; the active one is filled with `--ofx-nav-on`. Do not bring back a docked icon strip.
- **One header row.** The top header is one 64px row (`--ofx-header-h`, the STEPS DashboardLayout header): the product name with UAT and the live dot under it, the **page label** (icon + 18px/700 title, lifted from `PageHeader` via `chrome/PageChrome.jsx`), the ready / blocked / escalation counts, then search; on the right the business date and quiet icon buttons (transparent until hover) for install, desktop alerts, theme, notifications, refresh, settings and profile. Group unit, region and view live together in the settings panel. Do not add captions, text chips or a second row. Vertical scrollbars are hidden; the page and grids still scroll.
- **Page tools, not page titles.** Every screen uses `PageHeader` (`components/bits.jsx`) to publish its label into the top bar. The info icon portals beside that title (not on the page). On the page it only draws an optional one-line live summary and the screen's tools — never a second big title or a lone info row. Descriptive paragraphs go behind the info icon. On a desk view the lift is skipped (the view title bar names it) unless `keepTitle`.
- **Full-bleed content.** `.wrap` has no max-width; pages use the full main column.
- Content sits in `.panel` blocks with a `.panel-hd` (16px/600 title) that names the table or view behind it.
- KPI tiles use `.stat` plus `.ok` / `.fail` / `.warn` / `.info` (14px/500 label, 24px/600 value).
- Detail screens use `.split`: content plus a 340px right rail for facts, event trail and rules.
- Status is a `.pill` with the platform vocabulary: `NOT_YET`, `BLOCKED`, `READY`, `CLEARED`, `DELAYED`.
- Read-only data is a GridSpec rendered by `SpecGrid` (a `DataView`: grid, pivot, chart), and charts use `Chart`. **REQUIRED:** `wijmo-outcome-grid`.
- A disabled action is a **fact**, not a style: it is off because the fold says so. Say why next to it.

## Framed screens (STEPS, MITR AI, partners)

Framed screens link `/theme/onefinux-tokens.css` (and `/theme/onefinux-wijmo.css` if they use Wijmo) from the host, set `html[data-ofx-embedded="1"]` (MITR AI: `data-ofx-vars="mitr"`) and the host's `data-theme` / `data-skin` (sent as `theme=` / `skin=` on the iframe URL, then as `ofx.theme` messages), and **omit** their own masthead and side panel. Any stack can do all of it with `<script src="/ofx-interop.js" data-ofx-hosts="https://<one-finance>">`. **REQUIRED:** `embed-partner-screen` for the host contract and `workspace-interop` for screen-to-screen links.

The theme is persisted in `localStorage['ofx-theme']`. A review link can force it: `?theme=barclays-dark`.

## Verify

`npm test` (tokens, standards, themes, SDK gates) and, with the apps running, `npm run parity`: type scale ≥ 98% per page and every role equal to STEPS v3 in all three apps.

## Common mistakes

- Defining colours in `styles.css` or a component instead of `--ofx-*` tokens
- A px font size off the scale (12.5px, 13px, 15px) or a Tailwind `text-[13px]`
- Sky (`#00aeef`) as text or a button colour: it is the brand mark only
- A second stylesheet per screen or per team: one standard, `frontend/theme`
- Restoring frosted glass / blur
- Centring content in a narrow column: this is a console, use the width
- A docked rail that eats the content width
- Eyebrows, subtitles or description paragraphs above the content: use `PageHeader`'s info hint
- Hard-coding "FOBO Control Tower" as the platform title: the title is the current product
- A hand-built table or another chart library where `DataGrid` / `DataView` / `Chart` fits
