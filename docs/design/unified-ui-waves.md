# Unified UI waves

The organisation taxonomy is one console, not a second portal. This document is the build contract for that console after Wave 0 (the shell, desks, grids, charts, and FDC3 links already in `frontend/web`). Wave 2 is parked. The first build is Wave 1. Waves 3 and 4 follow, each as its own plan.

Assessed 26 October 2026 against the live console, `StitchService` entitlement checks, the header Act as menu, and the desk app directory.

## 1. Document control

| Field | Value |
| --- | --- |
| Product | One Finance |
| Document | Unified UI waves |
| Date | 26 October 2026 |
| Audience | Implementers and reviewers |
| Companion | `docs/design/specification.md`, `docs/design/application.md` |
| First build | Wave 1, plan in `docs/design/unified-ui-wave1-plan.md` |

`docs/design/specification.md` remains the phase-1 contract. REQ-IDs in this file are the additions for these waves. They land in `specification.md` when the wave that owns them is implemented.

## 2. Purpose

A group unit works in one browser shell. People find an instance, an outcome, or a notification without hunting the rail. A caller who is not entitled to a unit does not see that unit’s rows, and a direct link to one of those instances answers 404. Later, the same unit shares a desk, sees only the apps its CEES products allow, and gets a count of what that unit opens. Search then covers facts the hub has already folded, and an advisory summary sits beside the fold without writing to it.

## 3. Scope

### 3.1 In these waves

| Wave | Builds |
| --- | --- |
| 1 | Shell search over stitch instances, outcome definitions, and notifications. Group-unit filter on the notification list and on the group-unit dropdown. Direct instance links stay 404 when the caller cannot see the unit. |
| 3 | Desk layout stored for the group unit. App directory filtered by `ceesProducts`. A usage row when a desk view or grid opens. A feedback note on the current route. A count of routes that unit opened, with no model. |
| 4 | The same search box also matches named blockers and readiness-key text already stored on entitled instances. An advisory summary of those hits and the open instance. The summary has no write path into status, sign-off, post, or the fold. |

### 3.2 Parked — Wave 2

Bank single sign-on, two-factor authentication, entitlement request and grant, a server copy of theme and view, and a sign-in access log. The header Act as menu stays. It mints a dev token from `POST /api/auth/dev-token` for the users in `application.yml` (`praveen.kumar`, `alice.revacc`, `gla.reviewer`, `bob.markets`, `auditor`). Production sign-in remains the `issuer-uri` switch already described on `onefinux.security` and is not part of these waves.

### 3.3 Out

A fat client. Two-factor inside the console. Cell editing on a Wijmo grid. A second grid component. An LLM on the readiness path. Drive buttons on Home or Reports. `if (FOBO)` branches.

## 4. Definitions

| Term | Meaning |
| --- | --- |
| Act as | The profile menu that stores `ofx-token` and `ofx-actor` via `setActor` in `frontend/web/src/api.js` |
| Caller | `CurrentUser.entitlements()` for the request. No token and `dev-default-user=true` is the default superuser |
| Group unit | Entitlement root. `Entitlements.canSeeGroupUnit` is true for a superuser or when the id is in `groupUnits` |
| Hit | One search result: `kind`, `id`, `title`, `detail`, `route` |
| Folded fact | A named blocker or readiness-key field already on an entitled stitch instance. Wave 4 only |
| Advisory summary | A paragraph built from hits and the open instance. It does not call an action API |

## 5. Actors

| Actor | `application.yml` user | Entitlements used here |
| --- | --- | --- |
| Platform admin | `praveen.kumar` | `superuser: true`. Sees every unit |
| Controller | `alice.revacc` | `groupUnits: [REV-ACC]`, `ceesProducts: [product:FOBO]` |
| Markets controller | `bob.markets` | `groupUnits: [MARKETS]`. No REV-ACC rows |

## 6. Wave 1 requirements

### REQ-SEARCH-001 Shell search

The top bar has one search field, labelled “Search”. The placeholder is “Search instances, outcomes, notifications”. A query shorter than 2 characters after trim shows no panel. Two or more characters call `GET /api/search?q=&groupUnit=&cobDate=`. The panel lists at most 20 hits. Escape and a click outside close the panel.

### REQ-SEARCH-002 Entitled hits

`GET /api/search` returns only hits the caller can open.

| Kind | Included when |
| --- | --- |
| `instance` | `canSeeGroupUnit` is true for the instance `groupUnitId`. When `groupUnit` is set, the row’s unit equals it. When `cobDate` is set, the row’s `cobDate` equals it |
| `notification` | `canSeeGroupUnit` is true for `groupUnitId`. A notification with a null unit is included only for a superuser |
| `outcome` | The caller is not `Entitlements.deny`. Definitions are platform metadata and have no group unit. A non-superuser still receives matching definitions |

A `groupUnit` the caller cannot see yields an empty `hits` array and HTTP 200, including outcome hits. The response is never 403. A query with no `groupUnit` still returns matching outcome definitions to a non-denied caller.

### REQ-SEARCH-003 Open the existing screen

| Kind | `route` |
| --- | --- |
| `instance` | `/instance/` plus the URL-encoded `instanceId` |
| `outcome` | `/reports/` plus the URL-encoded outcome id |
| `notification` | `/notifications?focus=` plus the URL-encoded notification id |

Choosing a hit navigates to `route`. On `/notifications`, `focus` expands that row when it is in the loaded inbox.

### REQ-ENT-001 Notification list

`GET /api/stitch/notifications` returns only rows whose `groupUnitId` passes `canSeeGroupUnit`, plus null-unit rows for a superuser. The console inbox uses this list, so Act as Bob does not show REV-ACC notifications.

### REQ-ENT-002 Group-unit dropdown

`GET /api/stitch/context` returns `groupUnits` filtered by `canSeeGroupUnit`. The header dropdown renders that list. When the stored `filters.groupUnit` is absent from the list, the console selects the first returned unit.

### REQ-ENT-003 Instance 404

`GET /api/stitch/instance?id=` for an id whose `groupUnitId` fails `canSeeGroupUnit` returns 404 with no body that distinguishes unknown from unentitled. This is the existing `StitchService.instanceDetail` contract. Wave 1 adds a regression test for Bob against `FOBO|2026-09-12|EMEA|R-2031` and does not change the status code.

## 7. Wave 1 acceptance

### AC-SEARCH-01 Query too short

Given the console is open as Alice, when the search field contains one character, then no request is sent to `/api/search` and the panel stays closed.

### AC-SEARCH-02 Instance hit

Given Alice is the caller and instance `FOBO|2026-09-12|EMEA|R-2031` exists for REV-ACC, when `GET /api/search?q=R-2031&groupUnit=REV-ACC&cobDate=2026-09-12` runs, then one hit has `kind` `instance` and `route` `/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031`.

### AC-SEARCH-03 Bob sees no REV-ACC instance

Given Bob is the caller, when the same query runs, then `hits` contains no `instance` whose id is `FOBO|2026-09-12|EMEA|R-2031`.

### AC-SEARCH-04 Outcome metadata

Given Bob is the caller, when `GET /api/search?q=FOBO` runs, then a hit with `kind` `outcome` and id `FOBO_HELIX` is allowed. An `instance` hit for REV-ACC is not.

### AC-SEARCH-05 Hidden unit

Given Bob is the caller, when `GET /api/search?q=R-2031&groupUnit=REV-ACC` runs, then HTTP status is 200 and `hits` is empty.

### AC-ENT-01 Inbox

Given a notification stored with `groupUnitId` REV-ACC, when Bob calls `GET /api/stitch/notifications`, then that row is absent. When Alice calls it, the row is present.

### AC-ENT-02 Dropdown

Given Bob calls `GET /api/stitch/context`, then `groupUnits` contains MARKETS and does not contain REV-ACC. Given the console stored group unit is REV-ACC, when Bob’s context returns, the header selects MARKETS.

### AC-ENT-03 Direct link

Given Bob requests `GET /api/stitch/instance?id=FOBO|2026-09-12|EMEA|R-2031`, then the status is 404.

### AC-SEARCH-06 Notification focus

Given Alice opens `/notifications?focus=` plus an id in her inbox, then that row is expanded.

## 8. Wave 3 requirements

Wave 3 starts after Wave 1 is merged. It does not add sign-in.

### REQ-DESK-001 Group-unit desk

`GET /api/desks?groupUnit=` returns the layout JSON last saved for that unit, or 204 when none exists. `PUT /api/desks?groupUnit=` stores the body when `canSeeGroupUnit` is true, and returns 404 when it is false. The row key is `groupUnitId`. `updated_by` is `CurrentUser.actor()`. Last write wins. `/desks` loads this layout when the caller’s group unit has one, and still keeps a browser copy as the editor buffer.

### REQ-DESK-002 Catalogue by CEES product

Each built-in app in `frontend/web/src/workspace/apps.js` may set `ceesProduct`. An app with that field is listed only when the caller is a superuser or `ceesProducts` contains the value. Apps with no `ceesProduct` stay listed. A URL the user types into “add app” is unchanged and stays in that browser.

### REQ-USAGE-001 Usage row

Opening a desk view or a GridSpec posts `{ groupUnitId, kind, targetId, route }` to `POST /api/usage`. The hub stores the row with `CurrentUser.actor()` and the timestamp. A failed post does not block the view.

### REQ-USAGE-002 Feedback note

The profile menu has “Send feedback”. The form submits `{ route, note }` to `POST /api/feedback`. `note` is required, trimmed, and at most 500 characters. The hub stores `groupUnitId` from the current header scope when the caller can see it. Operations shows the unit’s notes in a read-only GridSpec.

### REQ-USAGE-003 Counts, not a model

`GET /api/usage/top?groupUnit=` returns at most five `{ route, count }` pairs for that unit over the last 30 days, highest count first. The desk shows them as “Often opened”. The endpoint does not call a model and does not write outcome status.

## 9. Wave 3 acceptance

### AC-DESK-01 Shared layout

Given Alice saves a desk for REV-ACC, when a second browser acting as Alice opens `/desks` for REV-ACC, then the saved views are the ones loaded.

### AC-DESK-02 Bob cannot write REV-ACC

Given Bob calls `PUT /api/desks?groupUnit=REV-ACC`, then the status is 404 and the stored REV-ACC layout is unchanged.

### AC-DESK-03 Catalogue

Given Alice’s token includes `product:FOBO`, when the directory renders an app whose `ceesProduct` is `product:FOBO`, then the app is listed. Given Bob’s token has no `ceesProducts`, that app is not listed. An app with no `ceesProduct` is listed for both.

### AC-USAGE-01 Open records a row

Given Alice opens a grid view on a REV-ACC desk, then one usage row exists with that route and `groupUnitId` REV-ACC.

### AC-USAGE-02 Feedback

Given Alice submits a note of 500 characters on `/board`, then `POST /api/feedback` returns 201. A note of 501 characters returns 400.

### AC-USAGE-03 Often opened

Given three opens of `/board` and one open of `/reports` for REV-ACC inside 30 days, when Alice opens the desk, then “Often opened” lists `/board` above `/reports`.

## 10. Wave 4 requirements

Wave 4 starts after Wave 3 is merged. It extends the Wave 1 search response. It does not add a chat product and it does not add an LLM.

### REQ-SEARCH-004 Folded facts

For an entitled instance, search also matches `namedBlocker` and the readiness-key `sourceKey` and `status` text. Those hits use `kind` `instance`. The `detail` field names the matched blocker or key. The `route` is the instance route from REQ-SEARCH-003. Rows the caller cannot see stay out, under the same rules as REQ-SEARCH-002.

### REQ-ADVISE-001 Summary beside the fold

`POST /api/assist` accepts `{ q, instanceId }`. The response is `{ summary }` built only from entitled search hits for `q` and, when `instanceId` is entitled, that instance’s status, named blocker, and key counts. The handler performs no stitch action, no outcome register, and no status write. An unentitled `instanceId` is omitted from the summary and does not change the HTTP status to 403. The console shows the summary in a panel opened from the search field. The panel has no action button.

## 11. Wave 4 acceptance

### AC-SEARCH-07 Blocker text

Given the REV-ACC instance `R-2031` has named blocker `MOTIF MB014 FAILED`, when Alice searches `MB014`, then the instance hit’s `detail` contains `MOTIF MB014 FAILED`. When Bob runs the same query, that instance hit is absent.

### AC-ADVISE-01 Read only

Given Alice posts `{ q: "MB014", instanceId: "FOBO|2026-09-12|EMEA|R-2031" }` to `/api/assist`, then the summary mentions the blocker, and a following `GET /api/stitch/instance?id=FOBO|2026-09-12|EMEA|R-2031` still has the same `status` as before the post.

### AC-ADVISE-02 Bob’s instance omitted

Given Bob posts the same body, then the summary does not include that instance’s blocker, and the status is 200.

## 12. Interfaces

### 12.1 Wave 1 search

`GET /api/search`

| Query | Required | Meaning |
| --- | --- | --- |
| `q` | yes | Trimmed. Length under 2 yields `{ "hits": [] }` |
| `groupUnit` | no | Restrict instance hits. Unknown to the caller yields `{ "hits": [] }` |
| `cobDate` | no | Restrict instance hits to this COB (`YYYY-MM-DD`) |

```json
{
  "hits": [
    {
      "kind": "instance",
      "id": "FOBO|2026-09-12|EMEA|R-2031",
      "title": "FOBO · R-2031",
      "detail": "EMEA · BLOCKED",
      "route": "/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031"
    }
  ]
}
```

`kind` is `instance`, `outcome`, or `notification`.

### 12.2 Wave 3 and 4

Wave 3 and Wave 4 paths are fixed above (`/api/desks`, `/api/usage`, `/api/feedback`, `/api/assist`). Their JSON bodies are the objects named in the requirements. A later plan repeats these paths and adds the table DDL. Wave 1 does not create those tables.

## 13. Fail-closed behaviour

Unentitled instance reads stay 404. Unentitled search and desk writes that name another unit return an empty success or 404 as specified. They do not return 403. The View menu remains a rail filter and is not an entitlement check.

## 14. Test strategy

Wave 1 ships with JUnit on `SearchService` and on the notification and context filters, plus a node test for the console rule that replaces a stored group unit missing from the entitled list. `mvn -B test` and `cd frontend/web && npm test` pass. A browser check on `http://localhost:7091` covers Alice finding `R-2031` and Bob seeing an empty REV-ACC search.

Wave 3 and Wave 4 use the same gates when their plans are written. Each acceptance id in sections 9 and 11 maps to one test in that plan.

## 15. Change control

A change to a REQ-ID or an acceptance id in this file is a docs change on its own commit before the code that implements it. Wave 2 items move into a wave only by an edit to section 3.2.
