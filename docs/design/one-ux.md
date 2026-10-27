# One UX capability map

One Finance against the UX capability taxonomy (7 L3 areas, 39 L4 capabilities): what is in the product, where it
lives, and what is left to the bank's own platforms. The contract for the platform pieces is subsystem **ONEUX** in
[`specification.md`](specification.md).

## The four goals

| Goal | How One Finance meets it |
|---|---|
| **One entry point and workspace** | One console; **Desks** host console screens, widgets, STEPS and partner apps side by side; a whole screen opens full width. |
| **Unified navigation and interaction** | One design standard (`frontend/theme`, shared with STEPS and partners), one control scale, FDC3 links and outcome channels across screens, tabs and browsers. |
| **Role- and context-aware** | Entitlements and the **role structure** decide what you see and can do; desks follow the outcome you work on; **Popular with your team** recommends screens; the assistant answers in your scope. |
| **Integrated search and AI** | Header search covers the hub, partner applications, screens, grids and tasks; the **assistant** answers from live facts and opens what it points at. |

## Capability map

Status: **Have** = in the product and tested; **Partial** = in the product with a stated limit; **Platform** = belongs
to a bank platform the console connects to.

### Data capture and display

| L4 | Status | Where |
|---|---|---|
| Tabular data presentation | Have | GridSpec + `SpecGrid` (grid, pivot, chart), `/grids` Platform·Unit·Mine catalogue, propose-from-source, `<ofx-grid>`, `/widget/grid` |
| Tabular data write back | Have | GridSpec `edit` block → change set → maker-checker → owning system (`/api/writeback`, `grid/writeback.js`) |
| Chart presentation | Have | `Chart.jsx`, DataView chart lens, Finance dashboards (`/finance`, `/finance/:id`) |
| Information display | Have | PageHeader, panels, instance split view, Home |
| Functionality configuration and administration | Partial | Settings panel; role structure, experiments, search providers and write-back targets are hub configuration (`application.yml`), not a screen |
| Business configuration management | Have | Onboarding and Configuration, six numbered steps |
| Data capture and maintenance | Have | Wizard forms, activity notes, grid write-back |

### Design

| L4 | Status | Where |
|---|---|---|
| Browser based | Have | React console |
| Fat client | Partial | Installable PWA, tear-out windows, desktop alerts; no native container |
| Evergreening through automated testing | Have | Unit tests (node, JUnit), Playwright journeys in CI (`frontend/web/e2e`) |
| Responsive and adaptive | Have | Mobile shell, desks collapse to one column |
| Accessibility | Have | WCAG 2.1 AA axe checks in CI on the main screens; contrast-safe tokens; closed panels are `inert` |
| Consistency and design standards | Have | `frontend/theme` tokens, one control scale, `barclays-ib-console` skill, CI guards |

### Micro front end

| L4 | Status | Where |
|---|---|---|
| Whole screen workspace | Have | Console routes, full-width partner stage |
| Composable workspace | Have | Desks |
| Context sensitive navigation framework | Have | FDC3 channels and intents, outcome channels through the hub |
| Experience marketplace | Partial | Desk app directory with team picks, grid library (Platform·Unit·Mine), team desk / grid / finance templates; no owner or rating catalogue |
| Integrated access provisioning | Have | One request for every entitlement a desk needs (`/access`), approved by someone else |

### Personalisation and telemetry

| L4 | Status | Where |
|---|---|---|
| Single user personalisation | Have | Desks, saved grids, settings at `/api/prefs/{key}`; follow the user to any browser |
| Team based personalisation | Have | Desks, GridSpecs and finance dashboards shared with a group unit (`/api/templates` kind desk\|grid\|finance) |
| Team usage based recommendations | Have | `/api/ux/recommendations`, Home and the app directory |
| AI personalisation recommendations | Partial | The assistant suggests what to open from your scope and team usage; no trained ranking |
| Basic application access logging | Have | APP_OPEN / VIEW_OPEN events, access log on `/usage` |
| Component usage logging | Have | COMPONENT_USE / SEARCH / ASSIST events, features table on `/usage` |
| Embedded user feedback | Have | Feedback from any screen (profile menu or search), reviewed on `/usage` |
| A-B testing | Have | `onefinux.ux.experiments`, stable per-user variants, exposure and conversion results on `/usage` |

### Search and AI chat

| L4 | Status | Where |
|---|---|---|
| In-application search | Have | `/api/search` (entitled) |
| Enterprise integrated search | Have | Partner applications register a search endpoint (`onefinux.ux.search-providers`); results merge in the header |
| Embedded AI chat | Have | Assistant panel, `/api/assist`; Claude when configured, hub facts otherwise; advisory only |

### Secure UX

| L4 | Status | Where |
|---|---|---|
| Basic entitlement reporting | Have | `/access` (mine), everyone the hub has seen (ACCESS_REVIEW) |
| Basic entitlement provision | Have | Access requests and approvals; hands off to bank IAM in production |
| Basic entitlement review | Have | Review queue: keep or revoke each grant, flags grants outside the role structure |
| Basic entitlement enforcement | Have | Group-unit scoping (404 fail-closed), role-structure verbs (403) |
| Single sign on | Have | OIDC authorization code + PKCE; hub validates the IdP issuer |
| Two factor authentication | Platform | The IdP performs it; the hub can require proof (`require-mfa`, `amr` claim) |
| Entitlement lock and removal from inactivity | Have | Idle lock (15 min) in the console; access suspended after 90 days without a visit |
| Automatic role and entitlement structure enforcement | Have | `role-actions`: unknown roles dropped, superuser needs ADMIN, verbs recomputed on every request |
| Security hardened | Have | CSP and security headers (nginx, IIS), prod start refuses the demo secret, rate limits, allow-listed write-back targets, no edit controls when framed by another site |
| Secure communications | Partial | TLS block ready in `nginx.conf`; terminate TLS at nginx or the load balancer; live link becomes `wss://` |

## Configuration

| Setting | Where | Default |
|---|---|---|
| Assistant model and key | `ONEFINUX_ASSIST_MODEL`, `ANTHROPIC_API_KEY` | unset: answers from hub facts |
| SSO | `ONEFINUX_OIDC_ISSUER`, `ONEFINUX_OIDC_CLIENT_ID`, optional `ONEFINUX_OIDC_AUDIENCE` | unset: demo identities |
| Production posture | `ONEFINUX_DEV_DEFAULT_USER=false`, `ONEFINUX_DEV_TOKENS=false`, `ONEFINUX_JWT_SECRET` | demo |
| Require a second factor | `ONEFINUX_REQUIRE_MFA=true` | false |
| Role structure | `onefinux.security.role-actions` | ADMIN, CONTROLLER, GLA, RTB, AUDIT |
| Idle lock, inactivity suspension | `onefinux.security.idle-lock-minutes`, `inactivity-days` | 15 min, 90 days |
| Partner search | `onefinux.ux.search-providers` | the break register (simulator) |
| Experiments | `onefinux.ux.experiments` | `home-team-picks` |
| Write-back targets | `onefinux.writeback.targets` | `breaks` (simulator) |

With SSO on, add the IdP origin to the console's `connect-src` (nginx / IIS headers).

## Tests

- Hub: `mvn -B verify` — access register, role structure, MFA, write-back, usage queries and experiments run against a
  migrated in-memory H2.
- Console: `npm test` — telemetry, search providers, PKCE, idle lock, write-back rules.
- Browser: `npm run e2e` with the hub and simulator running — search across apps, assistant, write-back maker-checker,
  role refusals, feedback, team desks, and WCAG 2.1 AA checks on nine screens.
