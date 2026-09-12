---
name: colleague-view
description: Use when building the outcome-user job — Helix FOBO sign-off or post, open a ready pack, inbox, Barclays Now. Not for BU-head boards, kit onboarding, dead letters, or BA pivot authoring.
---

# Outcome user (colleague)

Agents / engines **already ran**. The user opens the ready output and **signs off** or **posts**.

## Surfaces

1. **My outcomes** — entitled cards for this group unit (sample: CATS vs MOTIF recs).
2. **Ready view** — kit `embed.url` iframe (partner Helix/Axiom screen) **or** in-shell Wijmo + Sign off / Post.
3. **Blocked view** — named missing key only.
4. **Inbox / Now** — we notified them that output is ready.

## Rules

- User does not re-run Helix to discover status. Status is the fold.
- Sign off / Post disabled until Ready/Cleared **and** CEES + federated ACL.
- Pipeline steps come from the kit (FOBO sample: ingest → analysis → post MOTIF → notify P&L).
- Agent text is advisory. Sign-off is the fact.
- **REQUIRED:** `barclays-ib-console`. Partner body: `embed-partner-screen`. In-shell grids: `wijmo-outcome-grid`.

## Do not

- Head-level roll-ups on this page
- Dataset / pivot designer (that is config + BA)
- Dead letters or watermarks
---
