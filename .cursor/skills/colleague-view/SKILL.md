---
name: colleague-view
description: Use when building the outcome-user job — Helix FOBO sign-off or post, kit-declared actions such as AMEND, open a ready pack, inbox. Not for BU-head boards, kit onboarding, dead letters, or BA pivot authoring.
---

# Outcome user (colleague)

Agents / engines **already ran**. The user opens the ready output and **signs off**, **posts**, or performs a kit-declared verb.

## Surfaces

1. **My outcomes** (`/outcomes`) — entitled cards for this group unit.
2. **Ready view** — kit `embed.url` iframe **or** in-shell pack + Sign off / Post / declared verbs.
3. **Blocked view** — named missing or failed key only. Escalate to RTB; do not invent a fix.
4. **Inbox** — we notified them that output is ready.

## Actions

Buttons come from the kit `userActions`. Call `POST /api/stitch/instance/action`. Do not add a one-off endpoint per verb.

## Rules

- User does not re-run Helix to discover status. Status is the fold.
- Sign off / Post disabled until Ready **and** CEES + federated ACL.
- Agent text is advisory. Sign-off is the fact.
- **REQUIRED:** `barclays-ib-console`. Partner body: `embed-partner-screen`.

## Do not

- Head-level roll-ups on this page (that is Outcome board)
- Dataset / pivot designer
- Dead letters or watermarks
---
