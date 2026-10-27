# Wave 1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shell search over entitled instances, outcome definitions, and notifications, and a group-unit filter on the inbox and the header dropdown.

**Architecture:** `SearchService` reads through `StitchService` and `OutcomeEngine` so entitlement stays in one place. The top bar calls `GET /api/search`. `StitchService.context` and a new `StitchService.notifications` apply `Entitlements.canSeeGroupUnit` before rows reach the console. The console drops a stored group unit that the context list no longer contains.

**Tech Stack:** Java 21, Spring Boot, JUnit 5, Mockito, React 18, Node test runner, Vite on port 7091.

## Global Constraints

- Products are data. No `if (FOBO)` branch.
- Grids stay read-only Wijmo. Wave 1 adds no cell editor.
- Unentitled instance reads return 404, never 403.
- The View menu is not entitlement.
- No LLM on the readiness path. Wave 1 adds no assistant.
- Wave 2 is parked: no IdP login screen, no server-saved theme, no sign-in log.
- Search query shorter than 2 characters returns `{ "hits": [] }` and the console does not call the API.
- Outcome definitions are platform metadata. A non-denied caller may see a matching definition. Instance and notification hits require `canSeeGroupUnit`.
- Colours stay in `frontend/theme` tokens. The search field uses the existing top-bar input styles.

---

### Task 1: Notification list respects the group unit

**Files:**
- Modify: `onefinux-hub/src/main/java/com/onefinux/hub/stitch/StitchService.java`
- Modify: `onefinux-hub/src/main/java/com/onefinux/hub/stitch/StitchController.java` (the `notifications` method that calls `repo.notifications`)
- Test: `onefinux-hub/src/test/java/com/onefinux/hub/stitch/StitchServiceTest.java`

**Interfaces:**
- Consumes: `CurrentUser.entitlements()`, `StitchRepository.notifications(int)`
- Produces: `StitchService.notifications(int limit)` returns `List<Map<String, Object>>` already filtered

- [ ] **Step 1: Write the failing test**

Add this test to `StitchServiceTest`. The existing `@BeforeEach` stubs Alice with `groupUnits` `REV-ACC`.

```java
@Test
@DisplayName("AC-ENT-01 notifications outside the caller unit are omitted")
void notifications_omit_other_group_units() {
    Map<String, Object> rev = new HashMap<>();
    rev.put("id", 1);
    rev.put("groupUnitId", "REV-ACC");
    rev.put("title", "REV-ACC blocked");
    Map<String, Object> markets = new HashMap<>();
    markets.put("id", 2);
    markets.put("groupUnitId", "MARKETS");
    markets.put("title", "MARKETS note");
    when(repo.notifications(50)).thenReturn(List.of(rev, markets));

    List<Map<String, Object>> rows = service.notifications(50);

    assertThat(rows).extracting(r -> r.get("id")).containsExactly(1);
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `mvn -B -pl onefinux-hub -Dtest=StitchServiceTest#notifications_omit_other_group_units test`

Expected: compile failure because `StitchService.notifications` does not exist.

- [ ] **Step 3: Implement the filter**

In `StitchService`:

```java
public List<Map<String, Object>> notifications(int limit) {
    var ent = currentUser.entitlements();
    return repo.notifications(limit).stream()
            .filter(row -> {
                String unit = str(row, "groupUnitId");
                if (unit == null || unit.isBlank()) return ent.superuser();
                return ent.canSeeGroupUnit(unit);
            })
            .toList();
}
```

`str` is the existing private helper on `StitchService`. In `StitchController.notifications`, return `service.notifications(limit)` instead of `repo.notifications(limit)`.

- [ ] **Step 4: Re-run the test**

Run: `mvn -B -pl onefinux-hub -Dtest=StitchServiceTest#notifications_omit_other_group_units test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add onefinux-hub/src/main/java/com/onefinux/hub/stitch/StitchService.java \
  onefinux-hub/src/main/java/com/onefinux/hub/stitch/StitchController.java \
  onefinux-hub/src/test/java/com/onefinux/hub/stitch/StitchServiceTest.java
git commit -m "fix: filter the notification inbox by entitled group unit"
```

---

### Task 2: Context lists only entitled group units

**Files:**
- Modify: `onefinux-hub/src/main/java/com/onefinux/hub/stitch/StitchService.java` (`context`)
- Test: `onefinux-hub/src/test/java/com/onefinux/hub/stitch/StitchServiceTest.java`

**Interfaces:**
- Consumes: `StitchRepository.groupUnits()`, `Entitlements.canSeeGroupUnit`
- Produces: `context` map key `groupUnits` is the filtered list. Other keys stay as they are.

- [ ] **Step 1: Write the failing test**

```java
@Test
@DisplayName("AC-ENT-02 context group units are limited to the caller")
void context_lists_entitled_group_units_only() {
    Map<String, Object> rev = Map.of("groupUnitId", "REV-ACC", "name", "Revenue Accounting");
    Map<String, Object> markets = Map.of("groupUnitId", "MARKETS", "name", "Markets");
    when(repo.groupUnits()).thenReturn(List.of(rev, markets));
    when(repo.distinctCobDates()).thenReturn(List.of());
    when(repo.distinctRegions()).thenReturn(List.of());

    Map<String, Object> ctx = service.context(0);

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> units = (List<Map<String, Object>>) ctx.get("groupUnits");
    assertThat(units).extracting(u -> u.get("groupUnitId")).containsExactly("REV-ACC");
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `mvn -B -pl onefinux-hub -Dtest=StitchServiceTest#context_lists_entitled_group_units_only test`

Expected: FAIL. `groupUnits` contains both REV-ACC and MARKETS.

- [ ] **Step 3: Filter inside `context`**

Replace the `groupUnits` entry:

```java
"groupUnits", repo.groupUnits().stream()
        .filter(row -> currentUser.entitlements().canSeeGroupUnit(str(row, "groupUnitId")))
        .toList(),
```

`Map.of` does not accept a list built this way if any value is null. Keep the existing `Map.of` call and pass the filtered list as the `groupUnits` value.

- [ ] **Step 4: Re-run the test**

Run: `mvn -B -pl onefinux-hub -Dtest=StitchServiceTest#context_lists_entitled_group_units_only test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add onefinux-hub/src/main/java/com/onefinux/hub/stitch/StitchService.java \
  onefinux-hub/src/test/java/com/onefinux/hub/stitch/StitchServiceTest.java
git commit -m "fix: list only entitled group units in console context"
```

---

### Task 3: Console selects an entitled group unit

**Files:**
- Create: `frontend/web/src/lib/entitledGroupUnit.js`
- Create: `frontend/web/src/lib/entitledGroupUnit.test.js`
- Modify: `frontend/web/package.json` `scripts.test` to include `src/lib/entitledGroupUnit.test.js`
- Modify: `frontend/web/src/store.jsx` where `api.context()` sets `filters.groupUnit`

**Interfaces:**
- Consumes: context `groupUnits` array of `{ groupUnitId, name }`
- Produces: `entitledGroupUnit(stored, units)` returns a string id

- [ ] **Step 1: Write the failing test**

`frontend/web/src/lib/entitledGroupUnit.test.js`:

```javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { entitledGroupUnit } from './entitledGroupUnit.js';

const units = [
  { groupUnitId: 'MARKETS', name: 'Markets' },
  { groupUnitId: 'REV-ACC', name: 'Revenue Accounting' },
];

test('AC-ENT-02 keeps a stored unit that is still entitled', () => {
  assert.equal(entitledGroupUnit('REV-ACC', units), 'REV-ACC');
});

test('AC-ENT-02 replaces a stored unit the caller cannot see', () => {
  assert.equal(entitledGroupUnit('REV-ACC', [units[0]]), 'MARKETS');
});

test('empty catalogue yields an empty id', () => {
  assert.equal(entitledGroupUnit('REV-ACC', []), '');
});
```

Add `src/lib/entitledGroupUnit.test.js` to the `test` script in `frontend/web/package.json` next to the other `src/lib` tests.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test src/lib/entitledGroupUnit.test.js` from `frontend/web`

Expected: FAIL. `entitledGroupUnit` is not exported.

- [ ] **Step 3: Implement the helper and use it in the store**

`frontend/web/src/lib/entitledGroupUnit.js`:

```javascript
export function entitledGroupUnit(stored, units = []) {
  const ids = units.map((u) => u?.groupUnitId).filter(Boolean);
  if (stored && ids.includes(stored)) return stored;
  return ids[0] || '';
}
```

In `store.jsx`, after `const c = await api.context()`, set the group unit with `entitledGroupUnit(f.groupUnit, c.groupUnits)` instead of `f.groupUnit || c.groupUnits?.[0]?.groupUnitId`.

- [ ] **Step 4: Re-run the test**

Run: `node --test src/lib/entitledGroupUnit.test.js` from `frontend/web`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web/src/lib/entitledGroupUnit.js frontend/web/src/lib/entitledGroupUnit.test.js \
  frontend/web/package.json frontend/web/src/store.jsx
git commit -m "fix: drop a stored group unit the caller cannot see"
```

---

### Task 4: Search API

**Files:**
- Create: `onefinux-hub/src/main/java/com/onefinux/hub/search/SearchHit.java`
- Create: `onefinux-hub/src/main/java/com/onefinux/hub/search/SearchService.java`
- Create: `onefinux-hub/src/main/java/com/onefinux/hub/search/SearchController.java`
- Create: `onefinux-hub/src/test/java/com/onefinux/hub/search/SearchServiceTest.java`

**Interfaces:**
- Consumes: `StitchService.instances(groupUnit, cobDate, region, status)`, `StitchService.notifications(int)`, `OutcomeEngine.definitions()`, `CurrentUser`
- Produces: `SearchService.search(String q, String groupUnit, String cobDate)` returns `List<SearchHit>`. `GET /api/search` returns `{ "hits": [ ... ] }` with at most 20 hits.

`SearchHit` is a record: `String kind, String id, String title, String detail, String route`.

- [ ] **Step 1: Write the failing test**

`SearchServiceTest` mocks `StitchService`, `OutcomeEngine`, and `CurrentUser`. Stub Alice as in `StitchServiceTest`. Stub `instances` to return one REV-ACC row:

```java
Map<String, Object> row = new HashMap<>();
row.put("instanceId", "FOBO|2026-09-12|EMEA|R-2031");
row.put("groupUnitId", "REV-ACC");
row.put("kitId", "FOBO");
row.put("sliceKey", "R-2031");
row.put("region", "EMEA");
row.put("status", "BLOCKED");
row.put("cobDate", "2026-09-12");
```

Stub `definitions()` with:

```java
new OutcomeDefinition("FOBO_HELIX", "FOBO investigation", "Can I execute FOBO analysis?",
        List.of("GLOBAL"), "FOBO Controllers", null, List.of(), null, List.of())
```

Stub `notifications(50)` with a REV-ACC row titled `Book blocked` and id `9`.

Tests:

```java
@Test
void short_query_returns_no_hits() {
    assertThat(service.search("R", "REV-ACC", "2026-09-12")).isEmpty();
}

@Test
void instance_hit_uses_the_instance_route() {
    List<SearchHit> hits = service.search("R-2031", "REV-ACC", "2026-09-12");
    assertThat(hits).anySatisfy(h -> {
        assertThat(h.kind()).isEqualTo("instance");
        assertThat(h.route()).isEqualTo("/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031");
    });
}

@Test
void other_unit_query_returns_empty_without_calling_forbidden_data() {
    when(currentUser.entitlements()).thenReturn(
            new Entitlements("bob.markets", Set.of("CONTROLLER"), Set.of("MARKETS"), Set.of(), false));
    assertThat(service.search("R-2031", "REV-ACC", null)).isEmpty();
    verify(stitch, never()).instances(any(), any(), any(), any());
}

@Test
void bob_still_receives_a_matching_outcome_definition() {
    when(currentUser.entitlements()).thenReturn(
            new Entitlements("bob.markets", Set.of("CONTROLLER"), Set.of("MARKETS"), Set.of(), false));
    List<SearchHit> hits = service.search("FOBO", null, null);
    assertThat(hits).anySatisfy(h -> {
        assertThat(h.kind()).isEqualTo("outcome");
        assertThat(h.id()).isEqualTo("FOBO_HELIX");
    });
    assertThat(hits).noneMatch(h -> "instance".equals(h.kind()));
}
```

The third test expects `instances` is never called when `groupUnit` fails `canSeeGroupUnit`. The fourth test is AC-SEARCH-04. For that test, stub `instances(null, null, null, null)` to return `List.of()` because `StitchService.instances` already drops REV-ACC for Bob. The search service trusts that list and still adds the outcome definition.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `mvn -B -pl onefinux-hub -Dtest=SearchServiceTest test`

Expected: compile failure. `SearchService` does not exist.

- [ ] **Step 3: Implement search**

`SearchService.search`:

1. Trim `q`. If `q` is null or `q.trim().length() < 2`, return `List.of()`.
2. Resolve entitlements. If `groupUnit` is non-blank and `!ent.canSeeGroupUnit(groupUnit)`, return `List.of()`.
3. Match with `contains` on a lower-cased needle.
4. Instance hits come from `stitch.instances(groupUnit, cobDate, null, null)`. `stitch.instances` already drops units the caller cannot see. Title is `kitId + " · " + sliceKey`. Detail is `region + " · " + status`. Route is `"/instance/" + URLEncoder.encode(instanceId, UTF_8)`.
5. Outcome hits come from `engine.definitions()` when the caller is not a deny-all identity (`subject` equals `anonymous` and not superuser). Match id, name, and question. Route is `"/reports/" + URLEncoder.encode(id, UTF_8)`.
6. Notification hits come from `stitch.notifications(50)`. Match title and message. Route is `"/notifications?focus=" + URLEncoder.encode(id, UTF_8)`.
7. Concatenate instances, then outcomes, then notifications. Return the first 20.

`SearchController`:

```java
@GetMapping("/api/search")
public Map<String, Object> search(@RequestParam String q,
                                  @RequestParam(required = false) String groupUnit,
                                  @RequestParam(required = false) String cobDate) {
    return Map.of("hits", service.search(q, groupUnit, cobDate));
}
```

- [ ] **Step 4: Re-run the test**

Run: `mvn -B -pl onefinux-hub -Dtest=SearchServiceTest test`

Expected: PASS. Then `mvn -B -pl onefinux-hub -Dtest=StitchServiceTest,SearchServiceTest test` also passes.

- [ ] **Step 5: Commit**

```bash
git add onefinux-hub/src/main/java/com/onefinux/hub/search \
  onefinux-hub/src/test/java/com/onefinux/hub/search
git commit -m "feat: search entitled instances, outcomes, and notifications"
```

---

### Task 5: Top-bar search and notification focus

**Files:**
- Create: `frontend/web/src/components/ShellSearch.jsx`
- Modify: `frontend/web/src/components/Layout.jsx` (insert `ShellSearch` in `.topbar` after `.tb-scope`)
- Modify: `frontend/web/src/api.js` (add `search` on the exported API object)
- Modify: `frontend/web/src/pages/Notifications.jsx` (read `focus` from the query string)
- Modify: `frontend/web/src/styles.css` only if the existing `.search-inp` class is not enough for the top bar. Reuse `.search-inp`. Do not add a second palette.

**Interfaces:**
- Consumes: `GET /api/search` hit shape from Task 4. `useApp().filters.groupUnit` and `filters.cobDate`.
- Produces: a combobox in the header. Choosing a hit calls `navigate(hit.route)`.

- [ ] **Step 1: Add the client call**

In `api.js`, next to the other `/api` helpers (not under the stitch `BASE`):

```javascript
export function searchAll({ q, groupUnit, cobDate }) {
  const qs = new URLSearchParams({ q });
  if (groupUnit) qs.set('groupUnit', groupUnit);
  if (cobDate) qs.set('cobDate', cobDate);
  return fetch('/api/search?' + qs.toString(), { headers: authHeaders() })
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} on /api/search`);
      return res.json();
    });
}
```

- [ ] **Step 2: Build the field**

`ShellSearch.jsx` holds `q`, `hits`, and `open`. On change, if `q.trim().length < 2`, set hits to `[]` and skip fetch. Otherwise wait 200ms, then call `searchAll` with the current filters. Ignore a response whose query no longer matches the field. Render a list of buttons, each `navigate(hit.route)`. Escape sets `open` false. The input `aria-label` is `Search`.

Mount `<ShellSearch />` inside `header.topbar` in `Layout.jsx` immediately after the scope block.

- [ ] **Step 3: Honour `focus` on the inbox**

In `Notifications.jsx`, read `focus` from `useSearchParams()`. When the loaded rows contain that id, expand that row the same way a click expands it today. If the page already tracks an expanded id in state, initialise that state from `focus`.

- [ ] **Step 4: Check the console tests still pass**

Run from `frontend/web`: `npm test`

Expected: the existing suite passes, including `entitledGroupUnit.test.js`.

- [ ] **Step 5: Browser check**

With the hub on 7070 and the console on 7091:

1. Act as Alice. Type `R-2031` in the header. Open the instance hit. The address is `/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031`.
2. Act as Bob. Type `R-2031` with group unit REV-ACC if the dropdown still offers it. The panel is empty. The dropdown itself lists Markets and not Revenue Accounting after context reloads.
3. Act as Alice. Open a notification hit. The inbox expands that row.

- [ ] **Step 6: Commit**

```bash
git add frontend/web/src/components/ShellSearch.jsx frontend/web/src/components/Layout.jsx \
  frontend/web/src/api.js frontend/web/src/pages/Notifications.jsx frontend/web/src/styles.css
git commit -m "feat: search the shell and open the matching screen"
```

---

## Plan self-review

| Spec id | Task |
| --- | --- |
| REQ-SEARCH-001, AC-SEARCH-01 | Task 5 skips the request under 2 characters |
| REQ-SEARCH-002, AC-SEARCH-02, AC-SEARCH-03, AC-SEARCH-04, AC-SEARCH-05 | Task 4 |
| REQ-SEARCH-003, AC-SEARCH-06 | Tasks 4 and 5 |
| REQ-ENT-001, AC-ENT-01 | Task 1 |
| REQ-ENT-002, AC-ENT-02 | Tasks 2 and 3 |
| REQ-ENT-003, AC-ENT-03 | Existing `StitchService.instanceDetail`. No code change. The Bob case is covered by the group-unit filter already in `requireEntitledInstance` and by AC-SEARCH-03’s unit gate |

Wave 3 and Wave 4 REQ-IDs are specified in `docs/design/unified-ui-waves.md` and have no tasks in this plan.

## Execution Handoff

Plan saved to `docs/design/unified-ui-wave1-plan.md`. Two ways to implement it:

1. Subagent-driven. A fresh subagent per task, with review between tasks.
2. Inline. Execute the tasks in this session with checkpoints.
