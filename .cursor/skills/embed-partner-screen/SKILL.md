---
name: embed-partner-screen
description: Use when another team builds a heavy screen (STEPS, Helix FOBO, Axiom pack, Rec Factory) that One Finance will iframe, when publishing the shared theme, or when a partner invents their own colours or a full second shell.
---

# Partner screen inside One Finance

One Finance is the **shell**. Other teams build the **workload**. We iframe their app so the look stays one platform: in a kit's embed slot or as a Workspace view beside other screens.

## Who builds what

| One Finance | Partner team |
|---|---|
| Head board, user cards, RTB, config, Workspace | STEPS, Helix FOBO tower, Axiom viewer, … |
| Theme files + embed host + FDC3 desktop agent + CEES gate | Screen body using `--ofx-*` tokens |
| Fold, notify, kit `embed.url` | Their SoR / engine UI |

## Theme (link, do not restyle)

Link the host's design standard; do not copy colours into your app:

```html
<link rel="stylesheet" href="https://<one-finance>/theme/onefinux-tokens.css">
<link rel="stylesheet" href="https://<one-finance>/theme/onefinux-wijmo.css"> <!-- if you use Wijmo -->
```

Set `html[data-ofx-embedded="1"]` and draw **no** masthead. Take `theme=light|dark` and `skin=steps|ofx` from the iframe URL into `html[data-theme]` / `html[data-skin]`, then follow `ofx.theme` messages. Tailwind/shadcn apps get their HSL variables from the bridge in the tokens file. **REQUIRED:** `barclays-ib-console`.

## Kit

```yaml
embed:
  url: https://helix.example/fobo
  allowedOrigin: https://helix.example
  chrome: host
```

Host shows the iframe only when the outcome is entitled and Ready (or Blocked with a named reason above the frame).

## Context we pass (query + postMessage)

Query: `groupUnitId`, `productId`, `outcomeId`, `cobDate`, `region`, `runId`, `theme`, `skin`, and `ofxView` (the Workspace view id).

Screen-to-screen links use FDC3. Load the host SDK and use `window.fdc3`. **REQUIRED:** `workspace-interop`.

```html
<script src="https://<one-finance>/ofx-interop.js"></script>
<script>
  fdc3.addContextListener('ofx.instance', (ctx) => highlight(ctx.id));
  fdc3.broadcast({ type: 'ofx.break', id: 'BK-4420' });
</script>
```

A team that cannot load cross-origin script bundles the same contract. STEPS does this in `src/lib/ofx-interop.ts`.

Kit embeds may also post `{ type: "ofx.height", px }`, `{ type: "ofx.signedOff" }`, `{ type: "ofx.posted" }` and `{ type: "ofx.escalate" }`. Both sides ignore other origins, and a partner posts only to the host origin.

## Security

- `frame-src` allowlist = kit `allowedOrigin`, and the Workspace sandboxes web views.
- The partner allows the host in `frame-ancestors` (STEPS: `OFX_HOST_ORIGINS` / `-OfxHostOrigins`) and only enters embedded mode for allow-listed host origins (STEPS: `NEXT_PUBLIC_OFX_HOST_ORIGINS`).
- The token in the iframe is the user's SSO, not a shared service account. The partner still checks their ACL, and we still check CEES before rendering the frame.

## Do not

- Rebuild FOBO or STEPS inside `frontend/web` when the team already has the screen
- Let the partner draw a second One Finance masthead
- Copy the palette "because our app is already blue": link the tokens
- Invent a private postMessage protocol between screens: FDC3 channels and intents
