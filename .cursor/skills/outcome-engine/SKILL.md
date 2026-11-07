---
name: outcome-engine
description: Use when changing the Outcome Engine fold, on-ready actions, report stages, runtime outcome registration, or adding a new ActionExecutor type. Also use when someone asks to special-case FOBO vs 15C3 in the engine.
---

# Outcome Engine

The engine is a **deterministic fold**. FOBO, 15C3, PnL and a newly onboarded outcome are the same type.

## Definition

`OutcomeDefinition`: id, name, question, regions, ownerGroup, sla, dependencies[], onReady.

Create at runtime: `POST /api/outcomes/definitions`. Seed in `application.yml`.

## Fold

Match `eventType` + `sourceSystem`. Re-derive status. Emit `OutcomeChanged`. No `if (product)`.

Derived `stage`: `NOT_STARTED → FEEDS → READY → PROCESSING → GENERATED | AVAILABLE` (or `BLOCKED` / `FAILED`). `AVAILABLE` only when a completion event carries `reportId`.

Deadline: `sla.cutoff` in the region's zone on COB + `sla.dayOffset` business days, from `CloseCalendar` (`onefinux.calendar`: zone, weekend, holidays per region). `sla.withinMinutes` stays relative to the first input. Never compute a deadline in the JVM zone.

ETA is **advisory**: LIVE from this COB's arrived facts, HISTORIC from the P50 ready-duration of prior COBs (same outcome + region), BLENDED 60/40. It never changes readiness.

## On-ready capabilities

Any `onReady.action` other than `NOTIFY_ONLY` goes through the `ActionExecutor` registry.

- New capability = one Spring bean implementing `ActionExecutor` + `action: TYPE` on the definition.
- Built-in: `HTTP_COMMAND` (POST to `actionTargets`), `LOG_COMMAND` (stub that self-completes).
- Downstream reports back by publishing the completion event. No polling.
- Example as data: `MONTH_END_CLOSE` (EMEA, four feeds, `HTTP_COMMAND` to `closepack`, completion `CLOSE_PACK_GENERATED`). A new close is YAML or `POST /api/outcomes/definitions`, not Java.

## Do not

- Add a second readiness model for reports
- Hard-code `HTTP_COMMAND` as the only action
- Put Drive / scenario buttons on Reports
- Put the ETA on the readiness fold
---
