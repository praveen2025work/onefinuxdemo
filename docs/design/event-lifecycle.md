# Event lifecycle — API ingest and feed watch

Owner: Praveen Kumar · Status: as-built with this change

This is the page an architect or controller uses to answer: **what did we receive, where did we save it, and what state did it move?**

## Two contracts, one fold

| Channel | Contract | How it arrives | Gateway |
| --- | --- | --- | --- |
| API | `inbound-event-v1` | `POST /api/events` (and `/batch`) | JSON Schema, then `EventHubService.ingest` |
| Feed | `feed-event-v1` (CloudEvents 1.0 wrapping the same business fields) **or** a raw `inbound-event-v1` file | JSON file in `data/feeds/inbox` | Same schema check, same `ingest` |

The fold does not care which channel delivered the fact. `attributes.ingestChannel` is `API` or `FEED` so the lifecycle page can name the hop.

Feed files that pass move to `data/feeds/processed`. Files that fail schema stay out of `event_store` and move to `data/feeds/rejected`.

## Request we receive (API)

```json
{
  "eventId": "CATS-TR-8812-20260912",
  "eventType": "TRADE_BOOKED",
  "sourceSystem": "CATS",
  "sourceKey": "TR-8812",
  "cobDate": "2026-09-12",
  "region": "APAC",
  "status": "COMPLETED",
  "occurredAt": "2026-09-12T20:14:03Z",
  "attributes": { "instanceId": "FOBO|2026-09-12|APAC|R-1042" }
}
```

Required: `eventType`, `sourceSystem`, `sourceKey`, `cobDate`, `region`, `status`. Optional: `eventId`, `occurredAt`, `attributes`.

## Request we receive (feed envelope)

```json
{
  "specversion": "1.0",
  "id": "CATS-TR-8812-20260912",
  "source": "cats",
  "type": "onefinux.fact.v1",
  "time": "2026-09-12T20:14:03Z",
  "datacontenttype": "application/json",
  "data": {
    "eventType": "TRADE_BOOKED",
    "sourceSystem": "CATS",
    "sourceKey": "TR-8812",
    "cobDate": "2026-09-12",
    "region": "APAC",
    "status": "COMPLETED",
    "attributes": { "instanceId": "FOBO|2026-09-12|APAC|R-1042" }
  }
}
```

`data` is the same business payload as the API body.

## Start to end

1. **Receive** — HTTP POST or a `*.json` in the inbox folder.
2. **Validate** — `inbound-event-v1` or `feed-event-v1`. Fail → 4xx (API) or `rejected/` (feed). Nothing is stored.
3. **Idempotency** — same `eventId` → 200 duplicate, no second row.
4. **Translate** — source system → business id type (book, trade, break). Stamp `receivedAt`.
5. **Persist** — append-only `event_store`. This happens **before** any fold.
6. **Publish** — in-process `EventIngested`. SSE `event` to the console.
7. **Next state**
   - Stitch: if `attributes.instanceId` is set, upsert that source's readiness key, recompute instance `NOT_YET | READY | BLOCKED | DELAYED | SIGNED | CLEARED`.
   - Engine: if `eventType`+`sourceSystem` match an OutcomeDefinition feed, re-derive stage `NOT_STARTED → FEEDS → READY → …`.
8. **Act** — on engine READY, `ActionExecutor` (HTTP_COMMAND / LOG_COMMAND) may run. Completions come back as more facts with `runId`.

Console **Event lifecycle** (`/lifecycle`) loads `GET /api/events/lifecycle` and shows this chain for the selected event. Drive **Drop feed file** writes a JSON into the inbox and scans it so the same page can be walked without a producer.
