-- One Finance UX — stitching schema
-- Dialect: H2 2.x (POC). Production: Oracle 19c (VARCHAR2, TIMESTAMP, DATE).
--
-- The stitch is the product. An outcome_instance row is how a group unit, kit,
-- sources of origin, run, and partner embed meet on one COB.
--
-- POC tables event_store + notification already exist (JPA ddl-auto=update).
-- This file CREATE IF NOT EXISTS them with the target shape, then ALTER ADD
-- COLUMN IF NOT EXISTS so a live hub file DB can be extended without replace.
--
-- Existing event_store.source_system  ==  source_system.source_id  (do not add a second source_id).
-- Existing notification.outcome_key   ==  product_kit.kit_id (legacy YAML id until kits load).
--
-- Analyst table is created empty. Do not wire UI in the first slice.

-- ========== TENANT ==========
CREATE TABLE IF NOT EXISTS group_unit (
  group_unit_id   VARCHAR(40)  PRIMARY KEY,          -- REV-ACC
  name            VARCHAR(120) NOT NULL,
  domain          VARCHAR(80)  NOT NULL,
  cees_resource   VARCHAR(80)  NOT NULL,             -- groupUnit:REV-ACC
  default_region  VARCHAR(20)  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
);

-- ========== ORIGIN + DESTINATION (known now) ==========
CREATE TABLE IF NOT EXISTS source_system (
  source_id       VARCHAR(40)  PRIMARY KEY,          -- CATS, MOTIF, MBR
  display_name    VARCHAR(120) NOT NULL,
  identifier_type VARCHAR(40)  NOT NULL,             -- TRADE, LEDGER, BREAK
  ingest_mode     VARCHAR(10)  NOT NULL,             -- FEED | PUSH | BOTH
  topic_or_url    VARCHAR(240),
  mapper_id       VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS destination_system (
  dest_id         VARCHAR(40)  PRIMARY KEY,          -- HELIX, FAS_MOTIF, PNL_AGENT
  display_name    VARCHAR(120) NOT NULL,
  action_type     VARCHAR(20)  NOT NULL,             -- COMMAND | NOTIFY
  command_url     VARCHAR(240)
);

-- ========== KIT (product is data — no FOBO Java type) ==========
CREATE TABLE IF NOT EXISTS product_kit (
  kit_id          VARCHAR(40)  PRIMARY KEY,          -- FOBO
  group_unit_id   VARCHAR(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  domain          VARCHAR(80)  NOT NULL,
  question        VARCHAR(240) NOT NULL,
  renderer        VARCHAR(32)  NOT NULL,             -- HELIX_RECON | ENGINE_REPORT | …
  user_actions    VARCHAR(80)  NOT NULL,             -- SIGN_OFF,POST
  cees_product    VARCHAR(80)  NOT NULL,             -- product:FOBO
  sla_cutoff      VARCHAR(20),
  version         INT          NOT NULL DEFAULT 1,
  status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'  -- DRAFT | PENDING | LIVE
);

CREATE TABLE IF NOT EXISTS kit_source (
  kit_id          VARCHAR(40)  NOT NULL REFERENCES product_kit(kit_id),
  source_id       VARCHAR(40)  NOT NULL REFERENCES source_system(source_id),
  required        CHAR(1)      NOT NULL DEFAULT 'Y',
  PRIMARY KEY (kit_id, source_id)
);

CREATE TABLE IF NOT EXISTS kit_destination (
  kit_id          VARCHAR(40)  NOT NULL REFERENCES product_kit(kit_id),
  dest_id         VARCHAR(40)  NOT NULL REFERENCES destination_system(dest_id),
  step_order      INT          NOT NULL,
  PRIMARY KEY (kit_id, dest_id)
);

CREATE TABLE IF NOT EXISTS kit_embed (
  kit_id          VARCHAR(40)  PRIMARY KEY REFERENCES product_kit(kit_id),
  embed_url       VARCHAR(400) NOT NULL,
  allowed_origin  VARCHAR(200) NOT NULL,
  chrome          VARCHAR(20)  NOT NULL DEFAULT 'HOST'
);

-- ========== INSTANCE (the stitch for a COB) ==========
CREATE TABLE IF NOT EXISTS outcome_instance (
  instance_id     VARCHAR(80)  PRIMARY KEY,          -- FOBO|2026-09-12|APAC|R-1042
  kit_id          VARCHAR(40)  NOT NULL REFERENCES product_kit(kit_id),
  group_unit_id   VARCHAR(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  cob_date        DATE         NOT NULL,
  region          VARCHAR(20)  NOT NULL,
  slice_key       VARCHAR(80)  NOT NULL,             -- R-1042 rec id
  status          VARCHAR(20)  NOT NULL,             -- NOT_YET | BLOCKED | READY | CLEARED | DELAYED
  run_id          VARCHAR(40),
  named_blocker   VARCHAR(240),
  updated_at      TIMESTAMP    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_instance_slice
  ON outcome_instance (kit_id, cob_date, region, slice_key);

CREATE INDEX IF NOT EXISTS idx_instance_unit_status
  ON outcome_instance (group_unit_id, cob_date, status);

-- Keys the fold counts (stitched to origin)
CREATE TABLE IF NOT EXISTS readiness_key (
  instance_id     VARCHAR(80)  NOT NULL REFERENCES outcome_instance(instance_id),
  source_id       VARCHAR(40)  NOT NULL REFERENCES source_system(source_id),
  source_key      VARCHAR(120) NOT NULL,
  key_status      VARCHAR(20)  NOT NULL,             -- WAITING | COMPLETED | FAILED | REVOKED
  last_event_id   VARCHAR(120),
  PRIMARY KEY (instance_id, source_id, source_key)
);

CREATE INDEX IF NOT EXISTS idx_readiness_status
  ON readiness_key (instance_id, key_status);

-- ========== FACTS (POC event_store — JPA column names, snake_case) ==========
CREATE TABLE IF NOT EXISTS event_store (
  event_id          VARCHAR(120) PRIMARY KEY,
  event_type        VARCHAR(80)  NOT NULL,
  source_system     VARCHAR(40)  NOT NULL,           -- stitches to source_system.source_id
  source_key        VARCHAR(120) NOT NULL,
  business_id_type  VARCHAR(40),
  business_id       VARCHAR(120),
  cross_refs_json   VARCHAR(2000),
  cob_date          DATE         NOT NULL,
  region            VARCHAR(20)  NOT NULL,
  status            VARCHAR(20)  NOT NULL,
  occurred_at       TIMESTAMP    NOT NULL,
  received_at       TIMESTAMP    NOT NULL,
  attributes_json   VARCHAR(8000),
  instance_id       VARCHAR(80),                     -- stitches to outcome_instance
  correlation_id    VARCHAR(80),
  ingest_offset     VARCHAR(80)
);

ALTER TABLE event_store ADD COLUMN IF NOT EXISTS instance_id VARCHAR(80);
ALTER TABLE event_store ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(80);
ALTER TABLE event_store ADD COLUMN IF NOT EXISTS ingest_offset VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_event_instance ON event_store (instance_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_event_source ON event_store (source_system, ingest_offset);

CREATE TABLE IF NOT EXISTS command_run (
  run_id          VARCHAR(40)  PRIMARY KEY,
  instance_id     VARCHAR(80)  NOT NULL REFERENCES outcome_instance(instance_id),
  dest_id         VARCHAR(40)  NOT NULL REFERENCES destination_system(dest_id),
  commanded_at    TIMESTAMP    NOT NULL,
  completed_at    TIMESTAMP,
  result_locator  VARCHAR(400),
  echo_ok         CHAR(1)                            -- Y only if completion echoed this run_id
);

-- ========== HUMAN + RTB ==========
CREATE TABLE IF NOT EXISTS notification (
  id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at      TIMESTAMP    NOT NULL,
  severity        VARCHAR(20)  NOT NULL,
  transition      VARCHAR(30)  NOT NULL,
  outcome_key     VARCHAR(160) NOT NULL,             -- legacy: kit / YAML outcome id
  outcome_name    VARCHAR(120),
  audience        VARCHAR(120),
  title           VARCHAR(300) NOT NULL,
  message         VARCHAR(2000),
  channels        VARCHAR(200),
  instance_id     VARCHAR(80),
  group_unit_id   VARCHAR(40)
);

ALTER TABLE notification ADD COLUMN IF NOT EXISTS instance_id VARCHAR(80);
ALTER TABLE notification ADD COLUMN IF NOT EXISTS group_unit_id VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_notif_instance ON notification (instance_id);

CREATE TABLE IF NOT EXISTS escalation (
  escalation_id   VARCHAR(40)  PRIMARY KEY,
  instance_id     VARCHAR(80)  NOT NULL REFERENCES outcome_instance(instance_id),
  kind            VARCHAR(20)  NOT NULL,             -- DELAY | AGED | SLA | HUMAN
  opened_at       TIMESTAMP    NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS feed_watermark (
  source_id       VARCHAR(40)  NOT NULL REFERENCES source_system(source_id),
  partition_id    VARCHAR(20)  NOT NULL,
  last_offset     VARCHAR(40)  NOT NULL,
  lag_seconds     INT,
  PRIMARY KEY (source_id, partition_id)
);

CREATE TABLE IF NOT EXISTS dead_letter (
  dead_letter_id  VARCHAR(40)  PRIMARY KEY,
  source_id       VARCHAR(40)  NOT NULL REFERENCES source_system(source_id),
  ingest_offset   VARCHAR(80)  NOT NULL,
  reason          VARCHAR(400) NOT NULL,             -- RFC 7807 title
  payload_ref     VARCHAR(200),
  status          VARCHAR(20)  NOT NULL DEFAULT 'HOLD',
  instance_id     VARCHAR(80)  REFERENCES outcome_instance(instance_id)
);

-- ========== ORIGIN CATALOG (now) / EXPLORER (later) ==========
CREATE TABLE IF NOT EXISTS dataset_locator (
  dataset_id      VARCHAR(80)  PRIMARY KEY,
  group_unit_id   VARCHAR(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  source_id       VARCHAR(40)  NOT NULL REFERENCES source_system(source_id),
  instance_id     VARCHAR(80)  REFERENCES outcome_instance(instance_id),
  locator_url     VARCHAR(400) NOT NULL,
  registered_at   TIMESTAMP    NOT NULL
);

-- Phase 2 only — do not wire UI in first slice
CREATE TABLE IF NOT EXISTS analyst_view_def (
  view_id         VARCHAR(80)  PRIMARY KEY,
  group_unit_id   VARCHAR(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  dataset_id      VARCHAR(80)  NOT NULL REFERENCES dataset_locator(dataset_id),
  widget          VARCHAR(20)  NOT NULL,             -- GRID | PIVOT | CHART
  field_map_json  VARCHAR(4000) NOT NULL,
  cees_report     VARCHAR(80)  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'UNUSED'
);

-- ========== STITCH VIEWS (what each job reads) ==========
CREATE OR REPLACE VIEW v_head_board AS
SELECT
  i.group_unit_id,
  i.kit_id,
  k.question,
  i.instance_id,
  i.slice_key,
  i.region,
  i.cob_date,
  i.status,
  i.run_id,
  i.named_blocker,
  (SELECT COUNT(*) FROM escalation e WHERE e.instance_id = i.instance_id AND e.status = 'OPEN') AS open_escalations
FROM outcome_instance i
JOIN product_kit k ON k.kit_id = i.kit_id;

CREATE OR REPLACE VIEW v_readiness_fold AS
SELECT
  rk.instance_id,
  rk.source_id,
  SUM(CASE WHEN rk.key_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_keys,
  SUM(CASE WHEN rk.key_status = 'FAILED'    THEN 1 ELSE 0 END) AS failed_keys,
  SUM(CASE WHEN rk.key_status = 'REVOKED'   THEN 1 ELSE 0 END) AS revoked_keys,
  SUM(CASE WHEN rk.key_status = 'WAITING'   THEN 1 ELSE 0 END) AS waiting_keys
FROM readiness_key rk
GROUP BY rk.instance_id, rk.source_id;

CREATE OR REPLACE VIEW v_user_card AS
SELECT
  i.instance_id,
  i.kit_id,
  i.group_unit_id,
  i.slice_key,
  i.region,
  i.cob_date,
  i.status,
  i.run_id,
  i.named_blocker,
  k.question,
  k.user_actions,
  k.renderer,
  ke.embed_url,
  ke.allowed_origin,
  ke.chrome,
  cr.echo_ok
FROM outcome_instance i
JOIN product_kit k ON k.kit_id = i.kit_id
LEFT JOIN kit_embed ke ON ke.kit_id = i.kit_id
LEFT JOIN command_run cr ON cr.run_id = i.run_id;

-- ========== SEED (same keys as docs/design/mockups) ==========
MERGE INTO group_unit KEY (group_unit_id) VALUES
  ('REV-ACC', 'Revenue Accounting', 'Rev Acc', 'groupUnit:REV-ACC', 'APAC', 'ACTIVE');

MERGE INTO source_system KEY (source_id) VALUES
  ('CATS',  'CATS front office', 'TRADE',  'FEED', 'cats.movements.v1',          'cats-v1'),
  ('MOTIF', 'MOTIF ledger',      'LEDGER', 'FEED', 'motif.book.lifecycle.v3',    'motif-v3'),
  ('MBR',   'MBR / Rec Factory', 'BREAK',  'FEED', 'mbr.breaks.v2',              'mbr-v2');

MERGE INTO destination_system KEY (dest_id) VALUES
  ('HELIX',     'Helix FOBO',       'COMMAND', 'http://helix/analysis'),
  ('FAS_MOTIF', 'FAS post to MOTIF','COMMAND', 'http://fas/post'),
  ('PNL_AGENT', 'P&L Agent notify', 'NOTIFY',  NULL);

MERGE INTO product_kit KEY (kit_id) VALUES
  ('FOBO', 'REV-ACC', 'Rev Acc', 'Can I execute this rec?', 'HELIX_RECON',
   'SIGN_OFF,POST', 'product:FOBO', '19:00', 1, 'LIVE');

MERGE INTO kit_source KEY (kit_id, source_id) VALUES
  ('FOBO', 'CATS',  'Y'),
  ('FOBO', 'MOTIF', 'Y'),
  ('FOBO', 'MBR',   'Y');

MERGE INTO kit_destination KEY (kit_id, dest_id) VALUES
  ('FOBO', 'HELIX',     1),
  ('FOBO', 'FAS_MOTIF', 2),
  ('FOBO', 'PNL_AGENT', 3);

MERGE INTO kit_embed KEY (kit_id) VALUES
  ('FOBO', 'https://helix.example/fobo', 'https://helix.example', 'HOST');

MERGE INTO outcome_instance KEY (instance_id) VALUES
  ('FOBO|2026-09-12|APAC|R-1042', 'FOBO', 'REV-ACC', DATE '2026-09-12', 'APAC',
   'R-1042', 'READY',   'RUN-A37C', NULL,                          CURRENT_TIMESTAMP),
  ('FOBO|2026-09-12|EMEA|R-2031', 'FOBO', 'REV-ACC', DATE '2026-09-12', 'EMEA',
   'R-2031', 'BLOCKED', NULL,       'MOTIF MB014 FAILED',          CURRENT_TIMESTAMP);

MERGE INTO readiness_key KEY (instance_id, source_id, source_key) VALUES
  ('FOBO|2026-09-12|APAC|R-1042', 'CATS',  'TR-8812', 'COMPLETED', 'EVT-CATS-8812'),
  ('FOBO|2026-09-12|APAC|R-1042', 'MOTIF', 'MB012',   'COMPLETED', 'EVT-MOTIF-MB012'),
  ('FOBO|2026-09-12|APAC|R-1042', 'MBR',   'BK-4410', 'COMPLETED', 'EVT-MBR-4410'),
  ('FOBO|2026-09-12|EMEA|R-2031', 'CATS',  'TR-9901', 'COMPLETED', 'EVT-CATS-9901'),
  ('FOBO|2026-09-12|EMEA|R-2031', 'MOTIF', 'MB014',   'FAILED',    'EVT-MOTIF-MB014'),
  ('FOBO|2026-09-12|EMEA|R-2031', 'MBR',   'BK-4420', 'WAITING',   NULL);

MERGE INTO command_run KEY (run_id) VALUES
  ('RUN-A37C', 'FOBO|2026-09-12|APAC|R-1042', 'HELIX',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'helix://analysis/RUN-A37C', 'Y');

MERGE INTO dataset_locator KEY (dataset_id) VALUES
  ('DS-FOBO-R1042-BREAKS', 'REV-ACC', 'MBR', 'FOBO|2026-09-12|APAC|R-1042',
   'helix://breaks/RUN-A37C', CURRENT_TIMESTAMP);

MERGE INTO escalation KEY (escalation_id) VALUES
  ('ESC-19', 'FOBO|2026-09-12|EMEA|R-2031', 'DELAY', CURRENT_TIMESTAMP, 'OPEN');

MERGE INTO feed_watermark KEY (source_id, partition_id) VALUES
  ('MOTIF', 'p3', '18442091', 12),
  ('CATS',  'p0', '99211',     4),
  ('MBR',   'p1', '4402',      0);

MERGE INTO dead_letter KEY (dead_letter_id) VALUES
  ('DL-4402', 'MOTIF', 'p3/18442099', 'state=PENDING_SIGN not in mapper',
   'blob://dl/4402', 'HOLD', 'FOBO|2026-09-12|EMEA|R-2031');

MERGE INTO event_store (event_id, event_type, source_system, source_key, business_id_type, business_id,
                        cross_refs_json, cob_date, region, status, occurred_at, received_at, attributes_json,
                        instance_id, correlation_id, ingest_offset) KEY (event_id) VALUES
  ('EVT-CATS-8812',  'TRADE_BOOKED',          'CATS',  'TR-8812', 'TRADE',  'TR-8812', NULL,
   DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
   'FOBO|2026-09-12|APAC|R-1042', 'CORR-1042', 'p0/99200'),
  ('EVT-MOTIF-MB012','LEDGER_POSTED',         'MOTIF', 'MB012',   'LEDGER', 'MB012',   NULL,
   DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
   'FOBO|2026-09-12|APAC|R-1042', 'CORR-1042', 'p3/18442080'),
  ('EVT-MBR-4410',   'BREAK_RAISED',          'MBR',   'BK-4410', 'BREAK',  'BK-4410', NULL,
   DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
   'FOBO|2026-09-12|APAC|R-1042', 'CORR-1042', 'p1/4398'),
  ('EVT-HELIX-A37C', 'HELIX_ANALYSIS_COMPLETE','HELIX', 'RUN-A37C','RUN',    'RUN-A37C',NULL,
   DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
   'FOBO|2026-09-12|APAC|R-1042', 'RUN-A37C',  NULL),
  ('EVT-MOTIF-MB014','LEDGER_REJECTED',       'MOTIF', 'MB014',   'LEDGER', 'MB014',   NULL,
   DATE '2026-09-12', 'EMEA', 'FAILED',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
   'FOBO|2026-09-12|EMEA|R-2031', 'CORR-2031', 'p3/18442099');

DELETE FROM notification WHERE instance_id IN (
  'FOBO|2026-09-12|APAC|R-1042',
  'FOBO|2026-09-12|EMEA|R-2031'
);

INSERT INTO notification (created_at, severity, transition, outcome_key, outcome_name, audience,
                          title, message, channels, instance_id, group_unit_id)
VALUES
  (CURRENT_TIMESTAMP, 'INFO', 'READY', 'FOBO', 'Can I execute this rec?', 'product:FOBO',
   'FOBO R-1042 ready — sign off or post',
   'Helix RUN-A37C echo_ok=Y. instance FOBO|2026-09-12|APAC|R-1042',
   'SSE,BARCLAYS_NOW', 'FOBO|2026-09-12|APAC|R-1042', 'REV-ACC'),
  (CURRENT_TIMESTAMP, 'CRITICAL', 'BLOCKED', 'FOBO', 'Can I execute this rec?', 'platform.support',
   'FOBO R-2031 blocked — MOTIF MB014 FAILED',
   'Named key MOTIF MB014. Escalation ESC-19. Dead letter DL-4402.',
   'SSE', 'FOBO|2026-09-12|EMEA|R-2031', 'REV-ACC');
