---
name: engineering-view
description: Use when onboarding a group unit, adding outcome config screens, binding sources, or enabling a BA to publish a Wijmo view after a dataset exists. Also use when a change would add if (FOBO), a per-report React app, or a fobo-service module.
---

# Config and onboarding

Development + outcome-config enable **group units**. They do not perform COB sign-off.

## Screens (maker-checker)

1. Onboard **group unit**
2. Bind **source / destination**
3. Register **outcome kit** (renderer + user actions: sign-off, post, open pack)
4. Register **dataset** locator
5. BA publishes **grid / pivot / chart** on that dataset — no new UI squad

## Hard rules

- New unit or outcome = data (`groupUnits/`, `products/<id>/`). No new Java type per unit.
- New system = adapter + kit row. **REQUIRED:** `bind-source-destination`, `register-outcome-kit`.
- Analysts compose Wijmo defs. Developers do not ship one React report per ask.
- Fold still has no product names. ArchUnit fails `if (FOBO)`.
- Config users do not see colleague amounts unless also entitled as users.

## SAP / Tableau analogue

SAP-like: one shell, many units, master data = kits and bindings.  
Tableau-like: BA authors views on a provided source.  
Difference: views live **inside** One Finance UX and CEES, not a second estate.
---
