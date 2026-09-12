---
name: register-outcome-kit
description: Use when adding or changing a business product or outcome (FOBO recon, 15C3, IFRS, PnL, month-end, LCR, or a future kind). Also use when someone asks for a FOBO module, product-specific Java, or a new skill named after one product.
---

# Register an outcome kit

A product is **YAML**. The tower, fold, SSE, and Wijmo host do not change.

## Kit fields

`groupUnitId`, `productId`, `domain`, `question`, `ingest[]`, `universe`, `sla`, `onReady`, `reports[]`, `cees`, `renderer`, `userActions` (sign-off / post / open / ack)

`renderer`: `HELIX_RECON` | `ENGINE_REPORT` | `GRID_PACK` | `NOTIFY_MILESTONE` | `ANALYST_VIEW`

## Add a product

1. Group unit exists (`groupUnits/<id>.yaml`).
2. `products/<id>/v1/product.yaml` — no new Java type.
3. Bind sources/destinations (`bind-source-destination`).
4. Optional dataset + Wijmo view (`wijmo-outcome-grid`).
5. Maker-checker publish. User card appears for CEES `groupUnit` + `product`.

## FOBO first kit (copy shape, not code)

- Question: Can I execute this rec?
- Ingest: CATS, MOTIF, MBR/Rec Factory as FEED
- On ready: COMMAND Helix; then optional FAS post; NOTIFY P&L
- Report: Wijmo breaks
- Renderer: `HELIX_RECON`

## Forbidden

- `products/fobo/` as a Maven module
- Per-product skills (`fobo-recon`, `15c3-pack`)
- `if (renderer)` exploding into product names inside the fold — renderer selects a **view**, fold stays generic
---
