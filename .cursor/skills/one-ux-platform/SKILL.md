---
name: one-ux-platform
description: Use when adding a search source, changing the assistant, logging usage or feedback, running an A-B experiment, saving per-user or per-team settings, making a grid editable (write-back), or touching access, roles, sign-in, idle lock or security headers.
---

# One UX platform

The cross-cutting services every screen uses. Map against the UX taxonomy: `docs/design/one-ux.md`. Contract:
subsystem ONEUX in `docs/design/specification.md`.

## Where things live

| Capability | Hub | Console |
|---|---|---|
| Search across apps | `search/` (`/api/search`), `onefinux.ux.search-providers` | `components/ShellSearch.jsx`, `search/providers.js` |
| Assistant | `assist/` (`/api/assist`, Anthropic Java SDK) | `components/AssistantPanel.jsx`, `ux/bus.js openAssistant()` |
| Usage, feedback, experiments, recommendations | `ux/UxController` (`/api/ux/*`), table `ux_event` | `ux/track.js`, `ux/experiments.js`, `components/FeedbackDialog.jsx`, `components/TeamPicks.jsx`, `pages/Usage.jsx` |
| Saved prefs, team templates | `/api/prefs/{desks,grids,settings}`, `/api/templates` | `ux/prefs.js` (newer copy wins), Desks share / New desk |
| Grid write-back | `writeback/` (`/api/writeback`), `onefinux.writeback.targets` | GridSpec `edit` → `grid/writeback.js`, `SpecGrid`, `DataGrid edit` |
| Access, roles, sign-in | `security/` (`AccessRegistry`, `AccessController`, `CurrentUser`, `SecurityConfig`) | `pages/Access.jsx`, `auth/SessionGate.jsx`, `auth/oidc.js`, `auth/idle.js` |

## Rules

- **Search**: a new application registers `{id, label, url}` under `onefinux.ux.search-providers`. Its endpoint answers
  `GET url?q=` with `{hits: [{kind, id, title, detail, route}]}`; routes must be same-origin paths or they are dropped.
- **Assistant**: it reads, never writes. The actions under an answer are built from hub facts in `AssistService.actions`,
  never by the model. Facts are already entitlement-filtered (`SearchService`, `StitchService`). The model id is
  configuration (`ONEFINUX_ASSIST_MODEL`) — do not hard-code one. Without a model it must still answer (grounded mode).
- **Telemetry**: `track(type, {app, component, variant, detail})` with a type from `EVENT_TYPES`. `app` is a route key
  (`routeKey`) or a desk app id; `component` names the feature (`grid.writeback.submit`, `desk.share`). No personal data
  in `detail` beyond what the user typed into feedback.
- **Experiments**: declare in `onefinux.ux.experiments` with a `conversion` component name; read with
  `useVariant(id)`, mark success with `convert(id)`. Never branch on the user's name.
- **Prefs**: store `{savedAt, state}`; `newer()` decides. Keys are `desks`, `grids`, `settings` only.
- **Write-back**: add an `edit` block to the GridSpec (`key`, `columns` with rules, `approval`, `target`). The target
  must be listed in `onefinux.writeback.targets`; the owning system applies the change. Maker-checker is the default.
  Grids framed by another site never show edit or approve controls.
- **Roles**: verbs come from `onefinux.security.role-actions`; check with `Entitlements.canAct(verb)` in the service
  and audit the refusal. Add a verb to the structure rather than an `if (role == …)`.
- **Access**: requests, approvals and reviews are always by someone other than the subject. Inactivity suspension and
  restore are audited. In production these hand off to bank IAM; the register stays the enforcement point.
- **Sign-in**: OIDC authorization code + PKCE in the browser; the hub validates the configured issuer. The production
  posture is `dev-default-user=false`, `dev-tokens=false`, a real `ONEFINUX_JWT_SECRET` or no demo tokens at all.
- **Headers**: keep `frontend/web/nginx.conf` and `public/web.config` in step; only `/widget/` allows other ancestors.

## Tests

`mvn -B verify` (H2 with every migration for the registry, write-back and usage queries), `npm test`, and
`npm run e2e` (journeys + WCAG 2.1 AA). A new screen goes into `e2e/a11y.spec.js`.
