# Four jobs under One Finance UX

**Status:** proposed  
**Source of visual truth:** `FoboControlTower_V2.html` (Barclays navy `#002D5F`, cyan `#00AEEF`)  
**Umbrella:** One Finance UX. Group units onboard their own outcomes. We do not staff 1000 UI developers to draw reports.

One Finance is the **shell and design system**. Heavy screens are built by **other teams** and **iframed** in. Everyone copies one theme so the bank looks like one product.

---

## 1. Four jobs (not three)

| Job | Who | What they do | What they do **not** do |
|---|---|---|---|
| **Business-unit head** | MD / BU lead | Track **outcomes** for their group unit: Ready / Blocked / Delayed / Escalated. Counts and SLA. | Open a rec, post to MOTIF, edit kits, read dead-letter payloads |
| **Outcome user** | Reconciler, PC, Rev Acc, reg reporter | Agents already ran (Helix FOBO, Axiom, …). User opens the **ready output**, **signs off** or **posts**. | Configure sources, author new pivots for the group, chase Kafka offsets |
| **Run-the-bank support** | L2/L3 ops | **Delays** (lag, aged, SLA breach) and **escalations**. Replay with dual control. | Sign off a break, publish a kit, invent match rules |
| **Config / onboarding** | Outcome-config + platform + BA | Onboard a **group unit**, bind sources, register outcomes, publish **Wijmo grid / pivot / chart** defs when a dataset exists | Perform the user’s COB sign-off; write a one-off React report |

CEES scopes every job: `groupUnit:{id}`, `product:{id}`, `outcome:*`, `report:*`, `platform.support`, `platform.config`. Fail closed. Support and config are **not** tabs on the user’s rec.

---

## 2. Group unit (the SAP/Tableau tenant)

A **group unit** is the onboarding boundary (Revenue Accounting, Product Control, Markets Ops, …).

| It owns | How |
|---|---|
| Set of business outcomes | Kits published into that unit |
| Entitled people | CEES groups bound at `groupUnit` + product |
| Dataset catalog | Locators the fold or a source already produced |
| Wijmo workspace | FlexGrid, Pivot, FlexChart **definitions** (not new apps) |

Onboard a new unit = register the unit + sources + kits + datasets. The shell does not fork. FOBO Helix is one outcome inside one unit, not the platform.

Dimensions already in the platform (still generic): **group unit**, product, outcome instance, COB, region, slice, source, destination, renderer, entitlement.

---

## 3. Outcome user — sign-off / post (Helix FOBO shape)

Pipeline is kit-defined. Sample FOBO: Ingest → Agent Analysis → **output ready** → user **signs off or posts to MOTIF (FAS)** → Notify P&L.

Rules:

- Agents / engines **run the job**. The user does not re-run Helix to “see if it worked”.
- Sign-off and Post stay disabled until the instance is Ready/Cleared **and** CEES + federated ACL allow.
- Named blocker if not ready. Never “in progress”.
- Agent commentary is advisory. It is not a fact and not a substitute for sign-off.

---

## 4. Business-unit head — outcomes only

One page per entitled group unit (or roll-up if they own several):

- Outcome name + renderer + status word + SLA / delay flag + escalation count
- No book grid, no Motif post button, no YAML

Drill **stops** at “open the outcome” only if they also hold the user entitlement. Head role alone is traffic lights.

---

## 5. Run-the-bank — delays and escalations

| Signal | Meaning |
|---|---|
| Delay | Feed lag, aged break, SLA miss, Helix/Axiom not complete for `runId` |
| Escalation | Support or user raised; or auto from agedRuns / failed key |
| Dead letter | Unmapped feed row — RFC 7807, dual-control replay |

Not a colleague rec. Not a config studio.

---

## 6. Config / onboarding — enable the analyst, not a UI factory

When a **data source is provided** (feed mapped or locator registered), a business analyst in that group unit composes:

- **FlexGrid** — breaks, packs, lists (Helix FOBO columns, 15C3 lines)
- **Pivot** — dimensions the dataset already has (book, region, product, COB, pattern)
- **Chart** — Wijmo FlexChart on the same dataset

These are **saved view definitions** (name, dataset id, widget type, field map, CEES `report:*`). They are not new React routes and not a second Tableau estate.

Company **already has a Wijmo licence**. Use it. Do not add Recharts/Highcharts for official views. Do not hire a squad per report.

Config screens (maker-checker):

1. Onboard group unit  
2. Bind source / destination  
3. Register outcome kit (`renderer` + pipeline steps)  
4. Register dataset locator  
5. BA publishes grid / pivot / chart bound to that locator  

Platform engineers still own adapters and the fold. BAs do not write Java.

Heavy product UIs (Helix FOBO Control Tower, Axiom pack) are **not** rebuilt here. Partner teams ship those apps, import `experience/theme/onefinux-tokens.css`, and we iframe them (section 7).

---

## 7. Federated screens (iframe + shared theme)

Workload is distributed. Design is not.

| One Finance UX owns | Partner team owns |
|---|---|
| Four jobs’ chrome, cards, config, RTB | Helix FOBO body, Axiom viewer, Rec Factory, … |
| Theme tokens (`/theme/onefinux-tokens.css`) | Import tokens; no second masthead |
| Kit `embed.url` + `allowedOrigin` | Their deployable URL |
| CEES gate before the frame is shown | Their own ACL on the framed app |

Context into the iframe: `groupUnitId`, `productId`, `outcomeId`, `cobDate`, `region`, `runId`, `theme=ofx`.  
Events out (postMessage, allowlisted origin): height, signedOff, posted, escalate.

If there is **no** partner screen, use the in-shell Wijmo host (BA views, simple packs). Do not staff One Fin developers to clone Helix.

---

## 8. Outcome kinds

| Kind | User action when ready | Head sees |
|---|---|---|
| `HELIX_RECON` | Sign off / post (FOBO sample) | Recs cleared vs blocked vs delayed |
| `ENGINE_REPORT` | Open pack, sign official | Pack ready / blocked |
| `GRID_PACK` | Open Wijmo / export | Pack ready |
| `NOTIFY_MILESTONE` | Ack inbox / Now | Milestone sent |
| `ANALYST_VIEW` | Open saved grid/pivot/chart | Optional — only if published as an outcome |

`ANALYST_VIEW` is a kit whose on-ready is NOTIFY (dataset landed). Same host as other Wijmo views.  
Any kind may set `embed.url` instead of (or beside) an in-shell Wijmo view.

---

## 9. Entities

| Entity | Purpose |
|---|---|
| Group unit | Tenant for outcomes + Wijmo workspace |
| Product kit | Question, ingest, universe, SLA, on-ready, reports, CEES, renderer, `groupUnitId`, optional `embed` |
| Partner embed | Allowlisted URL + origin; framed when entitled |
| Source / destination binding | Read their feed; command Helix/Axiom/FAS |
| Outcome instance | COB + region + slice |
| Dataset | Entitled locator (Helix JSON, Axiom pack, mapped feed) |
| Wijmo view def | Grid / pivot / chart on a dataset |
| Escalation | Delay or human raise, visible to RTB and (count only) to the head |
| Dead letter | Unmapped row |

---

## 10. Skills

| Skill | Load when |
|---|---|
| `barclays-ib-console` | Any UI |
| `bu-head-view` | Head / group-unit outcome board |
| `colleague-view` | Sign-off / post user |
| `rtb-support-view` | Delays, escalations, replay |
| `engineering-view` | Config, onboarding, adapters |
| `bind-source-destination` | New source or destination |
| `wijmo-outcome-grid` | FlexGrid, Pivot, Chart, BA authoring |
| `register-outcome-kit` | New outcome or group-unit kit |
| `embed-partner-screen` | Iframe host + theme for other teams |

Master plan: `docs/superpowers/plans/2026-09-12-outcome-platform-master-plan.md`.

## 11. Visual tokens

Unchanged: navy `#002D5F`, cyan `#00AEEF`, page `#EEF2F7`, card white, Manrope or IBM Plex. Copy Control Tower V2, not magazine chrome.
