# Onboarding — create an outcome, inspect it, drive the day

This is the operator's checklist. Two paths: **create a live Outcome Engine definition** (the
business question), and **register a stitch console kit** (the human work). Index: `README.md`.

## A. Create a live business outcome (preferred)

On the console: **Onboarding** (`/onboarding`). The form is a business-outcome builder — question,
feeds, SLA, on-ready action. Submit calls `POST /api/outcomes/definitions`. The outcome appears
immediately on Configuration, Board and Reports for the selected COB.

```bash
curl -s -XPOST 'http://localhost:7070/api/outcomes/definitions?cobDate=2026-09-13' \
  -H 'Content-Type: application/json' -d '{
    "id": "MEC_CLOSE",
    "name": "Month-end close",
    "question": "Can I close the books?",
    "regions": ["GLOBAL"],
    "ownerGroup": "Financial Control",
    "sla": {"withinMinutes": 5},
    "dependencies": [
      {"eventType": "SAP_JOURNAL_POSTED", "sourceSystem": "SAP", "expectedCount": 12, "label": "SAP journals"},
      {"eventType": "COSTCENTRE_SIGNED", "sourceSystem": "SAP", "expectedCount": 8, "label": "Cost-centre sign-off"}
    ],
    "onReady": {"action": "NOTIFY_ONLY"}
  }'
```

Inspect it on **Configuration** (`/configuration`) — pick the outcome on the left. Drive the day
from **Drive** (`/drive`), not from Home or Reports.

## B. Register a stitch console kit

The rest of this note is the kit path (`REV-ACC → FOBO → CATS, MOTIF, MBR`). Every step is a real
API call against `onefinux-hub` (port 7070). No screen invents an id.

## 0. Prerequisites

```bash
# Terminal 1 — API only (do not open 7070 as the product UI)
./scripts/run.sh                     # hub 7070 + simulator 7081
# Terminal 2 — React console
cd frontend/web && npm install && npm run dev   # http://localhost:5173
```

The hub seeds `REV-ACC` + the `FOBO` kit + the two demo instances on first boot (Flyway in
`onefinux-hub`), so the console is populated immediately. The steps below are how you would
onboard a *second* unit or kit from scratch.

## 1. Add a group unit (tenant)

A group unit is the onboarding boundary and the CEES entitlement root.

```bash
curl -s http://localhost:7070/api/stitch/group-units          # list what exists
```

New units are seeded through the schema today; the config screen writes the same row. The CEES
resource (`groupUnit:REV-ACC`) is what entitlement is checked against.

## 2. Bind known sources of origin

Sources are picked from the catalog — config **cannot invent an origin**. The three FOBO origins are
already registered:

```bash
curl -s http://localhost:7070/api/stitch/sources
# CATS  (TRADE, FEED, cats.movements.v1)
# MOTIF (LEDGER, FEED, motif.book.lifecycle.v3)
# MBR   (BREAK, FEED, mbr.breaks.v2)
```

Each source already publishes a feed. The hub reads it and watermarks the offset — nobody rebuilds an
interface for us.

## 3. Register a kit (the product, as data)

A kit is the outcome recipe: its question, its sources, its destinations, its renderer, its user
actions. **Registering a kit adds no Java type.** Post one body:

```bash
curl -s -XPOST http://localhost:7070/api/stitch/kits \
  -H 'Content-Type: application/json' -d '{
    "kitId": "NOTIFY-EOD",
    "groupUnitId": "REV-ACC",
    "domain": "Rev Acc",
    "question": "Is the EOD milestone reached?",
    "renderer": "NOTIFY_MILESTONE",
    "userActions": "ACKNOWLEDGE",
    "ceesProduct": "product:NOTIFY-EOD",
    "slaCutoff": "20:00",
    "sources": [{"sourceId": "CATS", "required": true}],
    "destinations": [{"destId": "PNL_AGENT", "stepOrder": 1}],
    "embed": {"url": "https://helix.example/eod", "allowedOrigin": "https://helix.example", "chrome": "HOST"}
  }'
```

The hub writes `product_kit` + `kit_source` + `kit_destination` + `kit_embed`, and the kit appears on
the board with no code change. This is the proof that "products are data."

## 4. Set the partner embed

The `embed` block above records `kit_embed`. The partner copies
`frontend/theme/onefinux-tokens.css` and sets `data-ofx-embedded="1"`; we frame their screen, we do
not clone it. `allowedOrigin` is the CSP allowlist entry for the iframe.

## 5. Entitlement (CEES)

- **Local demo:** entitlement is fail-**open** — every seeded unit and kit is visible so the demo
  works without a CEES server.
- **Bank:** entitlement is fail-**closed**. An artefact the caller is not entitled to returns **404,
  not 403** (its existence is not disclosed). The contract is documented in
  `architecture-group.md` §7 and enforced at the `/api/stitch/instances` boundary.

## 6. Drive the outcome (simulator stub)

With the kit live, the simulator plays the systems of record:

```bash
curl -s -XPOST http://localhost:7070/api/stitch/reset          # instances -> NOT_YET, keys -> WAITING
curl -s -XPOST http://localhost:7081/sim/scenarios/fobo        # CATS/MOTIF/MBR facts
```

Watch the console: `R-1042` folds to **READY** (all three origins COMPLETED, Helix echoes
`RUN-A37C`) and `R-2031` folds to **BLOCKED** (MOTIF `MB014` FAILED, escalation `ESC-19`, dead letter
`DL-4402`). The bell shows both notifications and the activity feed updates live over SSE.

## 7. Verify

```bash
curl -s 'http://localhost:7070/api/stitch/instances?groupUnit=REV-ACC&cobDate=2026-09-12'
curl -s  http://localhost:7070/api/stitch/notifications
curl -s  http://localhost:7070/api/stitch/rtb
```

If a fact, a table row, or an event does not use the worked-example keys
(`R-1042`, `R-2031`, `RUN-A37C`, `MB014`, `ESC-19`, `DL-4402`), it is wrong — see the BRDs.
