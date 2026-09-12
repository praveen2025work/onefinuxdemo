# Outcome platform master plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Load the view/entity skill named on the task before writing code.

**Goal:** Ship One Finance as a multi-product outcome control plane whose colleague UI matches `FoboControlTower_V2.html` (Barclays navy + cyan), with separate engineering and run-the-bank support surfaces.

**Architecture:** One product kit, four renderers (`HELIX_RECON`, `ENGINE_REPORT`, `GRID_PACK`, `NOTIFY_MILESTONE`). Systems stay SoRs. We read existing feeds, fold readiness, command destinations, then notify. No `if (product == FOBO)` in Java or React.

**Tech Stack:** Java 21 / Spring Boot (existing hub), generic CloudEvents envelope, Spring SSE to browsers, Wijmo (WisMO) for grids, CEES entitlements, YAML kits under `products/`.

## Global Constraints

- Visual tokens from `FoboControlTower_V2.html`: navy `#002D5F`, cyan `#00AEEF`, page `#EEF2F7`, Manrope or IBM Plex. **REQUIRED:** `barclays-ib-console`.
- FOBO is the first `HELIX_RECON` kit, not the application name.
- Events are facts. Readiness is distinct keys. FAILED blocks. REVOKED withdraws. Downstream completions echo `runId`.
- LLM / Agent Analysis is advisory only — never in the fold.
- Feed-first: teams that cannot notify us — we subscribe to their topic.
- Wijmo is the only colleague grid. Do not add Recharts as the break viewer.
- Do not add gallery/magazine pages. Do not add a fourth view.

---

## Skill map by expected business outcome

Load **only** the skills for the outcome you are building.

| You are asked to… | Outcome kind | Skills |
|---|---|---|
| CATS↔MOTIF / Helix FOBO rec, books, aged breaks, post to MOTIF, unlock P&L | `HELIX_RECON` | `barclays-ib-console`, `colleague-view`, `register-outcome-kit`, `bind-source-destination`, `wijmo-outcome-grid` |
| 15C3 / IFRS official pack | `ENGINE_REPORT` | `barclays-ib-console`, `colleague-view`, `register-outcome-kit`, `bind-source-destination`, `wijmo-outcome-grid` |
| PnL / close pack as entitled grid | `GRID_PACK` | `barclays-ib-console`, `colleague-view`, `register-outcome-kit`, `wijmo-outcome-grid` |
| Book Unlocked / milestone only | `NOTIFY_MILESTONE` | `colleague-view`, `register-outcome-kit` |
| Add Motif/SAP/CATS/Castle feed or Helix/Axiom/FAS command | (any) | `engineering-view`, `bind-source-destination` |
| Unmapped row, lag, replay | (any) | `rtb-support-view`, `engineering-view` |
| New product with no new Java type | (any) | `register-outcome-kit`, `engineering-view` |

---

## File map (do not invent extra trees)

| Path | Responsibility |
|---|---|
| `products/_kit.schema.json` | Eight kit fields + `renderer` |
| `products/fobo/v1/product.yaml` | First HELIX_RECON (CATS/MOTIF/Helix/FAS) |
| `products/reg-15c3/v1/product.yaml` | ENGINE_REPORT |
| `products/pnl/v1/product.yaml` | GRID_PACK or NOTIFY_MILESTONE |
| `contracts/json-schema/generic-business-event.schema.json` | Envelope (exists) |
| `adapters/<source>-feed/` | Consume their topic |
| `platform/modules/hub` (today `onefinux-hub`) | Fold — product-agnostic |
| `experience/web/` | Three apps/routes: colleague, engineering, support |
| `.cursor/skills/*/SKILL.md` | Agent playbooks (this change) |

---

### Task 1: Kit schema + FOBO recon YAML

**Skills:** `register-outcome-kit`, `engineering-view`

**Files:**
- Create: `products/_kit.schema.json`
- Create: `products/fobo/v1/product.yaml`

**Produces:** A kit the hub can load as data. `renderer: HELIX_RECON`. Sources `CATS` (FEED), `MOTIF` (FEED), `MBR` (FEED). Destinations `HELIX` or `REC_FACTORY` (COMMAND), `FAS_MOTIF` (COMMAND), `PNL_AGENT` (NOTIFY).

- [ ] **Step 1:** Add `_kit.schema.json` with fields: `productId`, `domain`, `question`, `ingest[]`, `universe`, `sla`, `onReady`, `reports[]`, `cees`, `renderer`.
- [ ] **Step 2:** Add `products/fobo/v1/product.yaml` mapped from the sample recs (`R-1042` Rates, `R-1061` FX, `R-2031` Credit, Rec Factory Cash/Collateral) as **examples**, not as Java enums.
- [ ] **Step 3:** Hub loads kits from `products/**/product.yaml` with no FOBO type.
- [ ] **Step 4:** Commit `feat: register FOBO as HELIX_RECON kit data`

---

### Task 2: Colleague Control Tower (style of FoboControlTower_V2)

**Skills:** `barclays-ib-console`, `colleague-view`

**Files:**
- Create: `experience/web/` colleague routes (or restyle existing hub static only if experience/ is not started — prefer `experience/web`)
- Do not expand `docs/design/dreamliner/`

**Produces:** One entitled tower: rec cards, region chips (APAC/EMEA/AMER), book bars (auto / cleared / awaiting / blocked / not-open), pipeline stepper that **reads from the kit**, not hardcoded “Post to MOTIF” unless the kit says so.

- [ ] **Step 1:** Apply Barclays tokens; header shows product name + COB + region + env.
- [ ] **Step 2:** Card question comes from kit (`Can I execute this rec?`). Status words: Not yet / Blocked / Ready / Cleared / Unlocked.
- [ ] **Step 3:** IFRS/LCR absent if not entitled — no grey ghost cards.
- [ ] **Step 4:** Commit `feat: colleague tower using Barclays IB chrome`

---

### Task 3: Wijmo break / pack grid

**Skills:** `wijmo-outcome-grid`, `colleague-view`

**Files:**
- Create: `experience/web` Wijmo host component
- Modify: report locator fetch in hub/reports

**Produces:** Breaks table columns from producer JSON (sample: Book, Amount, Pattern, Rec, Status). Open disabled until outcome Done **and** federated ACL allow. No home-grown spreadsheet.

- [ ] **Step 1:** Bind Wijmo FlexGrid to Helix/MBR JSON after CEES + producer ACL.
- [ ] **Step 2:** Export CSV is a button, not a second product.
- [ ] **Step 3:** Commit `feat: Wijmo host for recon breaks and packs`

---

### Task 4: Source and destination adapters for FOBO path

**Skills:** `bind-source-destination`, `engineering-view`

**Files:**
- Create: `adapters/cats-feed/`, `adapters/motif-feed/`, `adapters/mbr-feed/` (or one `adapters/recon-feeds/` with three mappers)
- Modify: workflow command publisher for Helix + FAS

**Produces:** FEED readers watermark their topics. Mapper emits `onefinux.fact.v1`. Commands use `onefinux.command.v1` with `runId`. Completions echo `runId`.

- [ ] **Step 1:** Mapper table: CATS trade/cash → fact; MOTIF ledger → fact; MBR/RecFactory break file → fact.
- [ ] **Step 2:** Destinations: Helix analyse; FAS post; P&L notify. No SoR polling.
- [ ] **Step 3:** Commit `feat: CATS/MOTIF/MBR feeds and Helix/FAS commands`

---

### Task 5: Engineering view

**Skills:** `engineering-view`, `register-outcome-kit`

**Files:**
- Create: `experience/web` engineering routes (catalogue, kit editor, binding list)

**Produces:** List kits, ingest mode per source (PUSH/FEED/BOTH), schema version, command target. Submit for checker. No colleague break amounts on this view.

- [ ] **Step 1:** Read-only catalogue first.
- [ ] **Step 2:** Draft kit + checker (already specified).
- [ ] **Step 3:** Commit `feat: engineering catalogue for kits and bindings`

---

### Task 6: Run-the-bank support view

**Skills:** `rtb-support-view`

**Files:**
- Create: `experience/web` support routes
- Modify: hub dead-letter store

**Produces:** Unmapped rows (id, feed, offset, RFC 7807 why). Dual-control replay from watermark. Lag per feed. Entitlement `platform.support`.

- [ ] **Step 1:** Dead-letter table + hold/reject.
- [ ] **Step 2:** Replay requires second approver.
- [ ] **Step 3:** Commit `feat: RTB support dead letters and replay`

---

### Task 7: Second product without new Java

**Skills:** `register-outcome-kit`

**Files:**
- Create: `products/mec/v1/product.yaml` or `products/reg-15c3/v1/product.yaml`

**Produces:** Tower shows a second card from YAML only. If a developer adds `if (MEC)` the task has failed.

- [ ] **Step 1:** Add kit. Restart hub. Colleague sees new card when entitled.
- [ ] **Step 2:** Commit `feat: second product kit with no fold change`

---

## What we will not build

- Extra Dreamliner manifesto/gallery screens
- A FOBO Java module or FOBO-only React app name as the platform
- Kafka in the browser
- LLM inside readiness
- New chart library beside Wijmo for official packs
- Per-product skill files (`fobo-skill`, `15c3-skill`) — use the kind map above
