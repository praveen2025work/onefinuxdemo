---
name: engineering-view
description: Use when onboarding a group unit or binding a known source of origin. Also use when a change would add if (FOBO), a day-one analyst studio, a per-report React app, or a fobo-service module.
---

# Config and onboarding

Enable **group units** and **known sources**. Analyst exploration is later.

## Now (maker-checker)

1. Onboard **group unit**
2. Bind **source of origin** / destination
3. Register **outcome kit** + optional `embed.url`
4. Record dataset **id** (origin only — no explorer)

## Later

Analyst in that unit explores those origins (`wijmo-outcome-grid`). Not this slice.

## Hard rules

- New unit or outcome = YAML. No Java type per unit.
- New system = adapter first. **REQUIRED:** `bind-source-destination`.
- Partner heavy UI = iframe (`embed-partner-screen`). Do not clone Helix.
- Do not start the BA studio because “Wijmo is licensed.”
- Fold has no product names.
---
