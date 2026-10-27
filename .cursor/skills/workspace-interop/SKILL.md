---
name: workspace-interop
description: Use when building or changing desks (one per business outcome, or blank), when screens must talk to each other (pick a row here, another screen follows — in this tab, another tab or another browser), when an action must be announced to every screen on an outcome, when the hub must push a context, intent or activity, or when someone proposes OpenFin, Glue42/io.Connect, Finsemble, polling or a custom postMessage protocol between screens.
---

# Desks and screen-to-screen links (FDC3)

One Finance is the desktop container: OpenFin-style, inside the browser, with no install. It is business-outcome driven, so screens are grouped on **desks** (`/desks`), one desk per business outcome or a blank desk for any mix of screens and frames. Screens link with the **FDC3 2.0** API (`window.fdc3`), the industry standard OpenFin and io.Connect implement, so screen code is portable, not a One Finance dialect.

## Pieces

| Path | What it is |
|---|---|
| `frontend/web/src/pages/Desks.jsx` | The host: layouts, views, channels, intent resolver, partner relay, new-desk picker, unread counts per desk |
| `src/workspace/desks.js` | Pure desk rules: subject (outcome or kit), its shared channel, what belongs to a desk, activity feed rows, the template a new outcome desk starts with |
| `src/workspace/layout.js` | Pure desk model: named desks (+ subject), grid / columns / rows / tabs, sizes, view `config`, add / move / dock |
| `src/workspace/apps.js` | App directory: `route` (console screen), `widget` (native view: Activity, Grid, …), `web` (iframe: STEPS, partners, user-added) |
| `src/workspace/channels.js` | Colour channels, context types, which route a context opens |
| `src/workspace/interop.js` | Transport: BroadcastChannel across this browser's tabs; outcome channels relayed through the hub, own echo dropped by `CLIENT_ID` |
| `src/workspace/fdc3.js` | `window.fdc3` for console screens; installs the hub relay for outcome channels |
| `public/ofx-interop.js` | The same `window.fdc3` for cross-origin partner frames, plus `ofx.activity()` |
| `onefinux-hub/.../activity/` | `ActivityFeed` (recent actions + live `activity` event) and `/api/activity`, `/api/interop/activity` |
| `onefinux-hub/.../api/InteropController.java` | `POST /api/interop/context` (stamps `by`, keeps `origin` / `id`) and `/api/interop/intent` |

## Reach: screen, tab, browser

| Channel | Reaches | Use |
|---|---|---|
| Colour (`red` … `purple`) | views in this browser, every tab | ad-hoc linking on a blank desk |
| Outcome desk (`outcome:<id>`, `outcome:kit-<id>`) | that outcome's views in every tab **and every browser** | the default on an outcome desk |
| App channel (`app:<name>`) | views that joined it in this browser | a private feed between a few screens |

Actions travel separately from picks: every action on an outcome becomes a hub `activity` (who, what verb, summary, outcome / kit / instance keys) pushed over the WebSocket (SSE fallback) to every console. The hub publishes it for instance actions (sign-off, countersign, post, adjust, escalate, any kit verb) and for outcome override / re-run. Partner screens announce their own actions with `ofx.activity()`, and a desk's Activity view can post a `NOTE`.

## The pattern

```js
// share what the user picked, on this view's channel (an outcome desk channel reaches every browser)
fdc3.broadcast({ type: 'ofx.instance', id: row.instanceId });
// follow what other views pick
fdc3.addContextListener('ofx.instance', (ctx) => open(ctx.id));
// ask for an action and let the desk pick the screen
await fdc3.raiseIntent('ViewInstance', { type: 'ofx.instance', id });
// a partner screen acted in its own system: tell every desk on this outcome
ofx.activity({ action: 'ASSIGNED', summary: 'BK-4420 assigned to Alex', instanceId });
```

In React, a `SpecGrid` with a `share` block (or `DataGrid`'s `onSelect`) plus `broadcastContext` covers the common case; `subscribeLive((name, data) => …)` hears `activity`.

- **Context types:** `ofx.instance { id }`, `ofx.outcome { outcomeId, cobDate, region }`, `ofx.tile { tileId }` (the same tile ids as STEPS) and `ofx.scope`. Any FDC3 type is relayed untouched. A context is a plain object with a string `type`, at most 16 KB.
- **Intents:** `ViewInstance` and `ViewReport` are built in. Any other intent goes to a view that called `addIntentListener`, preferring the raiser's channel; otherwise `NoAppsFound`.
- **Hub pushes:** `POST /api/interop/context`, `/api/interop/intent`, `/api/interop/activity`. Each browser's single live link (one leader tab per browser) delivers them once per document.

## Adding a screen or a desk

1. A new business outcome needs no code: **New desk** lists every engine outcome and kit, and `deskTemplate` builds its views. Change the template once, in `desks.js`, for every outcome.
2. A console route already works: add it to `BUILTIN_APPS` as `kind: 'route'`.
3. A team's app is iframed, not rebuilt: add it as `kind: 'web'`. The app loads `/ofx-interop.js` or bundles the contract. **REQUIRED:** `embed-partner-screen`.
4. Read-only data is a Grid view with a GridSpec, not a new widget. **REQUIRED:** `wijmo-outcome-grid`.

## Do not

- Add a private postMessage or window-to-window protocol between screens: use FDC3 channels, intents and `activity`
- Poll the hub to find out what another screen did: listen for `activity` / `outcome` pushes
- Put a client-supplied name in an activity or context: the hub stamps the authenticated actor
- Post to `'*'` or accept messages without checking `origin` and `source`
- Auto-broadcast on load or on an auto-selected row: share user picks only
- Put Kafka or hub credentials in the browser: the hub pushes over `/api/ws`
