---
name: workspace-interop
description: Use when screens must talk to each other (pick a row here, another screen follows), when adding a view to the Workspace, when the hub must push a context or raise an intent over the WebSocket, or when someone proposes OpenFin, Glue42/io.Connect, Finsemble or a custom postMessage protocol between screens.
---

# Workspace and screen-to-screen links (FDC3)

One Finance is the desktop container: OpenFin-style, inside the browser, with no install. The Workspace (`/workspace`) holds many screens in one page, and they link with the **FDC3 2.0** API (`window.fdc3`), the industry standard OpenFin and io.Connect implement. Screen code is therefore portable, not a One Finance dialect.

## Pieces

| Path | What it is |
|---|---|
| `frontend/web/src/pages/Workspace.jsx` | The host: layouts, views, link colours, intent resolver, partner relay |
| `src/workspace/layout.js` | Pure workspace model: named workspaces, grid / columns / rows / tabs, sizes, add / move / dock |
| `src/workspace/apps.js` | App directory: `route` (console screen), `widget` (native view), `web` (iframe: STEPS, partners, user-added) |
| `src/workspace/channels.js` | User channels (red … purple), context types, which route a context opens |
| `src/workspace/fdc3.js` | `window.fdc3` for console screens (`installFdc3()` in `main.jsx`) |
| `src/workspace/interop.js` | Transport between same-origin documents (BroadcastChannel) |
| `public/ofx-interop.js` | The same `window.fdc3` for cross-origin partner frames (postMessage to the host only) |
| `onefinux-hub/.../api/InteropController.java` | `POST /api/interop/context` and `/api/interop/intent`, pushed to every browser over `/api/ws` |

## The pattern

```js
// share what the user picked, on this view's link colour
fdc3.broadcast({ type: 'ofx.instance', id: row.instanceId });
// follow what other views pick
fdc3.addContextListener('ofx.instance', (ctx) => open(ctx.id));
// ask for an action and let the host pick the screen
await fdc3.raiseIntent('ViewInstance', { type: 'ofx.instance', id });
// handle an intent in this screen
fdc3.addIntentListener('ViewBreak', (ctx) => focusBreak(ctx.id));
// a private desk channel, independent of colours
const desk = await fdc3.getOrCreateChannel('fobo-desk');
```

In React, `DataGrid`'s `onSelect` plus `useShareInstance()` / `useLinkChannel()` (`src/workspace/useLink.js`) cover the common case.

- **Context types:** `ofx.instance { id }`, `ofx.outcome { outcomeId, cobDate, region }`, `ofx.tile { tileId }` (the same tile ids as STEPS) and `ofx.scope`. Any FDC3 type (`fdc3.instrument` …) is relayed untouched. A context is a plain object with a string `type`, at most 16 KB.
- **Intents:** `ViewInstance` and `ViewReport` are built in (the host opens or navigates an instance / report view). Any other intent goes to a view that called `addIntentListener`, preferring the raiser's colour; otherwise it fails with `NoAppsFound`.
- **Hub pushes:** a server-side event can drive screens:
  `POST /api/interop/context {channel, context, source}` or `POST /api/interop/intent {intent, context, source}`. Each browser's single live link (WebSocket, SSE fallback, one leader per browser) delivers it once.
- **Theme and scope:** the host sends both to every view (`ofx.theme`, `ofx.scope`), so framed screens repaint and follow the business date.

## Adding a screen

1. A console route already works: add it to `BUILTIN_APPS` as `kind: 'route'`.
2. A team's app is iframed, not rebuilt: add it as `kind: 'web'` (`STEPS_URL` / `VITE_STEPS_URL` for STEPS). The app loads `/ofx-interop.js` or bundles the contract. **REQUIRED:** `embed-partner-screen`.
3. A small live panel that only makes sense inside the Workspace: `kind: 'widget'` in `src/workspace/widgets.jsx`.

## Do not

- Add a private postMessage or window-to-window protocol between screens: use FDC3 channels and intents
- Post to `'*'` or accept messages without checking `origin` and `source`
- Auto-broadcast on load or on an auto-selected row: share user picks only
- Route a context the console cannot open: keep `routeForContext` the single map
- Put Kafka or hub credentials in the browser: the hub pushes over `/api/ws`
