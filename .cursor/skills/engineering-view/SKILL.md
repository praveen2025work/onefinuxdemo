---
name: engineering-view
description: Use when changing Onboarding or Configuration, binding a known source, or when a change would add if (FOBO), a day-one analyst studio, a per-report React app, or a fobo-service module.
---

# Config and onboarding

Onboarding **creates**. Configuration **governs**.

## Onboarding (`/onboarding`)

Register a live `OutcomeDefinition`: question, feeds, SLA, on-ready. `POST /api/outcomes/definitions`. The outcome appears on Board / Reports / Configuration for the COB.

## Configuration (`/configuration`)

User-driven master-detail. Left rail: business outcomes + console kits + group-unit scope. Right pane: selected anatomy (contract, live state, feeds — or kit sources / destinations / embed). No stacked overlapping panels.

## Bindings

New system = adapter first. **REQUIRED:** `bind-source-destination`. Partner heavy UI = iframe (`embed-partner-screen`).

## Hard rules

- New unit or outcome = data. No Java type per unit.
- Fold has no product names.
- Do not put create-forms on Configuration.
- Do not start the BA studio because “Wijmo is licensed.”
---
