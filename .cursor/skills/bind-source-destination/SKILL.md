---
name: bind-source-destination
description: Use when wiring a source system (CATS, MOTIF, MBR, Rec Factory, SAP, Castle, Helix completion) or a destination (Helix, Axiom, FAS post, notify). Also use when a team cannot send us notifications and we must read their existing feed.
---

# Bind source and destination

We do not own CATS, MOTIF, Helix, or Axiom. We **read** their feed and **command** their API/topic.

## Source (ingest)

| Mode | When |
|---|---|
| `FEED` | They already publish (Motif book topic, CATS movements, MBR breaks). We subscribe, map, watermark. |
| `PUSH` | They can POST/publish our envelope (Helix completion). |
| `BOTH` | Mixed keys on one outcome |

Mapper output is always `onefinux.fact.v1` (`eventType`, `sourceSystem`, `sourceKey`, `cobDate`, `region`, `sliceKey`, `status`). Idempotent on their id + offset. No SoR polling.

## Destination (on-ready)

`onefinux.command.v1` with new `runId`. Target from kit (`HELIX`, `REC_FACTORY`, `AXIOM`, `FAS_MOTIF`, `NOTIFY`). Completion is a **fact** that echoes `runId`. Late runs discarded.

## FOBO sample path

`CATS` + `MOTIF` + `MBR` facts → fold → command Helix → breaks locator → optional FAS post → notify P&L Agent.

## Do not

- Ask the source team to build a One Finance webhook if a topic exists
- Embed CATS↔MOTIF match rules in the hub
---
