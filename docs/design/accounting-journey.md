# Accounting operating journey

Controller job: investigate a blocked item, command an adjustment into the books, then dual sign-off — without hopping apps. One Finance stays the control plane. SAP / Motif keep the books.

## Intent

A material blocked amount is visible on the Board. Opening the row shows account, journal, amount, and FS line plus the Helix iframe. **Adjust** sends a `runId` command to FAS / Motif and waits for the echo. Owner **Sign off** records the maker. GLA **Countersign** (a different actor) clears the instance.

Subscribe, do not replace: the hub never posts journals itself. It commands. Destinations echo.

## What this is not

- Not a GL or workpaper OS
- Not `if (FOBO)` — verbs are kit `userActions`; accounting fields are event attributes
- Not a second product or a rebuilt Motif / Helix screen
- Not Kafka in the browser; not an LLM on the fold
- Drive remains the only scenario-button surface

## Kit data

FOBO `userActions` becomes `SIGN_OFF,POST,AMEND,ADJUST,COUNTERSIGN`.

| Verb | Behaviour |
|---|---|
| `ADJUST` | Rich: pending `command_run` dest `FAS_MOTIF`, HTTP command to the simulator FAS stub, workflow `ADJUST_REQUESTED`. Allowed on BLOCKED or READY. Echo completion flips the failed Motif key to COMPLETED so the fold can become READY. |
| `SIGN_OFF` | If the kit lists `COUNTERSIGN`: READY → `SIGNED`, store `signedBy`. Else READY → `CLEARED` (unchanged). |
| `COUNTERSIGN` | `SIGNED` only. Actor must differ from `signedBy`. Then `CLEARED`. |
| `AMEND` | Still generic (`WORKFLOW_AMEND` audit). |
| `POST` | Unchanged FAS post command. |

No new action endpoint. Console buttons come from the kit list. Dedicated labels for the rich verbs; remaining verbs stay generic.

## Accounting item grain

Inbound stitch facts may carry `account`, `journalId`, `amount`, `fsLine` in `attributes`. The fold copies those onto `outcome_instance` when present. Board and instance detail show them. Event lineage stays; this adds GL/journal lineage beside it.

Seeded blocked row `R-2031` carries a material amount so a room sees the figure before Drive.

## Status

Instance vocabulary: `NOT_YET | BLOCKED | READY | SIGNED | CLEARED | DELAYED`.

`SIGNED` is maker-complete, checker-open. Fold does not overwrite `SIGNED` or `CLEARED` unless a required key fails again.

## Dual control in the POC

Dev identities:

| User | Job |
|---|---|
| `alice.revacc` | Owner / controller — Sign off |
| `gla.reviewer` | GLA — Countersign |
| `praveen.kumar` | Superuser (default when no token) |

The console **Act as** control mints `/api/auth/dev-token` and sends `Authorization: Bearer`. Same actor cannot countersign their own sign-off.

## Drive

`/drive` gains **Accounting item**. Reset first. The scenario publishes CATS / MBR completed and Motif `LEDGER_REJECTED` on `R-2031` with accounting attributes. Then: Board amount → instance → Adjust → echo READY → Act as owner Sign off → Act as GLA Countersign → CLEARED.

## Files

| Area | Change |
|---|---|
| Flyway `V6__accounting_item.sql` | Instance columns; FOBO verbs; seed amount on `R-2031` |
| `StitchService` | Rich `ADJUST` / `COUNTERSIGN`; `SIGN_OFF` branches on kit verbs |
| `StitchFold` | Copy accounting attributes; complete `command_run` on `runId` echo; hold `SIGNED`/`CLEARED` |
| `StitchRepository` | Columns on instance list/detail; complete command by `run_id`; `signed_by` |
| Simulator | `/fas/adjust` echo; Drive `accounting` scenario |
| Console | Amount on Board/Home; instance accounting panel; Adjust / Countersign; Act as |
| Spec | REQ-ACTION-011..013; REQ-FOLD-005; REQ-CONSOLE-013 |

## Demo path (room)

1. Drive → Reset, then Accounting item.
2. Board: EMEA FOBO blocked, amount visible.
3. Open the row: account `410000`, journal `JE-8801`, amount, FS line. Click a feed for history. Open partner screen in this page (iframe).
4. Adjust — command `runId`, Motif echo, fold READY (instance page follows the echo; no reload).
5. Act as Alice → Sign off → `SIGNED`.
6. Act as GLA reviewer → Countersign → `CLEARED`.
