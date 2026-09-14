---
name: wijmo-outcome-grid
description: Use when adding later group-unit analyst exploration (FlexGrid, Pivot, FlexChart) on sources already onboarded, or when someone asks to build the analyst studio in the first slice. Company has a Wijmo (MESCIUS) licence. Also use when text says Wismo or WisMO — the product name is Wijmo.
---

# Wijmo (MESCIUS) — later, same unit, known origin

**Not day one.** First we bind the source of origin. Analysts enter the same One Fin UX app **after** that, and only see data for their `groupUnitId`.

## When this skill applies

- A unit’s sources are already in the catalog
- Someone asks to explore / pivot / chart that data in-app
- Someone tries to start a Tableau replica or a React report squad

## When it does not

- Tasks that only onboard kits, iframe Helix, or sign-off/post
- A dataset that has no registered origin — send them to config first

## Later studio

| Widget | Use |
|---|---|
| FlexGrid | Lists / breaks / packs |
| Pivot | Dimensions the **registered** dataset already has |
| FlexChart | Same locator |

View def: `datasetId` (must exist on the unit) + widget + fields + `report:{id}`.

## Do not

- Build this in the first shell
- Let the explorer invent a new source
- Leave the group unit
- Add Recharts
---
