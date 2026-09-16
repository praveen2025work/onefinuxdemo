---
name: embed-partner-screen
description: Use when another team builds a heavy screen (Helix FOBO, Axiom pack, Rec Factory) that One Finance will iframe, when publishing the shared theme, or when a partner invents their own colours or a full second shell.
---

# Partner screen inside One Finance

One Finance is the **shell**. Other teams build the **workload**. We iframe their app so the look stays one platform.

## Who builds what

| One Finance | Partner team |
|---|---|
| Head board, user cards, RTB, config | Helix FOBO tower, Axiom viewer, … |
| Theme file + embed host + CEES gate | Screen body using `--ofx-*` tokens |
| Fold, notify, kit `embed.url` | Their SoR / engine UI |

## Theme (copy, do not restyle)

Publish and import `frontend/theme/onefinux-tokens.css`.  
**REQUIRED:** `barclays-ib-console`. No second header inside the iframe (`data-ofx-embedded="1"`).

## Kit

```yaml
embed:
  url: https://helix.example/fobo
  allowedOrigin: https://helix.example
  chrome: host
```

Host shows the iframe only when the outcome is entitled and Ready (or Blocked with a named reason above the frame).

## Context we pass (query + postMessage)

`groupUnitId`, `productId`, `outcomeId`, `cobDate`, `region`, `runId`, `theme=ofx`.

Child may post: `{ type: "ofx.height", px }`, `{ type: "ofx.signedOff" }`, `{ type: "ofx.posted" }`, `{ type: "ofx.escalate" }`. Parent ignores other origins.

## Security

`frame-src` allowlist = kit `allowedOrigin`. Token in iframe is the user’s SSO, not a shared service account. Partner still checks their ACL. We still check CEES before rendering the frame.

## Do not

- Rebuild FOBO inside `frontend/web` if Helix already has the screen
- Let the partner draw a second One Fin masthead
- Skip the theme file “because our app is already blue”
---
