# Three views, outcome kinds, and source/destination entities

**Status:** proposed  
**Source of visual truth:** `FoboControlTower_V2.html` (FOBO Control Tower — Agent One)  
**Not in scope:** extra gallery pages, magazine chrome, new Java modules named after FOBO

One Finance remains a **multi-product outcome platform**. The uploaded FOBO Helix screen is the **colleague application style** and the **first outcome kind** (Helix-style recon). It is not the whole product.

---

## 1. Visual language (Barclays IB — copy the sample, do not invent)

Light workstation by default (COB daytime). Navy chrome always.

| Token | Value | Use |
|---|---|---|
| `--barcl-navy` | `#002D5F` | Header, primary buttons |
| `--bg-header-deep` | `#001E45` | Header left / brand block |
| `--clr-blue` | `#00AEEF` | Active, live, APAC, analysing |
| `--bg-page` | `#EEF2F7` | Canvas |
| `--bg-card-solid` | `#FFFFFF` | Cards / grids |
| `--text-primary` | `#0D1B2E` | Body |
| `--text-muted` | `#4E6880` | Meta, COB, region |
| `--clr-green` | `#1A7A45` | Cleared / ready / posted |
| `--clr-amber` | `#A05C08` | Awaiting desk / aged |
| `--clr-red` | `#B02020` | Blocked / failed |
| `--clr-purple` | `#4E3C9A` | MOTIF / BO / auto-post |
| Font | Manrope or IBM Plex Sans | UI; IBM Plex Mono for ids, times, amounts |

Pipeline in the sample (FOBO recon kind only): **Ingest (MBR / Rec Factory)** → **FOBO Agent Analysis** → **Post to MOTIF (FAS)** → **Notify P&L Agent (Book Unlocked)**.

Other outcome kinds reuse the same chrome and swap the pipeline steps. Do not hard-code CATS/MOTIF into the shell.

---

## 2. Three views — same platform, different jobs

| View | Who | Sees | Must never see |
|---|---|---|---|
| **Colleague** | Reconcilers, Rev Acc, Product Control, reg reporting | Entitled outcomes, named blockers, Wijmo/report, approve/post when entitled | Dead-letter payloads, kit YAML, other products' cards |
| **Engineering** | Platform + integration + outcome owners | Kits, contracts, feed watermarks, command bindings, schema versions | Colleague P&L numbers they are not entitled to |
| **Run-the-bank support** | L2/L3, ops | Dead letters, lag, dual-control replay, correlation ids | Ability to change kit without checker; silent drop |

CEES still filters cards. Support tools are a **separate entitlement** (`platform.support`), not a hidden tab on the colleague tower.

---

## 3. Outcome kinds (one kit, four renderers)

An outcome is still the eight-field kit. The **renderer** is a kit field, not a Java `if`.

| Kind | Sample / analogue | Colleague surface | On-ready |
|---|---|---|---|
| `HELIX_RECON` | CATS vs MOTIF Rates/FX/Credit/Equities, Rec Factory Cash/Collateral | Control Tower rec cards + book bars + break grid + post | COMMAND Helix / Rec Factory, then COMMAND FAS/MOTIF |
| `ENGINE_REPORT` | 15C3, IFRS pack | Status + Open pack (Wijmo or Excel template) | COMMAND Axiom / engine |
| `GRID_PACK` | PnL pack, close pack | My Reports gallery + Wijmo | NOTIFY_ONLY or COMMAND merge |
| `NOTIFY_MILESTONE` | Book Unlocked → P&L Agent | Inbox / Now only | NOTIFY_ONLY |

Advisory LLM (Agent Analysis in the sample) is **optional** on `HELIX_RECON`. It is never a readiness input.

---

## 4. Entities that must exist (UI + adapters)

Create these objects. Do not create a FOBO service.

| Entity | Lives | Purpose |
|---|---|---|
| Product kit | `products/<id>/v1/product.yaml` | Question, ingest, universe, SLA, on-ready, report, CEES |
| Source binding | kit + `adapters/<source>-feed/` | How we **read** their existing feed (CATS, MOTIF, MBR, Rec Factory, SAP, Castle) |
| Destination binding | kit + workflow | How we **command** Helix, Axiom, FAS/MOTIF post |
| Outcome instance | hub snapshot | COB + region + slice (rec id / book set) |
| Break / report row | producer JSON → Wijmo | Helix/MBR rows; we do not invent match rules |
| Notification | after the fold | In-app, email, Now — we send, sources do not |
| Dead letter | support store | Unmapped feed row; dual-control replay |

**FOBO sample systems (first HELIX_RECON kit):**

- Sources: CATS (FO), MOTIF ledger (BO), MBR / Rec Factory (breaks).
- Destinations: Helix / Rec Factory (analyse), FAS → MOTIF (post adjustment), P&L Agent (notify unlock).

---

## 5. Skills (only these)

| Skill | Load when |
|---|---|
| `barclays-ib-console` | Any UI |
| `colleague-view` | Colleague screens or copy |
| `engineering-view` | Kits, contracts, adapters, fold |
| `rtb-support-view` | Dead letters, replay, lag |
| `bind-source-destination` | New or changed source/destination |
| `wijmo-outcome-grid` | Breaks, packs, any grid/report |
| `register-outcome-kit` | New product / outcome kind |

Master plan: `docs/superpowers/plans/2026-09-12-outcome-platform-master-plan.md`.
