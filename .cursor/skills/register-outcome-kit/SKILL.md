---
name: register-outcome-kit
description: Use when adding or changing a business product or outcome (FOBO recon, 15C3, IFRS, PnL, month-end, LCR, or a future kind). Also use when someone asks for a FOBO module, product-specific Java, or a new skill named after one product.
---

# Register an outcome kit

A product is **YAML**. The tower, fold, SSE, and Wijmo host do not change.

## Kit fields

`productId`, `domain`, `question`, `ingest[]`, `universe`, `sla`, `onReady`, `reports[]`, `cees`, `renderer`

`renderer`: `HELIX_RECON` | `ENGINE_REPORT` | `GRID_PACK` | `NOTIFY_MILESTONE`

## Add a product

1. `products/<id>/v1/product.yaml` — no new Java type.
2. Bind sources/destinations (skill `bind-source-destination`).
3. Maker-checker publish.
4. Colleague card appears only for CEES `product:<id>`.

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
