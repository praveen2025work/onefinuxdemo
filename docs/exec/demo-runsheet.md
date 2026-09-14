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

| Time | Screen | Say |
|---|---|---|
| 0:00–0:20 | Home | At close of business a controller has one question per outcome. Can I execute this rec? Can I produce the fifteen C three report? Today we create an outcome, drive it for the day, and show both the good path and the blocked path. |
| 0:20–0:50 | Onboarding | We start on Onboarding. We name the business question, declare the input feeds, the SLA, and what to do when every feed is ready. This is data, not a new product module. When we onboard it, the outcome goes live. |
| 0:50–1:15 | Configuration | Configuration is where the owner inspects the contract. Pick the outcome on the left. The right pane shows entitlement, SLA, the on-ready action, and every feed that must complete. Onboarding creates. Configuration governs. |
| 1:15–1:40 | Drive | For this business date we start Drive. Drive is the testing console. We run the day's scenario for the outcome. Product pages stay clean — they only show the fold. |
| 1:40–2:05 | Reports | The good path. Every feed arrives. The outcome moves from feeds, to ready, to processing, to generated, and available to view. A controller can open the report and proceed. |
| 2:05–2:25 | Outcome board + instance (blocked) | The bad path. A required feed fails. The instance is blocked on a named key. The user sees exactly which source failed. They escalate to run the bank. |
| 2:25–2:45 | Outcome board, then narrow viewport | For a CIO or managing director, the Outcome board is the management screen. Traffic lights across the unit. Ready, blocked, escalations. No book grid. No engine internals. These screens are mobile friendly. The same traffic lights work on a phone between meetings. |
| 2:45–3:05 | Operations | Run-the-bank monitors delays, escalations, and dead letters. They can replay a failed event. They do not sign off a rec. That stays with the outcome user. One platform. Two models. New capabilities launch by configuration, not new code. |

Voice: male, British, normal pace (about 140 words per minute). Script file used for TTS: `docs/exec/narration-script.txt`.

---

## Track B — CIO deep-dive (10 minutes)

Use the same story, then stay on Monitoring (ingest → outbox → audit), Configuration (feeds as the dependency mechanism), and Instance detail (lineage + kit-declared actions). Point at `docs/exec/architecture.md` for the diagrams.

---

## Fallback

- Scenario already ran / keys de-duplicated: reset, then Drive again, or post events with unique `sourceKey`.
- Hub down: `mvn -pl onefinux-hub spring-boot:run` (port 7070).
- Theme looks light in a dark room: click the theme dot in the header.
