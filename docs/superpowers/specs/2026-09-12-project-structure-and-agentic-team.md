# One Finance UX — Project structure and agentic multi-developer setup

**Status:** proposed  
**Date:** 2026-09-12  
**Companion to:** enterprise design + flagship architecture  
**Sources:** contract-first Maven monorepo practice (OpenAPI + AsyncAPI, extractable services); Cursor agent best practices (Rules vs Skills, worktrees); team skill-pack governance (`AGENTS.md` + `SKILL.md` + CODEOWNERS); agentskills.io

This answers two questions: **where does each component live**, and **how do many engineers plus coding agents work without forking the platform into a FOBO app**.

---

## 1. Recommendation: one monorepo, contract-first, extract later

| Option | When it wins | Why we do not start here |
|---|---|---|
| **Many repos (one per service)** | Separate platform / domain / experience orgs with independent release trains | Premature. Contracts drift, agents cannot see the fold and the kit in one checkout, the pilot dies in glue. |
| **One repo, one fat JAR forever** | Demo only | Cannot CODEOWN or CI-scope. Agents rewrite the hub for a new product. |
| **One monorepo, modules that *can* become services** | Strategic pilot → bank platform | **Chosen.** One version, one contract folder, one skill library. Runtime split is a later extract, not a day-one tax. |

Industry pattern (2025–26 Maven / Spring blueprints): parent POM + `services/` + `libs/` + **OpenAPI / AsyncAPI as the first-class contract**, each module independently deployable *when needed*. Keep the blueprint extractable; do not split Git until a module has its own SLA and on-call.

**Hard rule:** product kits (`FOBO`, `15C3`, `MEC`, …) are **data under `products/`**, never Java modules named `fobo-service`.

---

## 2. Target tree (maps 1:1 to architecture components)

```
onefinux/                          # this repository, grown in place
├── contracts/                     # SOURCE OF TRUTH — no business logic
│   ├── asyncapi/                  # bus: facts, commands, workflow, notify, advisory
│   ├── openapi/                   # REST: outcomes, catalog, admin, reports
│   ├── json-schema/               # generic-business-event.schema.json (already here)
│   └── examples/
│
├── products/                      # BUSINESS KINDS — YAML/JSON only
│   ├── _kit.schema.json           # the eight kit fields
│   ├── fobo/v1/product.yaml
│   ├── reg-15c3/v1/product.yaml
│   ├── pnl/v1/product.yaml
│   ├── mec/v1/product.yaml        # month-end — added with no Java change
│   └── README.md                  # “how to add a product”
│
├── platform/                      # Java 21 — the airframe
│   ├── pom.xml                    # parent + BOM
│   ├── libs/
│   │   ├── events/                # generated types from contracts (never hand-edited)
│   │   ├── entitlements/          # CEES client + fail-closed policy
│   │   └── observability/         # correlationId, runId, structured logs
│   └── modules/                   # compile independently; one or few deployables in pilot
│       ├── gateway/               # Event Gateway: mTLS, schema, idempotent id
│       ├── hub/                   # Event store + translation + fold + snapshot + outbox
│       ├── workflow/              # Command dispatcher / saga by runId
│       ├── notification/          # inbox, email, Teams, Barclays Now
│       ├── reports/               # locator fetch, Wijmo/template assembly
│       ├── registry/              # Admin API: catalogue, kits, maker-checker
│       └── app/                   # Pilot composition root (wires modules in one JVM)
│
├── frontend/                    # HUMAN EDGE — separate from fold
│   ├── web/                       # Control Tower, cockpit, My Reports, Admin UI
│   └── now/                       # Barclays Now task payload mapper (thin)
│
├── adapters/                      # FEED READERS + stranglers — we consume *their* bus
│   ├── motif-feed/                # subscribe to Motif’s existing topic
│   ├── sap-feed/
│   ├── helix-sim/                 # today’s source-simulator (PUSH for demo)
│   └── file-drop/
│
├── advisory/                      # LLM explainer — isolated, never on the fold classpath
│
├── docs/
│   ├── superpowers/specs/         # architecture (already)
│   └── design/dreamliner/         # flagship screens (already)
│
├── scripts/                       # run, demo, codegen from contracts
├── .cursor/
│   ├── rules/                     # always-on policies (short)
│   ├── skills/                    # on-demand playbooks
│   └── environment.json
├── AGENTS.md                      # cross-tool, <200 lines
├── CODEOWNERS
└── pom.xml / package.json         # root orchestrates platform + frontend
```

### 2.1 Component → folder → team

| Architecture component | Lives in | Owns (CODEOWNERS) | Agent may edit when |
|---|---|---|---|
| Generic envelope / AsyncAPI | `contracts/` | Platform + integration | Spec + contract tests only |
| Product kit (FOBO, 15C3, …) | `products/<id>/` | Domain outcome owner | Adding/changing a product |
| Event Gateway | `platform/modules/gateway/` | Platform | Schema or auth change |
| Event Hub + translation + fold | `platform/modules/hub/` | Platform (tight) | Fold tests first; **no product names** |
| Workflow / commands | `platform/modules/workflow/` | Platform | New action *type*, not a new Helix if |
| Notifications + Now | `platform/modules/notification/`, `frontend/now/` | Platform + Digital Workplace | New channel |
| Report assembly | `platform/modules/reports/` | Platform | New **binding** enum |
| Registry / Admin API | `platform/modules/registry/` | Platform | Maker-checker, kit schema |
| Control Tower / cockpit / reports UI | `frontend/web/` | Experience | Chrome shared; no FOBO-only pages |
| Source adapters | `adapters/*` | Integration per system | New producer |
| Advisory LLM | `advisory/` | Platform + model risk | Prompt + entitled snapshot only |
| Simulator | `adapters/helix-sim/` (today `source-simulator/`) | Platform | Demo scenarios |

### 2.2 Inside a Java module (hexagonal, same everywhere)

```
platform/modules/hub/
  src/main/java/com/onefinux/hub/
    domain/          # OutcomeInstance, fold — no Spring, no HTTP
    application/     # use-cases: ingest, replay, snapshot query
    adapter/in/      # Kafka/Solace consumer, REST ingest
    adapter/out/     # Oracle, outbox publisher
  src/test/java/...  # table-driven fold tests (POC OutcomeEngineTest style)
```

`domain` must not import `RestClient`, Wijmo, CEES HTTP, or `FOBO`. ArchUnit CI fails the build if it does.

### 2.3 Pilot vs later extract

**Pilot (one JVM `platform/modules/app`):** gateway + hub + workflow + notify + reports + registry in-process. Faster demo, one Oracle schema, SSE from the app.

**Extract when** a module has its own scale or on-call (e.g. gateway in front of the bus, reports next to object-store). Move the module’s `app` class out; contracts do not change. Do not extract because “microservices look mature.”

### 2.4 Migration from today’s POC

| Today | Tomorrow |
|---|---|
| `onefinux-hub` (all packages in one JAR) | Split **packages** into `platform/modules/*` first; keep one Spring Boot app |
| `source-simulator` | `adapters/helix-sim` |
| `contracts/business-event.schema.json` | Stay; add envelope + AsyncAPI beside it |
| `application.yml` outcomes | Move to `products/*/product.yaml`; app loads the kit |
| `static/index.html` | `frontend/web` (Dreamliner chrome) |

No big-bang rewrite. First PR that proves the model: **add `products/mec/v1/product.yaml` and load it without a new Java type**.

---

## 3. What the industry does for agentic coding (2026)

Coding agents now share a three-layer stack. Names differ; the jobs do not.

| Layer | Files | Job | Load |
|---|---|---|---|
| **Always-on constitution** | `AGENTS.md` (Codex, Cursor, Copilot-compatible); optional `CLAUDE.md` pointer | How this repo behaves | Every session |
| **Scoped rules** | `.cursor/rules/*.mdc` (`globs`, `alwaysApply`) | One concern each: Java 21, no product `if`, conventional commits | Matching files |
| **On-demand skills** | `.cursor/skills/<name>/SKILL.md` (also `.claude/skills`, `.codex/skills`) | Multi-step playbooks | When the task matches |

Cursor’s own guidance (2026): **Rules = static policy. Skills = dynamic workflow.** Do not paste a 20-page guide into rules. Skills can include scripts and `/` commands. Parallel agents should use **git worktrees** so two developers’ agents do not share a dirty tree.

Team pattern that works in banks:

1. **One skill library in the product repo** (not only on a laptop). Versioned with the code.
2. **CODEOWNERS on skills and contracts** — a skill change is a platform PR.
3. **Nested `AGENTS.md`** in `contracts/`, `platform/`, `frontend/`, `products/` (keep each under ~200 lines).
4. **One writer per worktree / branch.** Agents do not share an unsaved workspace.
5. **Human merge.** Agent-authored PRs still need a named reviewer on fold + contracts.

Cross-tool: prefer `AGENTS.md` + Agent Skills spec ([agentskills.io](https://agentskills.io)) so Cursor, Claude Code, and Codex do not fork instructions.

---

## 4. Plugins, skills, and MCP this programme should install

### 4.1 Cursor / IDE plugins (team-standard)

| Plugin / capability | Why |
|---|---|
| **Cursor project Rules + Skills** (native) | Constitution and playbooks in-repo |
| **Superpowers-style process skills** (brainstorm → spec → TDD → review) | Already how this design was written; keep for every feature |
| **Java / Spring language support** | Platform modules |
| **GitHub** | PR, CODEOWNERS, required checks |
| **ESLint / TypeScript** (when `frontend/web` exists) | Tower/cockpit |
| **ArchUnit or Checkstyle in CI** (not a chat plugin) | Enforce “domain has no FOBO, no HTTP” |

Do **not** require every engineer to install a different agent (Cursor vs Claude vs Copilot) with private rules. Private user-rules are for taste; **repo rules win** on architecture.

### 4.2 Repo skills to write (One Finance specific)

Put these in `.cursor/skills/` and own them like code.

| Skill | Trigger | What the agent must do |
|---|---|---|
| `add-product-kit` | “Add IFRS / LCR / month-end” | Edit `products/<id>/` + kit schema only. Fail if it opens `hub/domain`. |
| `change-event-contract` | “New attribute / eventType” | Edit `contracts/` + examples + contract tests; regenerate `libs/events`. |
| `fold-tdd` | “Readiness / revoke / runId” | Write table test in `hub` first; no Spring; no product id in the test name unless as data. |
| `entitlement-check` | “Who can see this card/report” | CEES resource path + federated URL; fail closed; no ACL tables. |
| `report-binding` | “Wijmo / template / file” | Catalog row + locator; do not embed Helix HTML. |
| `no-product-branch` | Review | Reject `if ("FOBO".equals` / packages named `fobo`. |
| `adapter-strangler` | “Team cannot notify us / we must read their feed” | New `adapters/<source>-feed/`; mapper + watermark; emit the generic envelope. Never poll the SoR. |
| `advisory-llm` | “Explain why blocked” | `advisory/` only; entitled snapshot; never write a fact. |

### 4.3 Repo rules (short, always on)

`.cursor/rules/`:

- `constitution.mdc` — One Finance is a multi-product platform; kits are data.
- `contracts-first.mdc` — globs `contracts/**` — schema before Java.
- `java-hub.mdc` — globs `platform/modules/hub/**` — deterministic fold, ArchUnit.
- `products-yaml.mdc` — globs `products/**` — no executable code.
- `commits.mdc` — conventional commits.

### 4.4 MCP servers (use sparingly)

| MCP | Pilot | Later |
|---|---|---|
| **GitHub** | Yes — PRs, reviews | Yes |
| **Filesystem / repo** | Built-in | — |
| Oracle / Kafka / CEES | **No** (secrets, prod blast radius) | Read-only lower env, if Legal agrees |
| Browser | Dreamliner + local Tower only | — |
| Slack / Jira | Optional for tickets | Optional |

Agents must not hold production CEES or bus credentials. Fold tests use fakes.

### 4.5 How multiple developers actually work

```
main
 ├─ feat/kit-mec           # domain owner + agent (worktree A) — products/mec only
 ├─ feat/fold-threshold    # platform + agent (worktree B) — hub tests
 └─ feat/tower-gallery     # frontend + agent (worktree C) — frontend/web
```

- Each human: one branch, one worktree, one agent writer.
- Cross-cutting contract change: **platform PR first**, then kit PRs rebase.
- CI: contract tests, ArchUnit, `products/` schema validate, `mvn -pl` affected modules.
- Review: CODEOWNERS blocks merge if contracts or hub change without platform approval.
- Cloud / background agents: same `AGENTS.md`; they must not expand scope into `products/` when asked to change the fold.

---

## 5. Suggested CODEOWNERS

```
/contracts/                         @onefinux-platform
/platform/modules/hub/              @onefinux-platform
/platform/modules/gateway/          @onefinux-platform
/platform/libs/                     @onefinux-platform
/products/                          @onefinux-platform @domain-outcome-owners
/products/fobo/                     @revenue-accounting
/products/reg-15c3/                 @reg-reporting
/frontend/                        @onefinux-frontend
/adapters/                          @onefinux-integration
/.cursor/skills/                    @onefinux-platform
/AGENTS.md                          @onefinux-platform
```

---

## 6. What to do in this repo next (not all at once)

1. Keep the current two Maven modules until the first extract; **add `products/` and load kits** instead of growing `application.yml`.
2. Add root `AGENTS.md` (short constitution) + the five rules + `add-product-kit` / `fold-tdd` / `no-product-branch` skills.
3. Add CODEOWNERS and ArchUnit “no FOBO in domain.”
4. Split `onefinux-hub` packages toward `platform/modules/*` only when a second deployable is real.

Until (1)–(3) exist, every agent will treat this as “the FOBO Spring app,” because that is what the folders currently say.

---

## 7. Pointers

- Cursor: [Best practices for coding with agents](https://cursor.com/blog/agent-best-practices)
- Agent Skills spec: [agentskills.io](https://agentskills.io)
- Cross-tool instructions: `AGENTS.md` convention (Codex / Cursor / Copilot)
- Contract-first monorepo: Maven parent + services + OpenAPI/AsyncAPI (industry Spring blueprints)
- Domain design: `docs/superpowers/specs/2026-09-12-enterprise-event-platform-design.md` §7.0 product kit
