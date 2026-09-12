# Outcome platform master plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Load the skill named on the task before writing code.

**Goal:** One Finance UX is the umbrella and theme source. Other teams build heavy screens, copy `onefinux-tokens.css`, and we iframe them. Heads, users, RTB, and config stay in the shell.

**Architecture:** Group unit + product kit + four user jobs. Renderers: `HELIX_RECON`, `ENGINE_REPORT`, `GRID_PACK`, `NOTIFY_MILESTONE`, `ANALYST_VIEW`. SoRs stay SoRs. No `if (FOBO)`. No per-report React apps.

**Tech Stack:** Java 21 hub, CloudEvents envelope, SSE to browsers, **licensed Wijmo** (FlexGrid, Pivot, FlexChart), CEES, YAML under `groupUnits/` and `products/`.

## Global Constraints

- Visual: Control Tower V2 — navy `#002D5F`, cyan `#00AEEF`. **REQUIRED:** `barclays-ib-console`.
- Four jobs only: head, outcome user, RTB, config/onboarding.
- Agents run; users sign off / post. Heads do not post.
- Wijmo is the only grid/pivot/chart. Company licence. No Recharts for official views.
- **Sources of origin first.** Analyst exploration of those sources, inside the group unit, is a **later** slice — do not build the studio in Tasks 1–8.
- Heavy UIs are **partner iframes**, not cloned in this repo.
- Theme file `experience/theme/onefinux-tokens.css` is what other teams copy.
- Feed-first ingest. LLM never in the fold.
- Do not add manifesto/gallery screens.

---

## Skill map

| Ask | Skills |
|---|---|
| Head board for a group unit | `barclays-ib-console`, `bu-head-view` |
| Helix FOBO sign-off / post | `colleague-view`, `wijmo-outcome-grid`, `register-outcome-kit`, `bind-source-destination` |
| 15C3 / IFRS open pack | `colleague-view`, `wijmo-outcome-grid`, `register-outcome-kit` |
| Delays / escalations | `rtb-support-view` |
| Onboard a group unit + outcomes | `engineering-view`, `register-outcome-kit` |
| New CATS/MOTIF/SAP/Helix/FAS binding | `bind-source-destination`, `engineering-view` |
| BA grid / pivot / chart on a dataset | `wijmo-outcome-grid`, `engineering-view` |
| Iframe Helix/Axiom (or any partner) screen | `embed-partner-screen`, `barclays-ib-console` |

---

## File map

| Path | Responsibility |
|---|---|
| `groupUnits/<id>.yaml` | Tenant: name, CEES, default region |
| `products/_kit.schema.json` | Kit + `groupUnitId` + `userActions` + `renderer` |
| `products/fobo/v1/product.yaml` | First HELIX_RECON |
| `experience/web/` | Four route trees: head, user, support, config + iframe host |
| `experience/theme/onefinux-tokens.css` | Theme other teams copy |
| `adapters/<source>-feed/` | Their existing feed |
| `onefinux-hub` | Fold — no product types |

---

### Task 1: Group unit + kit schema + FOBO YAML

**Skills:** `register-outcome-kit`, `engineering-view`

- [ ] **Step 1:** `groupUnits/rev-acc.yaml` (example).
- [ ] **Step 2:** Kit schema includes `groupUnitId`, `userActions`, `renderer`.
- [ ] **Step 3:** `products/fobo/v1/product.yaml` — userActions sign-off + post; sources CATS/MOTIF/MBR; dest Helix + FAS.
- [ ] **Step 4:** Hub loads YAML with no FOBO Java type.
- [ ] **Step 5:** Commit `feat: group unit and FOBO kit as data`

---

### Task 2: Outcome-user shell + partner iframe host

**Skills:** `barclays-ib-console`, `colleague-view`, `embed-partner-screen`

- [ ] **Step 1:** User tower: entitled outcomes for their unit.
- [ ] **Step 2:** Ready view: kit `embed.url` iframe (allowlisted origin + context). Sign off / Post from kit or child `postMessage`. No analyst studio.
- [ ] **Step 3:** Serve `/theme/onefinux-tokens.css` for partners.
- [ ] **Step 4:** Blocked: named key above the frame.
- [ ] **Step 5:** Commit `feat: outcome shell and partner iframe host`

---

### Task 3: Record source of origin (catalog stub only)

**Skills:** `bind-source-destination`, `engineering-view`

- [ ] **Step 1:** Register each known source (id, system, topic/mode, groupUnit). No explorer UI.
- [ ] **Step 2:** Commit `feat: source-of-origin catalog without analyst studio`

---

### Task 4: Source / destination adapters (FOBO path)

**Skills:** `bind-source-destination`

- [ ] **Step 1:** FEED mappers for CATS, MOTIF, MBR → `onefinux.fact.v1`.
- [ ] **Step 2:** Commands Helix + FAS; completion echoes `runId`.
- [ ] **Step 3:** Commit `feat: FOBO path feeds and commands`

---

### Task 5: Config / onboarding screens

**Skills:** `engineering-view`

- [ ] **Step 1:** Onboard group unit, bind known sources, register kit + embed.url.
- [ ] **Step 2:** Maker-checker. No BA explorer.
- [ ] **Step 3:** Commit `feat: group-unit onboarding for known sources`

---

### Task 6: BU head board

**Skills:** `bu-head-view`

- [ ] **Step 1:** Outcome list + status + SLA + escalation counts for the unit.
- [ ] **Step 2:** No post, no grid. Drill only if also a user.
- [ ] **Step 3:** Commit `feat: group-unit head outcome board`

---

### Task 7: RTB delays and escalations

**Skills:** `rtb-support-view`

- [ ] **Step 1:** Delay queue + escalation queue + dead letters.
- [ ] **Step 2:** Dual-control replay.
- [ ] **Step 3:** Commit `feat: RTB delays and escalations`

---

### Task 8: Second unit or product without new Java

**Skills:** `register-outcome-kit`

- [ ] **Step 1:** Add `products/reg-15c3` or a second `groupUnits/` + kit.
- [ ] **Step 2:** Head and user see it only if entitled. No `if (15C3)` in code.
- [ ] **Step 3:** Commit `feat: second kit with no fold change`

---

### Task 9 (later): Analyst explores data in the group unit

**Skills:** `wijmo-outcome-grid`

Do not start until sources of origin are live and a unit asks to explore.

- [ ] **Step 1:** Analyst job, CEES `groupUnit` + `dataset.read` on **already bound** origins only.
- [ ] **Step 2:** Wijmo FlexGrid / Pivot / Chart on those locators. Save view def.
- [ ] **Step 3:** New source still goes through config first — explorer cannot invent origin.
- [ ] **Step 4:** Commit `feat: group-unit analyst explorer on known sources`

---

## What we will not build now

- A FOBO application or FOBO Maven module
- One React report per analyst request
- A second Tableau/SAP BI estate
- Kafka in the browser
- LLM on the readiness path
- Per-product skills
