# BRD — One Finance UX (for the architecture group)

Owner: Praveen Kumar · Status: current as of 14 September 2026 · Companion to `README.md` and `application.md`.

This is the short version. Three pages. It says what we are solving, what we unify, what the CEO-level sees, what the developers build, and how we keep everyone agreeing on the same design.

## 1. The business problem

At close of business, a group unit (start with Revenue Accounting) has to answer one question per outcome: **"Can I execute this rec / produce this report / post this book?"**

Today that answer is scattered:

- Each origin has its own screen and its own status word (CATS "posted", MOTIF "MB014 rejected", MBR "break open").
- Each destination has its own screen (Helix, FAS→MOTIF, P&L).
- There is no single row that says "this outcome, this date, this region, this run is READY or BLOCKED and why."

So a head cannot see Ready/Blocked without asking. A user cannot sign off a **named** instance. Run-the-bank chases tickets instead of reading a fold. Every team re-implements the same reconciliation of statuses in a slightly different way.

## 2. What we unify

One platform, one shape, applied to every outcome:

- **Group unit** — the onboarding tenant (Revenue Accounting, Product Control, ...).
- **Two complementary models, both data-driven.** The **Outcome Engine** folds a business question over named feeds, an SLA and an on-ready action (15C3, PnL, month-end, FOBO analysis). The **Stitch console kit** hosts the human work — sources, destinations, embed, sign-off / post / kit-declared verbs. FOBO is the first kit. There is no FOBO code path.
- **Outcome instance** — the stitch. One row for one COB, one region, one slice, one run. This is the product the controller acts on.

Origins stay origins. Destinations stay destinations. We do **not** rebuild Helix or MOTIF. We stitch their facts into one instance and fold readiness over it.

```mermaid
flowchart LR
  subgraph origins [Systems of record]
    CATS
    MOTIF
    MBR
  end
  subgraph onefinux [One Finance UX]
    Hub[Event hub + fold]
    Inst["outcome_instance (the stitch)"]
  end
  subgraph dests [Destinations]
    Helix
    FAS[FAS to MOTIF]
    PNL[P&L notify]
  end
  CATS --> Hub
  MOTIF --> Hub
  MBR --> Hub
  Hub --> Inst
  Inst --> Helix
  Inst --> FAS
  Inst --> PNL
```

## 3. What the CEO-level team looks at

**Outcome board** (`/board`) is the management screen for a CIO, MD or business-unit head. One shell. Traffic lights. For each entitled group unit:

- Outcome name, question, status word (NOT_YET / READY / BLOCKED / CLEARED / DELAYED).
- Readiness meter, named blocker, SLA / delay flag and escalation count.

No book grid. No "how many Kafka messages." No engine internals. A head who is also a user can drill into the outcome; a head-only role stays on the board.

The same shell is **mobile-friendly** (rail collapses, grids stack, tables scroll). The management board and My outcomes are the first surfaces intended for a phone between meetings. A native app can wrap this shell later — the job does not change.

## 4. What the development teams look at

- **Facts on the bus.** Every state change is an event. In production the bus is Kafka (or the bank's Solace/MQ). In the POC and the demo it is HTTP into the hub, driven by a **stub simulator** that plays the systems of record.
- **Fold in the hub.** Readiness counts **distinct** `(instance, source, source_key)`. `FAILED` blocks. `REVOKED` withdraws. Downstream completions must echo the `runId`.
- **Browser never touches the bus.** Reads are REST snapshots; live updates are Server-Sent Events; writes are audited REST commands that become workflow events.
- **Products are data, never code.** A kit is a set of rows / YAML. Onboarding a second kit adds no Java type. There is no `if (product == FOBO)`.
- **Heavy screens are partner iframes.** Helix's own screen is embedded with the shared theme, not cloned in this repo.
- **LLM is advisory only.** Agent commentary never sits on the readiness fold.

## 5. How we agree the design

Two artefacts are the single source of truth, and every team measures against them:

- **Visual truth** — `frontend/web/` (the live React console; solid finance dashboard, MITR indigo-lavender accent).
- **Data truth** — Flyway schema under `onefinux-hub/src/main/resources/db/migration/` plus the Outcome Engine definitions (`application.yml` and `POST /api/outcomes/definitions`).

And one worked example that must be identical in every screen, query and event:

```
REV-ACC → FOBO → R-1042 READY (RUN-A37C) / R-2031 BLOCKED (MOTIF MB014, ESC-19, DL-4402)
sources: CATS, MOTIF, MBR
```

If a mock, a table, or an event does not use these exact keys, it is wrong.

## 6. Scope line — demo vs production

**In the demo build (a real, working slice):**

- React console at `frontend/web` — Home, Product, Onboarding, Configuration, Drive, Reports, Outcome board, My outcomes, Operations, Monitoring.
- Outcome Engine with runtime onboard; 15C3 report lifecycle (feeds → ready → processing → generated → available).
- REV-ACC + FOBO kit + two instances, driven live from **Drive** (product pages stay view-only).
- Sign-off / post / escalate / kit-declared verbs (e.g. AMEND) that persist and change the fold.
- Pluggable capabilities: `ActionExecutor` registry on outcomes; generic stitch action gated by `userActions`.
- Working COB date, region, filters, notification inbox, live activity over SSE.
- Barclays brand theme; mobile-collapsing shell.

**Deferred, but designed here:**

- Real Kafka / Solace and FEED watermarks against production topics.
- Real CEES entitlements (the demo ships a fail-open local stub; the contract is fail-closed).
- Live Helix / FAS / Axiom (the demo keeps the mocks on port 7081).
- Barclays Now channel and a native mobile wrapper of the same shell.

## 7. Non-functionals we commit to

- Deterministic fold — state is a replay of the event store, so any restart or new outcome definition rebuilds from history.
- Idempotent ingest — re-sending an `eventId` is safe.
- Entitlement fail-closed — unentitled artefacts return 404, not 403.
- Audit — every human command is an event with who/when/why.

## 8. What we are asking the architecture group to agree

1. The two models (Outcome Engine + Stitch kit) sharing one event backbone, and the stitch keys above.
2. Transport rule: bus for systems, SSE + REST for browsers, never Kafka in the browser.
3. Capabilities as data + registries; no product-named code or modules.
4. The phased scope line in section 6.

Once these are agreed, the application BRD (`application.md`) is the builder's document.
