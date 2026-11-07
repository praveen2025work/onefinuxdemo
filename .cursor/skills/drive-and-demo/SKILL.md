---
name: drive-and-demo
description: Use when adding a scenario, changing the Drive screen, recording an executive demo, or writing voiceover for outcome creation / good path / bad path / CIO board / RTB.
---

# Drive and executive demo

Drive (`/drive`) is the **only** place scenario buttons live. Home and Reports stay view-only.

## Drive a COB

1. Set group unit / COB / region in the header.
2. Open `/drive`. Reset if the day is dirty.
3. Run the named scenario (`fobo`, `15c3`, `helix`, `pnl`, `monthend`, `accounting`, `all`). Month-end has two cards: **Month-end close** and **Month-end with break** (`/sim/scenarios/monthend?failure=true`). Use a fresh COB for each; a re-run on the same COB revokes rather than blocks.
4. Watch Board / Reports / Instance update over SSE.

The seeded FOBO COB (2026-09-12) is past its 19:00 cutoff, so a re-driven instance shows **DELAYED** (WARN, DELAY escalation, ServiceNow incident in the simulator) before READY. That is the calendar working. For a demo that should show NOT_YET, start the hub with `ONEFINUX_STITCH_DELAYS=false`. Incidents raised locally: `http://localhost:7081/sim/servicenow/incidents`.

## Exec narration (2–3 minutes, male voice, normal pace)

Hold each screen 15–25 seconds. Do not click mid-sentence.

1. Home — state the business problem from the close story (named blocker). Guides are in the left rail. No greeting
2. Onboarding — configure the outcome
3. Configuration — owner reads the contract
4. Drive — run that outcome for the day
5. Reports — good case
6. Blocked instance — bad case
7. Board, then phone width — CIO / MD
8. Operations — what RTB can do (replay, not sign-off)

Deep-dive extras: **Evidence pack** on an instance or report (printable, SHA-256 digest) and **Platform settings** (role structure, close calendar, deadline rules).

Speak to a CIO or MD. Peer explanation: control, time, named blockers, who signs vs who replays. Human, not slang. No greeting. No slogan.

Script: `docs/design/narration-script.txt`. Runsheet: `docs/design/demo-runsheet.md`.

## Do not

- Put "Drive 15C3" buttons back on product pages
- Jump screens in under eight seconds
- Pre-run the scenario before the audience is watching
---
