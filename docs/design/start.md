# Start here — new developers

This is the plain-language on-ramp. The same content is on the console at **`/product?tab=start`**. Visual truth is `frontend/web`.

## The idea

At close of business a group unit is not asking “is Motif complete?” It is asking one question per outcome: **can I run this rec, produce this report, post this book?**

Motif, SAP, Helix and Axiom stay as they are. They publish facts. One Finance UX **stitches** those facts into Ready / Blocked / Delayed and acts when ready.

Products are **data**. FOBO is the first stitch kit. There is no `if (FOBO)` code path.

Two models share one event backbone:

1. **Outcome Engine** — question + feeds + SLA + on-ready (`ActionExecutor`: `HTTP_COMMAND`, `LOG_COMMAND`).
2. **Stitch kit** — sources + destinations + partner iframe + `userActions` (sign-off, post, amend, …).

## Start in two terminals

1. `./scripts/run.sh` — hub **7070** (API only) + simulator **7081**. Do not open 7070 as the UI.
2. `cd frontend/web && npm install && npm run dev` — console **http://localhost:5173**.
3. Top bar → **View** → **Developer**. The left rail now shows only that job.
4. **Onboarding** — submit the Month-end close example. That is `POST /api/outcomes/definitions`. No new Java type.
5. **Drive** → Reset → one scenario. Watch **Monitoring**. Switch View to **BU head** and open Board; Drive leaves the rail on purpose.

Views hide nav. They are **not** entitlement. CEES still fail-closes unentitled instances (404).

## Where to change code

| Path | When you touch it |
|---|---|
| `frontend/web` | Screens, chrome, theme |
| `onefinux-hub` | Ingest, both folds, REST + SSE, outbox, audit, `ActionExecutor` |
| `source-simulator` | Stand-in origins; Drive scenarios |
| `contracts/` | JSON Schema on ingest |
| `docs/design/` | The only design folder |
| `.cursor/skills/` | Job-specific review rules |

## How code review is done

1. Branch off `main`. Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`.
2. Open a GitHub pull request. There is no `CODEOWNERS` file. A human reviews against `AGENTS.md` and the skill for the job you touched.
3. CI (`.github/workflows/ci.yml`) must be green: `mvn -B verify` (Java 21) and `frontend/web` `npm ci && npm run build`.
4. Reviewer checklist: no `if (FOBO)`; no Drive / scenario buttons on Home or Reports; no frosted glass; Configuration is not a create form; LLM never on the fold; browser never talks to Kafka.
5. Local before you push: `mvn -B test` and `cd frontend/web && npm run build`, then click the screens you changed.

## Unwanted screens?

**No unused product screens.** Every page under `frontend/web/src/pages` is routed and has a job.

- **Board** vs **My outcomes** — same instances, supervisor table vs doer cards.
- **Onboarding** vs **Configuration** — create vs govern.
- **Drive** — testing only; kept off Home and Reports on purpose.
- **Instance detail** — drill-down only, no rail item.

Earlier cleanups already dropped leftover static HTML, the Analyst explorer UI, unused stitch analyst APIs, and design docs outside `docs/design/`.

Kept as platform APIs (not extra screens): `/api/contracts`, `/api/workflow`, `/api/config`, `/dev-token`. Kit create is still API-only (`POST /api/stitch/kits`).
