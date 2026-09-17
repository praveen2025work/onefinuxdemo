---
name: register-outcome-kit
description: Use when adding or changing a business product or outcome (FOBO recon, 15C3, IFRS, PnL, month-end, LCR, or a future kind). Also use when someone asks for a FOBO module, product-specific Java, or a new skill named after one product.
---

# Register an outcome kit

A product is **data**. Two registration paths, matching the two models.

## Outcome Engine (business question)

Use **Onboarding** (`/onboarding`) or `POST /api/outcomes/definitions`.

Required: `id`, `name`, `question`, at least one feed (`eventType`, `sourceSystem`, `expectedCount`, `label`). Optional: regions, ownerGroup, SLA (`withinMinutes` or `cutoff` + `dayOffset`), `onReady` (`NOTIFY_ONLY` or a registered `ActionExecutor` type such as `HTTP_COMMAND` / `LOG_COMMAND`), `grids` (`id`, `title`, `endpoint`, `method`, `params` with `from` or `value`).

The instance appears on Board, Reports and Configuration for the given COB. No new Java type.

To change a live definition (including grids): **Configuration → Edit**, which calls `PUT /api/outcomes/definitions/{id}`.

## Stitch console kit (human work)

Use `POST /api/stitch/kits` with `kitId`, `question`, `renderer`, `userActions`, sources, destinations, optional embed.

New human verb = add it to `userActions`. The console renders a button; `POST /api/stitch/instance/action` handles it. No new endpoint.

## FOBO first kit (copy shape, not code)

- Engine outcome `FOBO_HELIX`: feed `MASTERBOOK_READY` / MOTIF; on ready `HTTP_COMMAND` → Helix.
- Console kit `FOBO`: sources CATS, MOTIF, MBR; actions `SIGN_OFF,POST,AMEND,ADJUST,COUNTERSIGN`; embed Helix.

## Forbidden

- `products/fobo/` as a Maven module
- Per-product skills (`fobo-recon`, `15c3-pack`)
- `if (renderer)` or `if (FOBO)` inside the fold
---
