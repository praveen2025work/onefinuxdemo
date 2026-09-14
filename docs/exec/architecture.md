# One Finance UX — Architecture Diagrams

Proper, source-controlled **Mermaid** diagrams. They render natively on GitHub (below), and are also exported to crisp **SVG** (scalable, for slides) and **PNG** (2×) under [`diagrams/`](./diagrams). Edit the `.mmd` source and re-run [`render.sh`](./diagrams/render.sh) to regenerate.

These diagrams match the as-built product: `frontend/web`, the two models (Outcome Engine + stitch kit), the live console routes, and the `ActionExecutor` registry. Static HTML under `docs/design/mockups/` and `docs/design/dreamliner/` is the earlier visual reference, not the live console.

| # | Diagram | Source | Exports |
|---|---|---|---|
| 1 | Enterprise integration context | [`01-enterprise-context.mmd`](./diagrams/01-enterprise-context.mmd) | [svg](./diagrams/01-enterprise-context.svg) · [png](./diagrams/01-enterprise-context.png) |
| 2 | Deployment / containers | [`02-deployment-containers.mmd`](./diagrams/02-deployment-containers.mmd) | [svg](./diagrams/02-deployment-containers.svg) · [png](./diagrams/02-deployment-containers.png) |
| 3 | End-to-end event sequence | [`03-event-sequence.mmd`](./diagrams/03-event-sequence.mmd) | [svg](./diagrams/03-event-sequence.svg) · [png](./diagrams/03-event-sequence.png) |
| 4 | Data model (ER) | [`04-data-model.mmd`](./diagrams/04-data-model.mmd) | [svg](./diagrams/04-data-model.svg) · [png](./diagrams/04-data-model.png) |
| 5 | Stitch kit state machine | [`05-outcome-state.mmd`](./diagrams/05-outcome-state.mmd) | [svg](./diagrams/05-outcome-state.svg) · [png](./diagrams/05-outcome-state.png) |
| 6 | Outcome Engine stages | [`06-engine-stage.mmd`](./diagrams/06-engine-stage.mmd) | [svg](./diagrams/06-engine-stage.svg) · [png](./diagrams/06-engine-stage.png) |

---

## 1. Enterprise integration context

How One Finance UX sits over an unchanged estate: sources publish facts through the edge/gateway onto the event bus; the runtime plane persists, translates, folds, acts, propagates and audits; the control plane governs; the entitled console is `frontend/web`.

```mermaid
flowchart TB
  classDef sor fill:#f4f7fa,stroke:#9fb3c6,color:#243b4d;
  classDef edge fill:#fff7e8,stroke:#d0a24a,color:#5a4412;
  classDef run fill:#eaf3fb,stroke:#2b6ea3,color:#0b2f4a;
  classDef store fill:#eef7f0,stroke:#3f9d63,color:#12492a;
  classDef down fill:#effaf3,stroke:#2f9d67,color:#0e5a37;
  classDef ux fill:#eef0fb,stroke:#5b5fb0,color:#23255e;
  classDef ctrl fill:#faf0f6,stroke:#a8508a,color:#5c2049;

  subgraph SOR["Systems of record — unchanged (publish facts)"]
    direction LR
    Motif["Motif / FO books"]
    CATS["CATS"]
    MBR["MBR"]
    Helix["Helix FOBO"]
    RAMP["RAMP Chorus"]
    SAP["SAP TB"]
    GMIS["GMIS"]
    Castle["US Castle"]
    FinStore["Finance Store"]
    Axiom["Axiom"]
  end

  subgraph EDGE["Edge"]
    GW["Event gateway<br/>schema registry"]
    ADP["Legacy adapters<br/>CDC / MQ / file"]
  end

  BUS[("Enterprise event bus")]

  subgraph CTRL["Control plane — Admin governed"]
    ADMIN["Admin / first-instance UI"]
    REG[("Outcome + event + route registry")]
    MK["Maker–checker"]
  end

  subgraph RUN["Runtime plane"]
    HUB["Event Hub<br/>idempotent · append-only · replay"]
    XL["Translation<br/>identity graph"]
    ENG["Outcome engine<br/>deterministic fold"]
    WF["Workflow<br/>ActionExecutor registry"]
    OBX["Outbox relay"]
    NTF["Notification service"]
    ENT["Entitlement gateway (CEES)"]
  end

  subgraph DATA["Durable state — append-only"]
    ES[("event_store")]
    OB[("event_outbox")]
    AUD[("audit_log")]
  end

  subgraph DOWN["Downstream subscribers"]
    ARC["Archive store"]
    FS["Finance Store"]
    PNL["P&L feed"]
  end

  subgraph UX["Experience plane — entitled frontend/web"]
    CONSOLE["Onboarding · Configuration · Drive<br/>Reports · Board · My outcomes<br/>Operations · Monitoring"]
  end

  Motif --> GW
  CATS --> GW
  MBR --> GW
  Helix --> GW
  RAMP --> GW
  SAP --> GW
  GMIS --> GW
  Castle --> ADP
  FinStore --> ADP
  Axiom --> ADP
  ADP --> GW
  GW --> BUS
  BUS --> HUB
  HUB --> XL
  XL --> ENG
  ENG --> WF
  WF -->|command| Helix
  WF -->|command| Axiom
  HUB --> ES
  HUB --> OBX
  OBX --> OB
  OBX -->|CloudEvents 1.0| ARC
  OBX -->|CloudEvents 1.0| FS
  OBX -->|CloudEvents 1.0| PNL
  ENG --> NTF
  ENG -. audit .-> AUD
  WF -. audit .-> AUD
  ADMIN --> REG
  REG --> ENG
  REG --> WF
  REG --> ENT
  ENG --> CONSOLE
  ENT --> CONSOLE
  HUB --> CONSOLE
  OBX --> CONSOLE
  AUD --> CONSOLE
  CONSOLE --> HUB

  class Motif,CATS,MBR,Helix,RAMP,SAP,GMIS,Castle,FinStore,Axiom sor
  class GW,ADP edge
  class HUB,XL,ENG,WF,OBX,NTF,ENT run
  class ES,OB,AUD store
  class ARC,FS,PNL down
  class CONSOLE ux
  class ADMIN,REG,MK ctrl
```

---

## 2. Deployment / containers

The three deployables in the POC and how they talk. Persistence is H2 (file) for the POC and Oracle 19c in production. The console lives in `frontend/web`.

```mermaid
flowchart LR
  classDef app fill:#eaf3fb,stroke:#2b6ea3,color:#0b2f4a;
  classDef web fill:#eef0fb,stroke:#5b5fb0,color:#23255e;
  classDef sim fill:#fff7e8,stroke:#d0a24a,color:#5a4412;
  classDef store fill:#eef7f0,stroke:#3f9d63,color:#12492a;

  subgraph WEB["frontend/web · React 18 + Vite · :5173"]
    UI["Console SPA<br/>onboard · config · drive · reports<br/>board · outcomes · ops · monitoring"]
    SSE["SSE client /api/stream"]
  end

  subgraph HUB["onefinux-hub · Spring Boot 3.5 / Java 21 · :7070"]
    direction TB
    EAPI["EventController<br/>POST /api/events"]
    OAPI["OutcomeController<br/>GET/POST /api/outcomes"]
    SAPI["StitchController<br/>/api/stitch/*"]
    MAPI["MonitorController<br/>/api/stitch/monitor/*"]
    CORE["Outcome engine · ActionExecutor<br/>translation · workflow · outbox"]
    STR["StreamHub (SSE broadcast)"]
  end

  subgraph SIM["source-simulator · Spring Boot · :7081"]
    SCEN["Scenario drivers<br/>FOBO · 15C3 · PnL"]
    SINK["/sim/sink<br/>downstream receiver"]
  end

  DB[("Persistence<br/>H2 file (POC) → Oracle 19c (prod)")]

  UI -->|REST /api, /sim| EAPI
  UI -->|REST| OAPI
  UI -->|REST| SAPI
  UI -->|REST| MAPI
  SSE -->|events| STR
  SCEN -->|POST facts| EAPI
  CORE -->|HTTP command| SCEN
  CORE -->|CloudEvents POST| SINK
  EAPI --> CORE
  OAPI --> CORE
  SAPI --> CORE
  MAPI --> CORE
  CORE --> DB
  CORE --> STR

  class UI,SSE web
  class EAPI,OAPI,SAPI,MAPI,CORE,STR app
  class SCEN,SINK sim
  class DB store
```

---

## 3. End-to-end event sequence

A fact's full journey — receive → translate → fold → act (`ActionExecutor`) → propagate (outbox) → audit → notify. No polling anywhere.

```mermaid
sequenceDiagram
  autonumber
  participant SRC as Source (Motif/CATS/MBR)
  participant HUB as Event Hub
  participant XL as Translation
  participant ENG as Outcome Engine
  participant WF as ActionExecutor
  participant HX as Helix
  participant OBX as Outbox Relay
  participant DWN as Downstream (Archive/FinStore/PnL)
  participant AUD as Audit Log
  participant UX as frontend/web (SSE)

  SRC->>HUB: publish fact (idempotent on eventId)
  HUB->>XL: translate source key to business id
  XL->>ENG: business event (correlated to outcome)
  ENG->>ENG: deterministic fold to READY
  HUB-)OBX: enqueue outbox rows (one per matching route)
  OBX->>DWN: POST CloudEvents 1.0 (at-least-once)
  DWN-->>OBX: 2xx (subscriber de-dupes on eventId)
  ENG->>WF: onReady.action (HTTP_COMMAND / LOG_COMMAND)
  WF->>HX: command run analysis (+ callback url)
  HX->>HUB: echo HELIX_ANALYSIS_COMPLETE (RUN-A37C)
  ENG-->>UX: outcome state via SSE
  Note over UX,ENG: controller reviews and signs off
  UX->>ENG: POST /api/stitch/instance/action
  ENG->>AUD: append audit (who / when / what / why)
  ENG-->>UX: notification via SSE
```

---

## 4. Data model (ER)

The append-only spine plus the as-built stitch kit (`kit_destination`, `kit_embed`, `readiness_key`) and the engine board snapshot (`outcome_projection`).

```mermaid
erDiagram
  GROUP_UNIT ||--o{ PRODUCT_KIT : "contains"
  GROUP_UNIT ||--o{ SOURCE_SYSTEM : "binds"
  GROUP_UNIT ||--o{ DESTINATION_SYSTEM : "binds"
  PRODUCT_KIT ||--o{ KIT_SOURCE : "requires"
  PRODUCT_KIT ||--o{ KIT_DESTINATION : "targets"
  PRODUCT_KIT ||--|| KIT_EMBED : "embeds"
  PRODUCT_KIT ||--o{ OUTCOME_INSTANCE : "produces"
  SOURCE_SYSTEM ||--o{ EVENT_STORE : "publishes"
  OUTCOME_INSTANCE ||--o{ EVENT_STORE : "correlates"
  OUTCOME_INSTANCE ||--o{ READINESS_KEY : "folds"
  OUTCOME_INSTANCE ||--o{ ESCALATION : "raises"
  SOURCE_SYSTEM ||--o{ DEAD_LETTER : "quarantines"
  EVENT_ROUTE ||--o{ EVENT_OUTBOX : "governs"
  EVENT_STORE ||--o{ EVENT_OUTBOX : "fans out"
  GROUP_UNIT ||--o{ OUTCOME_PROJECTION : "engine board"

  EVENT_STORE {
    string event_id PK
    string event_type
    string source_system
    string source_key
    date   cob_date
    string region
    string status
    string instance_id FK
    timestamp received_at
  }
  OUTCOME_INSTANCE {
    string instance_id PK
    string kit_id FK
    string slice_key
    string region
    string status
    timestamp updated_at
  }
  READINESS_KEY {
    string instance_id FK
    string source_id FK
    string source_key
    string key_status
  }
  KIT_EMBED {
    string kit_id PK
    string embed_url
    string allowed_origin
  }
  OUTCOME_PROJECTION {
    string instance_key PK
    string outcome_id
    string status
    date   cob_date
  }
  EVENT_ROUTE {
    string route_id PK
    string subscriber
    string event_type
    string source_id
    string target_url
    char   enabled
  }
  EVENT_OUTBOX {
    string outbox_id PK
    string event_id FK
    string route_id FK
    string subscriber
    string status
    int    attempts
    timestamp created_at
  }
  AUDIT_LOG {
    bigint id PK
    timestamp at
    string actor
    string action
    string resource
    string decision
  }
```

---

## 5. Stitch kit state machine

Human work on a console kit instance (`outcome_instance.status`). Sign-off, publish and escalate are audited; upstream restatement revokes readiness.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> NOT_YET
  NOT_YET --> DELAYED: past SLA, keys pending
  NOT_YET --> READY: all keys complete
  NOT_YET --> BLOCKED: a key failed
  DELAYED --> READY: keys complete
  DELAYED --> BLOCKED: a key failed
  BLOCKED --> READY: dead letter replayed / re-run
  READY --> CLEARED: sign-off (audited)
  CLEARED --> POSTED: publish (audited)
  READY --> ESCALATED: raised to RTB (audited)
  BLOCKED --> ESCALATED: raised to RTB (audited)
  READY --> REVOKED: upstream restated
  POSTED --> [*]
  REVOKED --> NOT_YET: re-open
```

---

## 6. Outcome Engine stages

Derived `stage` on an engine outcome (`OutcomeInstance.stage()`). Report-like completions with a `reportId` become `AVAILABLE`; otherwise `GENERATED`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> NOT_STARTED
  NOT_STARTED --> FEEDS: first matching fact
  FEEDS --> READY: all feeds complete
  FEEDS --> BLOCKED: a feed failed
  BLOCKED --> FEEDS: feed recovered
  READY --> PROCESSING: ActionExecutor runs
  PROCESSING --> GENERATED: completion, no reportId
  PROCESSING --> AVAILABLE: completion with reportId
  PROCESSING --> FAILED: action failed
  FAILED --> PROCESSING: re-run workflow
  GENERATED --> [*]
  AVAILABLE --> [*]
```
