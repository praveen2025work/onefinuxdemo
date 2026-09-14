# One Finance UX — Demo Runsheet

Facilitator script. Two tracks: a **2–3 minute narrated MD / CIO story** (male voice, normal pace) and a longer **CIO deep-dive**. Each step lists what to show, what to say, and the so-what. Do not jump screens quickly.

---

## Pre-flight

- Hub `http://localhost:7070` · Simulator `http://localhost:7081` · Console `http://localhost:5173`
- Theme: dark (Astronaut Blue + Cerulean) for exec rooms.
- Reset: `POST /api/stitch/reset`. Do **not** pre-run the day's scenario — Drive it live.

Worked examples:

- Good path: 15C3 (or a newly onboarded outcome) — every feed arrives → READY → PROCESSING → AVAILABLE.
- Bad path: FOBO **R-2031 BLOCKED** — MOTIF rejects a named ledger; escalate to RTB.

---

## Track A — 2–3 minute narrated story (normal pace)

Hold each screen 15–25 seconds. Speak at a conversational pace. Do not click during a sentence.

| Beat | Screen | What you are explaining |
|---|---|---|
| Problem | Home | Close-of-business question is scattered across systems; we fold it to ready or blocked. No greeting. |
| Configure | Onboarding | Write the question, feeds, SLA, on-ready. Data, not a new app. |
| Inspect | Configuration | Owner picks the outcome and reads the contract. |
| Run the day | Drive | Start the scenario for that COB. Product pages stay the job. |
| Good case | Reports (15C3) | Feeds land; ready → processing → available to view. |
| Bad case | Blocked instance | Named key (Motif MB014). Escalate to RTB. |
| Management | Outcome board, then phone width | CIO / MD traffic lights. Same board on a phone. |
| RTB | Operations | Delays, escalations, replay. They do not sign off. |

Voice: male, warm, spoken to a CIO / MD. Peer explanation, not slang and not a slide read. Script: `docs/exec/narration-script.txt`.

---

## Track B — CIO deep-dive (10 minutes)

Use the same story, then stay on Monitoring (ingest → outbox → audit), Configuration (feeds as the dependency mechanism), and Instance detail (lineage + kit-declared actions). Point at `docs/exec/architecture.md` for the diagrams.

---

## Fallback

- Scenario already ran / keys de-duplicated: reset, then Drive again, or post events with unique `sourceKey`.
- Hub down: `mvn -pl onefinux-hub spring-boot:run` (port 7070).
- Theme looks light in a dark room: click the theme dot in the header.
