---
name: engineering-view
description: Use when adding product kits, contracts, feed adapters, command bindings, schema versions, or the engineering catalogue UI. Also use when a change would add if (FOBO) or a fobo-service module.
---

# Engineering view

Platform and integration work on **data and adapters**. The fold has no product names.

## What this view is for

- Product catalogue (kits as YAML)
- Source bindings (PUSH / FEED / BOTH) and mapper version
- Destination command targets (Helix, Axiom, FAS)
- Maker-checker of kit diffs
- Contract / envelope changes

## Hard rules

- New business kind = `products/<id>/v1/product.yaml`. No new Java type.
- New system = `adapters/<source>-feed/` + kit ingest row, or a command binding. Not a product module.
- ArchUnit / review fails `if (productId == "FOBO")` and `import ...fobo`.
- Colleague amounts and breaks do not appear on engineering screens.

## First FOBO kit systems (examples, not types)

CATS, MOTIF, MBR/Rec Factory (sources). Helix/Rec Factory, FAS→MOTIF, P&L Agent (destinations).

**REQUIRED SUB-SKILL:** `register-outcome-kit` when adding a product. `bind-source-destination` when adding a system.
---
