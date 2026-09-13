# One Finance UX — Demo Runsheet

*A facilitator script for demonstrating to an MD / CIO. Two tracks: a 5-minute **MD business story** and a 10-minute **CIO deep-dive**. Each step lists what to click, what to say, and the "so what". A fallback is given for anything that can misfire.*

---

## Pre-flight (2 min before the audience joins)

Services (already wired in this environment):

- Hub — `http://localhost:7070` · Simulator — `http://localhost:7081` · Console — `http://localhost:5173`

Reset to a clean, known state and pre-stage the story:

```bash
# 1. Clean slate
curl -s -X POST http://localhost:7070/api/stitch/reset -o /dev/null -w "reset=%{http_code}\n"

# 2. (Optional) clear the downstream sink so "Other systems received" starts empty
#    restart the simulator if you want a pristine sink

# 3. Open the console at http://localhost:5173 and confirm the group unit is REV-ACC
```

**Golden rule:** drive the scenario *live* during the demo (below) so the board moves in front of them. Don't pre-run it.

Worked example you'll narrate (fixed, memorable):

- **R-1042 → READY** — all three origins arrive, Helix echoes run `RUN-A37C`.
- **R-2031 → BLOCKED** — MOTIF rejects ledger `MB014`; the board names the blocker.
- **ESC / DL-4402** — the block becomes an escalation and a dead letter for Run-the-Bank.

---

## Track A — MD business story (5 minutes)

**A1. The question (30s) — Home**
- *Click:* Home.
- *Say:* "This is a controller's morning. One shell, traffic lights. The only question that matters — *can I run my process yet?*"
- *So what:* Replaces chasing a dozen systems with a single glance.

**A2. Drive the day (60s) — Home → "Drive FOBO demo"**
- *Click:* the **Drive FOBO demo** button.
- *Say:* "Watch the estate come to life — trades book, breaks clear, ledgers post — and the board decides in real time."
- *So what:* The platform is reacting to the *real* facts systems emit, not a batch report.

**A3. The good path (60s) — Outcome board → R-1042**
- *Click:* Outcome board; open **R-1042**.
- *Say:* "R-1042 is **green**. Every dependency met, and Helix confirmed run RUN-A37C. The controller can act — and sign off, with a full trail."
- *So what:* From raw facts to a trustworthy business decision, with lineage.

**A4. The bad path (60s) — R-2031**
- *Click:* open **R-2031** (blocked).
- *Say:* "R-2031 is **red** — and it tells you *why*: MOTIF rejected ledger MB014. No hunting. The named blocker is on screen."
- *So what:* The system surfaces the *reason*, which is where controllers lose hours today.

**A5. Run-the-Bank (45s) — Operations**
- *Click:* Operations.
- *Say:* "The break becomes an escalation and a dead letter here. RTB owns it, with dual-control replay. Nothing is silently dropped."
- *So what:* Operational resilience and clear ownership — an auditor's and an MD's comfort.

**A6. Close (30s)**
- *Say:* "One question, answered live, with the reason, the owner, and the audit trail. That's the daily close made legible."

---

## Track B — CIO deep-dive (10 minutes, after the MD story)

**B1. Integration model (2 min) — Monitoring → "Live event tape" + "By source"**
- *Click:* Monitoring; point at the event tape and by-source counts.
- *Say:* "Every source — CATS, MOTIF, MBR, Helix, RAMP — just publishes a small **fact** to one endpoint. We store it append-only. We never copy their databases; heavy data stays in the source, we hold the fact and a deep-link."
- *So what:* Integration is a lightweight adapter, not a migration. No rip-and-replace.

**B2. Command + echo, no polling (1 min)**
- *Say:* "When an outcome is ready, we send the command — 'run Helix analysis' — and Helix **echoes** its completion back as another fact (RUN-A37C). No polling anywhere."
- *So what:* Two-way, event-driven, and loosely coupled.

**B3. Reliable propagation — the outbox (2.5 min) — Monitoring → "Propagation outbox" + "Routes" + "Other systems received"**
- *Say:* "The same fact is fanned out to downstream systems — archive, Finance Store, P&L feed — through a **transactional outbox**. One row per fact per route, delivered at-least-once over HTTP as **CloudEvents 1.0**. Subscribers de-dupe on event id."
- *Optional live failure:* take the sink offline, force a fact, show a **FAILED** row, bring the sink back, hit **Retry** → it flips to **DISPATCHED**.
- *So what:* "What we stored" and "what we propagated" cannot drift apart, and failures are visible and recoverable.

**B4. Audit + replay (1.5 min) — Monitoring → "Audit log"**
- *Say:* "Every human command — sign-off, escalate, publish, replay — is written to an append-only **audit log**: who, when, what, why. And the whole state can be **replayed** from the immutable event store."
- *So what:* Evidence on demand for regulators; disaster recovery by design.

**B5. Onboarding as data (1.5 min) — Configuration / Onboarding**
- *Say:* "A new product or recon is registered **as data** — sources, destinations, embed — no Java, no release. The RAMP feed we just renamed flowed through config and correlated into PnL with zero code change to the engine."
- *So what:* The next business goes live without an engineering cycle.

**B6. Entitlement & determinism (1 min)**
- *Say:* "Every artefact is CEES-scoped; production is **fail-closed** (unentitled → 404). The outcome fold is deterministic and explainable — essential for a regulated close. AI, later, only *advises*; the engine stays deterministic."
- *So what:* Secure, explainable, and audit-friendly.

---

## Fallbacks

| If this happens | Do this |
|---|---|
| Board doesn't move after "Drive FOBO" | Re-run: `curl -s -X POST http://localhost:7081/sim/scenarios/fobo`; give it ~8s; click Refresh on the screen. |
| A screen looks stale | Every screen has a **Refresh**; Monitoring also polls every ~3s. |
| Monitoring shows old data | `curl -s -X POST http://localhost:7070/api/stitch/reset` then re-drive. |
| Downstream sink empty on B3 | It fills within a couple of seconds of driving; or restart the simulator to reset it to zero first. |
| Need to prove a number | Hit the API directly, e.g. `GET /api/stitch/monitor/overview` (metrics) or `GET /api/outcomes` (outcome + dependency state). |

## One-line talking points to leave them with

- **MD:** "One question — *can I proceed?* — answered live, with the reason, the owner, and the audit trail."
- **CIO:** "We integrate by subscribing to facts, not copying databases — resilient, audited, standards-based, and no rip-and-replace."
