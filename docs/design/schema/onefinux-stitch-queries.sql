-- Stitch queries — same IDs the mockups print.
-- Run after onefinux-stitch.sql. Each job reads through instance_id.

-- 1) Head board: outcomes for the unit (v_head_board)
SELECT kit_id, slice_key, region, status, run_id, open_escalations, named_blocker
FROM v_head_board
WHERE group_unit_id = 'REV-ACC'
  AND cob_date = DATE '2026-09-12'
ORDER BY status, slice_key;

-- 2) User cards: ready / blocked + embed + echo
SELECT instance_id, slice_key, region, status, run_id, named_blocker, embed_url, echo_ok
FROM v_user_card
WHERE group_unit_id = 'REV-ACC'
  AND cob_date = DATE '2026-09-12'
ORDER BY status DESC, slice_key;

-- 3) Fold: distinct keys per origin (FAILED blocks; REVOKED withdraws)
SELECT instance_id, source_id, completed_keys, failed_keys, revoked_keys, waiting_keys
FROM v_readiness_fold
ORDER BY instance_id, source_id;

-- 4) Ready iframe context (host chrome)
SELECT
  i.instance_id,
  i.group_unit_id,
  i.kit_id,
  i.slice_key AS outcome_id,
  i.cob_date,
  i.region,
  i.run_id,
  ke.embed_url,
  ke.allowed_origin,
  ke.chrome
FROM outcome_instance i
JOIN kit_embed ke ON ke.kit_id = i.kit_id
WHERE i.instance_id = 'FOBO|2026-09-12|APAC|R-1042';

-- 5) Sign-off / post enabled only when READY and echo_ok = Y
SELECT i.instance_id, i.status, cr.echo_ok,
       CASE WHEN i.status = 'READY' AND cr.echo_ok = 'Y' THEN 'ENABLE' ELSE 'DISABLE' END AS buttons
FROM outcome_instance i
LEFT JOIN command_run cr ON cr.run_id = i.run_id
WHERE i.kit_id = 'FOBO';

-- 6) RTB: same blocked instance the head counted
SELECT e.escalation_id, e.kind, e.status, i.slice_key, i.named_blocker, d.dead_letter_id, d.reason
FROM escalation e
JOIN outcome_instance i ON i.instance_id = e.instance_id
LEFT JOIN dead_letter d ON d.instance_id = e.instance_id
WHERE e.status = 'OPEN';

-- 7) Events on the ready instance (facts, not fold)
SELECT event_id, event_type, source_system, source_key, status, ingest_offset
FROM event_store
WHERE instance_id = 'FOBO|2026-09-12|APAC|R-1042'
ORDER BY occurred_at;

-- 8) Origin catalog — recorded now, explored later
SELECT dataset_id, source_id, instance_id, locator_url
FROM dataset_locator
WHERE group_unit_id = 'REV-ACC';
