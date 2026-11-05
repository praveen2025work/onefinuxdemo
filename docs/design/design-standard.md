# One Finance design standard

One look for every screen that ends up inside One Finance — the console, STEPS v3, MITR AI and every team's own app —
whether it runs framed on a desk or on its own: **Barclays brand colours on the STEPS v3 structure**. This page is the
contract teams build to. The live version, drawn from the shipped files, is the console's **Design standard** page
(`/standards`, Guide group in the rail).

## 1. What ships

| File (in `frontend/theme`) | Served at | What it is |
|---|---|---|
| `onefinux-tokens.css` | `/theme/onefinux-tokens.css` | The standard: palettes (`--ofx-*`) per skin and mode, the STEPS type scale (`--ofx-text-*`), shell, spacing and control metrics, the shadcn and MITR bridges, the Barclays Tailwind ramps, and the framework-agnostic page kit (`.ofx-page`, `.ofx-card`, `.ofx-btn` …) |
| `onefinux-wijmo.css` | `/theme/onefinux-wijmo.css` | The grid, filter, pivot and chart skin for Wijmo, read from the tokens |
| `onefinux-tailwind-preset.cjs` | (copied, not served) | Tailwind 3 preset: `blue` / `slate` / `gray` follow the brand, `bg-ofx-*` / `text-ofx-*` colours |
| `frontend/web/public/ofx-interop.js` | `/ofx-interop.js` | The embed SDK: FDC3 2.0 links, host theme, and embedded mode for any stack (`data-ofx-hosts`) |

Edit the standard here and nowhere else. STEPS and MITR AI keep byte-identical copies (`npm run sync:ofx-theme` in each
repo), locked by a SHA-256 in `ofx-theme.lock.json`; an edited copy fails their unit tests.

## 2. Brand palette

Skins are picked with `html[data-skin]`, modes with `html[data-theme]`. **Barclays is the default**; STEPS Banking Blue
(`steps`) and the MITR indigo look (`ofx`) stay selectable.

| Token | Barclays light | Barclays dark (Midnight) | Use |
|---|---|---|---|
| `--ofx-page` | `#f6f6f6` | `#161b2f` | Page background |
| `--ofx-card` | `#ffffff` | `#1a2142` | Cards, panels, header, side panel |
| `--ofx-line` | `#e2e2e2` | `#2e3866` | 1px borders |
| `--ofx-ink` / `--ofx-ink-2` / `--ofx-ink-3` | `#272727` / `#515151` / `#6b6b6b` | `#f5f6fa` / `#cbccd1` / `#9a9fb5` | Text, secondary, captions |
| `--ofx-accent` | `#006de3` Royal Blue | `#3696fc` | Buttons, links, active nav, focus, selection |
| `--ofx-accent-2` | `#005bbe` | `#6cb3fd` | Hover, pressed, info text |
| `--ofx-on-accent` | `#ffffff` | `#0b1020` | Text on an accent fill |
| `--ofx-ok` / `--ofx-warn` / `--ofx-fail` | `#077a1d` / `#9a5b00` / `#c8000d` | `#34c759` / `#ffba00` / `#ff6b6b` | Status text, pills, KPI values |
| `--ofx-gold` | `#ffba00` | `#ffba00` | Warning fills and highlights — never text |
| `--ofx-navy` | `#1a2142` Midnight | `#93c5fd` | Dark surfaces, hero bands |
| `--ofx-sky` | `#00aeef` | `#00aeef` | The brand mark only — never text or a button |
| `--ofx-chart-1 … 6` | Royal Blue, Sky, Midnight, gold, green, violet | lighter equivalents | Chart series in order |

Rules:

- Interactive is Royal Blue, always. Sky (`#00aeef`, the logo blue) is 2.5:1 on white: decoration only.
- Every text token meets WCAG 2.1 AA (4.5:1) on cards, the page and its own status tint, in every skin and mode
  (`frontend/web/src/lib/tokens.test.js` fails the build otherwise). That is why status text is a shade deeper than the
  brand's signal colours (`#c8000d` for `#e3000f`, `#9a5b00` for `#ffba00`).
- Solid surfaces only: no frosted glass, `backdrop-filter`, translucent fills or radial washes.
- No hex in a component. Colours are tokens; Tailwind apps get the ramps from the preset or the bridge.

Typeface: **Barclays Effra** is first in `--ofx-font`. It is licensed and no font file ships here; where it is installed
every app renders it, elsewhere every app renders the same system stack (Segoe UI on Windows). Numbers use
`tabular-nums`; ids and offsets use `--ofx-mono` (JetBrains Mono).

## 3. Type scale

The STEPS v3 steps. Every text size in every app is one of these — nothing in between (no 13px, 12.5px or 15px).

| Token | Size / line | Use |
|---|---|---|
| `--ofx-text-micro` | 10px | Counters on dense rows |
| `--ofx-text-2xs` | 11px | Badges, eyebrows, row actions |
| `--ofx-text-xs` | 12px / 16px | Meta, captions, compact buttons, grid headers |
| `--ofx-text-sm` | 14px / 20px | **Body text**, fields, labels, nav, tabs |
| `--ofx-text-base` | 16px / 24px | Card and section titles (600) |
| `--ofx-text-lg` | 18px / 28px | The app title in the header (700) |
| `--ofx-text-xl` | 20px / 28px | Dialog titles, the brand name |
| `--ofx-text-2xl` | 24px / 32px | Page titles (700), KPI values (600) |
| `--ofx-text-3xl` | 30px / 36px | Hero numbers |

Grid cells are the one exception: 13px (`--ofx-grid-fs`), inside a data grid only.

## 4. Shell, spacing and controls

| Token | Value | Rule |
|---|---|---|
| `--ofx-header-h` | 64px | One header row: brand, page title (18px/700), date, quiet icon buttons |
| `--ofx-sidebar-w` | 256px | Side panel when open |
| `--ofx-nav-h` | 36px | Nav items, 14px/500; the active item is filled with the accent |
| `--ofx-page-px` / `--ofx-gap` / `--ofx-section-gap` | 16px / 16px / 24px | Page gutters, between cards, between page sections |
| `--ofx-card-p` | 24px | Card padding (STEPS `p-6`) |
| `--ofx-ctl-h` | 32px | **Compact** controls — toolbars, filters, card and grid tools (STEPS Button `sm`, 12px/500 text) |
| `--ofx-ctl-h-lg` / `--ofx-field-h` | 36px | **Default** buttons and form fields — forms, dialogs, page actions (STEPS Button, Input, SelectTrigger; 14px) |
| `--ofx-r-ctl` / `--ofx-r-lg` | 10px / 12px | Control and card corners |

## 5. Pages and grid

Every screen is one of five templates (copyable HTML on `/standards` → Page templates):

| Template | Built from | For |
|---|---|---|
| List | `.ofx-page-header` + `.ofx-toolbar` + `.ofx-card` holding a grid | Find and act on rows |
| Dashboard | `.ofx-page-header` + `.ofx-kpis` (`.ofx-kpi`) + `.ofx-grid-12` of cards | Status at a glance |
| Detail | `.ofx-page-header` + `.ofx-split` (content, 340px facts rail) | One record |
| Form | `.ofx-page-header` + `.ofx-card` > `.ofx-form` (`.ofx-form-grid` of `.ofx-field`) + `.ofx-form-actions` | Create or change |
| Workload (framed) | The same, framed: the host's header names the page and `.ofx-page-heading` hides | A team's screen on a desk |

Layout is a 12-column grid (`.ofx-grid-12`, `.ofx-col-1 … 12`): 6 columns under 1024px, one under 640px.

Read-only data is the standard Wijmo grid (33px rows, 13px cells, 12px/600 uppercase header): a **GridSpec** the console
renders, `<ofx-grid>` from `/lib/onefinux-grid.js` in any framework, `/widget/grid?ofx-embed=1&spec=…` in an iframe, or
your own FlexGrid with `/theme/onefinux-wijmo.css`. No hand-built read-only table per screen.

## 6. Adopting it, by stack

**React / Next.js with Tailwind 3 and shadcn (STEPS v3)**

1. `npm run sync:ofx-theme` (copies the three files into `src/styles/ofx`, writes the lock).
2. `import './styles/ofx/onefinux-tokens.css'` and `presets: [require('./src/styles/ofx/onefinux-tailwind-preset.cjs')]`.
3. Set `<html data-ofx-vars="shadcn" data-skin="barclays" data-theme="light|dark">` for the standard themes: the shadcn
   bridge sets `--background`, `--primary` … and hard-coded `text-blue-600` / `bg-gray-50` follow the brand.
4. Keep your own palettes as extra themes if you need them (STEPS: Banking Blue, Light, Dark) — without `data-ofx-vars`.

**Tailwind 4 apps (MITR AI)** — sync the files, import them in `globals.css`, set
`<html data-ofx-vars="mitr" data-skin data-theme>`: the MITR bridge maps the app's own variables (`--brand`, `--bg-*`,
`--text-*`) and Tailwind's `--color-gray-*` / `--color-blue-*` / indigo / violet / purple onto the brand. Snap
arbitrary sizes (`text-[13px]`) to the scale.

**Angular, .NET Razor, Java templates, plain HTML** — link the tokens (and the Wijmo skin), build pages from the `.ofx-*`
kit, and load the SDK with your allow-list:

```html
<html data-skin="barclays" data-theme="light">
<link rel="stylesheet" href="https://<one-finance>/theme/onefinux-tokens.css">
<script src="https://<one-finance>/ofx-interop.js" data-ofx-hosts="https://<one-finance>"></script>
<body class="ofx-app">
  <header class="ofx-header" data-ofx-chrome>…</header>
  <main class="ofx-page">…</main>
</body>
```

## 7. Running inside One Finance (embedded mode)

Teams deploy and run their apps on their own; One Finance frames them — on a desk (`/desks`), in a kit's embed slot, or as
the chat panel.

| The host sends | Example | The app does |
|---|---|---|
| `ofx-embed=1` | | Embedded mode, only for an allow-listed host origin |
| `theme`, `skin` | `light`, `barclays` | `html[data-theme]`, `html[data-skin]` (any short lower-case skin; unknown ones paint as Barclays) |
| `groupUnitId`/`groupUnit`, `cobDate`, `region` | `REV-ACC`, `2026-09-12`, `EMEA` | Scope the screen to the user's business date and unit |
| `ofxView`, `outcomeId`, `runId` | | Know its desk view; outcome desks link on `outcome:<id>` |

Framed, the app sets `html[data-ofx-embedded="1"]`, links the **host's** `/theme/onefinux-tokens.css`, draws **no**
masthead or side panel (`data-ofx-chrome` elements hide) and keeps its page tools; it follows `ofx.theme` messages. Links
between screens are FDC3 (`window.fdc3` from `/ofx-interop.js`), actions are announced with `ofx.activity(…)`, and a
chatbot speaks the chat contract ([`chatbot.md`](chatbot.md)).

| App | Embedded where | Settings |
|---|---|---|
| STEPS v3 | Any page with `?ofx-embed=1` (desk apps `steps`, `steps-tasks`) | STEPS: `NEXT_PUBLIC_OFX_HOST_ORIGINS`, `OFX_HOST_ORIGINS` (frame-ancestors). Console: `VITE_STEPS_URL` |
| MITR AI | Any page — chat widget in the assistant panel, `/dashboard`, `/gridboard`, `/data-explorer` on desks | MITR: `NEXT_PUBLIC_ONEFINUX_ORIGIN`, frame-ancestors. Console: `VITE_MITR_URL`, hub `ONEFINUX_CHATBOT_*` |
| Any team app | Any page | `/ofx-interop.js` with `data-ofx-hosts`; add it to a desk with **Add app → URL**, or to `BUILTIN_APPS` in `workspace/apps.js` |

Security: the app allows the One Finance origin in `frame-ancestors` and trusts only listed host origins for embedded
mode and messages; the console allows the app in `frame-src` and sandboxes desk frames. The frame carries the user's own
SSO session, never a service account.

## 8. Verifying

- **Parity audit** — `cd frontend/web && npm run parity` with the apps running measures every app in
  `parity/parity.config.json` against STEPS v3: type scale per page (≥ 98% of rendered characters on the steps), body
  size, the role metrics (app title, header, nav, buttons, fields, tabs, chips, cards, card titles, grid, page colours),
  the font Chromium actually rendered, and embedded mode. It writes `parity-report/report.md` and exits non-zero on any
  difference. Add your app: its URL, pages, theme switch and one selector per role.
- **Unit gates** — `tokens.test.js` (palette completeness, AA contrast, no px font sizes, ramps), `standards.test.js`
  (the page templates use only shipped classes), `ofx-interop.test.js` (embed SDK), and the lock tests in STEPS and MITR.

Results on 5 November 2026 (barclays-light; before = the same pages on the previous STEPS-blue standard):

| App | Type scale, worst page — before → after | Roles matching STEPS — before → after | Embedded checks — after |
|---|---|---|---|
| STEPS v3 | 100% → 100% (reference) | reference | 7 / 7 |
| One Finance | 34.3% → 100% | 26 / 34 → 35 / 35 | — |
| MITR AI | 21.7% → 100% | 28 / 34 → 34 / 34 | 12 / 12 |

## 9. Changing the standard

1. Edit `frontend/theme` in a pull request; `npm test` in `frontend/web` runs the gates; review the `/standards` page in
   each skin and mode.
2. After merge, run `npm run sync:ofx-theme` in STEPS and MITR AI and commit the copies with their lock.
3. Run the parity audit against the three apps.

Known limits: STEPS chart series colours are hard-coded in its chart components (they do not yet read
`--ofx-chart-*`); STEPS' green / red / amber / purple classes keep Tailwind's hues; Barclays Effra needs a licence to be
installed or served; Wijmo shows an evaluation banner until a licence key is set.
