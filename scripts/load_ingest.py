#!/usr/bin/env python3
"""Ingest load check for the NFR targets in docs/design/specification.md (REQ-NFR-007 to REQ-NFR-010).

Runs against a live hub (./scripts/run.sh) with the Python standard library only:

  1. throughput: N completion events posted by C concurrent producers to POST /api/events
     -> events per second and p50 / p95 / p99 acceptance latency
  2. fold: the ten Month-End Close inputs on a fresh COB, then the time until the instance leaves IN_PROGRESS
  3. idempotency: a sample of phase-1 events sent again -> every one answered DUPLICATE

Load events land on COB dates in 2031 onward, away from the demo's seeded COB. Exit code 1 when a target is missed.

  python3 scripts/load_ingest.py                      # defaults: 2000 events, 8 producers
  python3 scripts/load_ingest.py --events 5000 --concurrency 16 --out /tmp/load.json
"""
import argparse
import datetime as dt
import json
import random
import statistics
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

TARGETS = {
    "throughput_eps": 100,      # REQ-NFR-007: at least this many events per second accepted
    "p95_ms": 250,              # REQ-NFR-008: acceptance latency at the 95th percentile, at most
    "fold_ms": 2000,            # REQ-NFR-009: last input to outcome READY, at most
    "duplicates_pct": 100,      # REQ-NFR-010: re-sent events answered DUPLICATE
}

MONTH_END = [("SUBLEDGER_CLOSED", "SAP", 4), ("ACCRUALS_POSTED", "MOTIF", 3),
             ("INTERCO_MATCHED", "RECFACTORY", 2), ("FX_REVALUED", "SAP", 1)]


def post(hub, path, body, token=None):
    req = urllib.request.Request(hub + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"content-type": "application/json",
                                          **({"Authorization": "Bearer " + token} if token else {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, json.loads(r.read() or b"null")


def get(hub, path, token):
    req = urllib.request.Request(hub + path, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def event(run, i, cob, event_type="SUBLEDGER_CLOSED", source="SAP", region="EMEA"):
    return {"eventId": f"load-{run}-{i}", "eventType": event_type, "sourceSystem": source,
            "sourceKey": f"load-{run}-{i}", "cobDate": cob, "region": region, "status": "COMPLETED"}


def fresh_weekday(rng):
    day = dt.date(2031, 1, 1) + dt.timedelta(days=rng.randrange(0, 3650))
    while day.weekday() >= 5:
        day += dt.timedelta(days=1)
    return day.isoformat()


def percentile(values, p):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(round(p / 100 * (len(ordered) - 1))))]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--hub", default="http://localhost:7070")
    ap.add_argument("--events", type=int, default=2000)
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--user", default="praveen.kumar", help="demo user for the read-back in phase 2")
    ap.add_argument("--out", help="write the results as JSON to this file")
    args = ap.parse_args()

    rng = random.Random()
    run = f"{int(time.time())}-{rng.randrange(1_000_000):06d}"
    load_cob = fresh_weekday(rng)
    _, tok = post(args.hub, f"/api/auth/dev-token?user={args.user}", {})
    token = tok["access_token"]

    def send(i):
        t0 = time.perf_counter()
        status, _ = post(args.hub, "/api/events", event(run, i, load_cob))
        return status, (time.perf_counter() - t0) * 1000

    start = time.perf_counter()
    with ThreadPoolExecutor(args.concurrency) as pool:
        results = list(pool.map(send, range(args.events)))
    wall = time.perf_counter() - start
    latencies = [ms for _, ms in results]
    errors = sum(1 for s, _ in results if s not in (200, 202))

    fold_cob = fresh_weekday(rng)
    while fold_cob == load_cob:
        fold_cob = fresh_weekday(rng)
    n = 0
    for event_type, source, count in MONTH_END:
        for _ in range(count):
            post(args.hub, "/api/events", event(run, f"mec-{n}", fold_cob, event_type, source))
            n += 1
    sent = time.perf_counter()
    status = "IN_PROGRESS"
    while time.perf_counter() - sent < 30:
        status = get(args.hub, f"/api/outcomes/MONTH_END_CLOSE/{fold_cob}/EMEA", token).get("status")
        if status not in ("NOT_STARTED", "IN_PROGRESS", "NOT_YET", None):
            break
        time.sleep(0.01)
    fold_ms = (time.perf_counter() - sent) * 1000

    sample = rng.sample(range(args.events), min(100, args.events))
    dupes = sum(1 for i in sample if post(args.hub, "/api/events", event(run, i, load_cob))[1].get("result") == "DUPLICATE")

    measured = {
        "throughput_eps": round(args.events / wall, 1),
        "p50_ms": round(statistics.median(latencies), 1),
        "p95_ms": round(percentile(latencies, 95), 1),
        "p99_ms": round(percentile(latencies, 99), 1),
        "errors": errors,
        "fold_ms": round(fold_ms, 1),
        "fold_status": status,
        "duplicates_pct": round(100 * dupes / len(sample), 1),
    }
    checks = {
        "throughput_eps": measured["throughput_eps"] >= TARGETS["throughput_eps"],
        "p95_ms": measured["p95_ms"] <= TARGETS["p95_ms"],
        "fold_ms": measured["fold_ms"] <= TARGETS["fold_ms"] and status not in ("IN_PROGRESS", "NOT_YET"),
        "duplicates_pct": measured["duplicates_pct"] >= TARGETS["duplicates_pct"],
        "errors": errors == 0,
    }
    report = {"run": run, "hub": args.hub, "events": args.events, "concurrency": args.concurrency,
              "loadCob": load_cob, "foldCob": fold_cob, "targets": TARGETS, "measured": measured,
              "pass": all(checks.values()), "checks": checks}
    print(json.dumps(report, indent=2))
    if args.out:
        with open(args.out, "w") as f:
            json.dump(report, f, indent=2)
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
