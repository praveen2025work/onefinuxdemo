---
name: colleague-view
description: Use when building screens for reconcilers, Revenue Accounting, Product Control, or reg reporting — Control Tower, rec cockpit, breaks, My Reports, inbox, Barclays Now. Not for kit YAML, dead letters, or adapter code.
---

# Colleague view

The user answers **one entitled question** for this COB: Can I run this outcome? Not yet / Blocked / Ready / Cleared / Unlocked.

## Surfaces

1. **Tower** — one card per entitled outcome (sample: CATS vs MOTIF Rates/FX/Credit, Rec Factory Cash).
2. **Cockpit** — kit pipeline (FOBO sample: Ingest → Agent Analysis → Post to MOTIF → Notify P&L). Steps come from the kit.
3. **Grid** — Wijmo of producer rows (Book, Amount, Pattern, Rec, Status).
4. **Inbox / Now** — we notify; sources do not.

## Rules

- Name the missing thing (BATCH-03, 20 Motif books, aged break). Never “in progress”.
- Entitled emptiness: no card, not a greyed 15C3.
- Agent Analysis text is advisory. It does not change readiness.
- Post / Open stay disabled until Ready/Cleared **and** CEES + federated ACL allow.
- Same chrome for every renderer. **REQUIRED:** `barclays-ib-console`.

## Do not

- Show watermarks, dead letters, or kit diffs here
- Fork a FOBO-only page tree
---
