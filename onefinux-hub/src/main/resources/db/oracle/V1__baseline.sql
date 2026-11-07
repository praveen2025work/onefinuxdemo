-- One Finance — baseline schema (Flyway V1)
-- Dialect: Oracle 19c. Mirrors db/migration (H2) version for version; change both together. Kept outside
-- db/migration because Flyway scans locations recursively.
--
-- Flyway owns the schema now (spring.jpa.hibernate.ddl-auto=none). This migration is the single
-- source of truth for every table, index and view; JPA entities (event_store, notification) map onto
-- the tables created here. It runs on an empty schema: Oracle 19c has no CREATE ... IF NOT EXISTS, so
-- the seed rows are plain INSERTs. Booleans are NUMBER(1); text over 4000 bytes is CLOB.
--
-- The stitch is the product. An outcome_instance row is how a group unit, kit,
-- sources of origin, run, and partner embed meet on one COB.
--
-- event_store.source_system  ==  source_system.source_id  (do not add a second source_id).
-- notification.outcome_key   ==  product_kit.kit_id (legacy YAML id until kits load).
--
-- Analyst table is created empty. Do not wire UI in the first slice.
-- NOTE: demo seed data (the INSERT blocks below) is intentionally kept in this baseline for the
-- POC; in production the seed would move to a separate, environment-gated migration.

-- ========== TENANT ==========
CREATE TABLE group_unit (
  group_unit_id   VARCHAR2(40)  PRIMARY KEY,          -- REV-ACC
  name            VARCHAR2(120) NOT NULL,
  domain          VARCHAR2(80)  NOT NULL,
  cees_resource   VARCHAR2(80)  NOT NULL,             -- groupUnit:REV-ACC
  default_region  VARCHAR2(20)  NOT NULL,
  status          VARCHAR2(20)  DEFAULT 'ACTIVE' NOT NULL
);

-- ========== ORIGIN + DESTINATION (known now) ==========
CREATE TABLE source_system (
  source_id       VARCHAR2(40)  PRIMARY KEY,          -- CATS, MOTIF, MBR
  display_name    VARCHAR2(120) NOT NULL,
  identifier_type VARCHAR2(40)  NOT NULL,             -- TRADE, LEDGER, BREAK
  ingest_mode     VARCHAR2(10)  NOT NULL,             -- FEED | PUSH | BOTH
  topic_or_url    VARCHAR2(240),
  mapper_id       VARCHAR2(80)
);

CREATE TABLE destination_system (
  dest_id         VARCHAR2(40)  PRIMARY KEY,          -- HELIX, FAS_MOTIF, PNL_AGENT
  display_name    VARCHAR2(120) NOT NULL,
  action_type     VARCHAR2(20)  NOT NULL,             -- COMMAND | NOTIFY
  command_url     VARCHAR2(240)
);

-- ========== KIT (product is data — no FOBO Java type) ==========
CREATE TABLE product_kit (
  kit_id          VARCHAR2(40)  PRIMARY KEY,          -- FOBO
  group_unit_id   VARCHAR2(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  domain          VARCHAR2(80)  NOT NULL,
  question        VARCHAR2(240) NOT NULL,
  renderer        VARCHAR2(32)  NOT NULL,             -- HELIX_RECON | ENGINE_REPORT | …
  user_actions    VARCHAR2(80)  NOT NULL,             -- SIGN_OFF,POST
  cees_product    VARCHAR2(80)  NOT NULL,             -- product:FOBO
  sla_cutoff      VARCHAR2(20),
  version         NUMBER(10)          DEFAULT 1 NOT NULL,
  status          VARCHAR2(20)  DEFAULT 'DRAFT' NOT NULL  -- DRAFT | PENDING | LIVE
);

CREATE TABLE kit_source (
  kit_id          VARCHAR2(40)  NOT NULL REFERENCES product_kit(kit_id),
  source_id       VARCHAR2(40)  NOT NULL REFERENCES source_system(source_id),
  required        CHAR(1)      DEFAULT 'Y' NOT NULL,
  PRIMARY KEY (kit_id, source_id)
);

CREATE TABLE kit_destination (
  kit_id          VARCHAR2(40)  NOT NULL REFERENCES product_kit(kit_id),
  dest_id         VARCHAR2(40)  NOT NULL REFERENCES destination_system(dest_id),
  step_order      NUMBER(10)          NOT NULL,
  PRIMARY KEY (kit_id, dest_id)
);

CREATE TABLE kit_embed (
  kit_id          VARCHAR2(40)  PRIMARY KEY REFERENCES product_kit(kit_id),
  embed_url       VARCHAR2(400) NOT NULL,
  allowed_origin  VARCHAR2(200) NOT NULL,
  chrome          VARCHAR2(20)  DEFAULT 'HOST' NOT NULL
);

-- ========== INSTANCE (the stitch for a COB) ==========
CREATE TABLE outcome_instance (
  instance_id     VARCHAR2(80)  PRIMARY KEY,          -- FOBO|2026-09-12|APAC|R-1042
  kit_id          VARCHAR2(40)  NOT NULL REFERENCES product_kit(kit_id),
  group_unit_id   VARCHAR2(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  cob_date        DATE         NOT NULL,
  region          VARCHAR2(20)  NOT NULL,
  slice_key       VARCHAR2(80)  NOT NULL,             -- R-1042 rec id
  status          VARCHAR2(20)  NOT NULL,             -- NOT_YET | BLOCKED | READY | CLEARED | DELAYED
  run_id          VARCHAR2(40),
  named_blocker   VARCHAR2(240),
  updated_at      TIMESTAMP    NOT NULL
);

CREATE UNIQUE INDEX uq_instance_slice
  ON outcome_instance (kit_id, cob_date, region, slice_key);

CREATE INDEX idx_instance_unit_status
  ON outcome_instance (group_unit_id, cob_date, status);

-- Keys the fold counts (stitched to origin)
CREATE TABLE readiness_key (
  instance_id     VARCHAR2(80)  NOT NULL REFERENCES outcome_instance(instance_id),
  source_id       VARCHAR2(40)  NOT NULL REFERENCES source_system(source_id),
  source_key      VARCHAR2(120) NOT NULL,
  key_status      VARCHAR2(20)  NOT NULL,             -- WAITING | COMPLETED | FAILED | REVOKED
  last_event_id   VARCHAR2(120),
  PRIMARY KEY (instance_id, source_id, source_key)
);

CREATE INDEX idx_readiness_status
  ON readiness_key (instance_id, key_status);

-- ========== FACTS (POC event_store — JPA column names, snake_case) ==========
CREATE TABLE event_store (
  event_id          VARCHAR2(120) PRIMARY KEY,
  event_type        VARCHAR2(80)  NOT NULL,
  source_system     VARCHAR2(40)  NOT NULL,           -- stitches to source_system.source_id
  source_key        VARCHAR2(120) NOT NULL,
  business_id_type  VARCHAR2(40),
  business_id       VARCHAR2(120),
  cross_refs_json   VARCHAR2(2000),
  cob_date          DATE         NOT NULL,
  region            VARCHAR2(20)  NOT NULL,
  status            VARCHAR2(20)  NOT NULL,
  occurred_at       TIMESTAMP    NOT NULL,
  received_at       TIMESTAMP    NOT NULL,
  attributes_json   CLOB,
  instance_id       VARCHAR2(80),                     -- stitches to outcome_instance
  correlation_id    VARCHAR2(80),
  ingest_offset     VARCHAR2(80)
);


CREATE INDEX idx_event_instance ON event_store (instance_id, occurred_at);
CREATE INDEX idx_event_source ON event_store (source_system, ingest_offset);

CREATE TABLE command_run (
  run_id          VARCHAR2(40)  PRIMARY KEY,
  instance_id     VARCHAR2(80)  NOT NULL REFERENCES outcome_instance(instance_id),
  dest_id         VARCHAR2(40)  NOT NULL REFERENCES destination_system(dest_id),
  commanded_at    TIMESTAMP    NOT NULL,
  completed_at    TIMESTAMP,
  result_locator  VARCHAR2(400),
  echo_ok         CHAR(1)                            -- Y only if completion echoed this run_id
);

-- ========== HUMAN + RTB ==========
CREATE TABLE notification (
  id              NUMBER(19) GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at      TIMESTAMP    NOT NULL,
  severity        VARCHAR2(20)  NOT NULL,
  transition      VARCHAR2(30)  NOT NULL,
  outcome_key     VARCHAR2(160) NOT NULL,             -- legacy: kit / YAML outcome id
  outcome_name    VARCHAR2(120),
  audience        VARCHAR2(120),
  title           VARCHAR2(300) NOT NULL,
  message         VARCHAR2(2000),
  channels        VARCHAR2(200),
  instance_id     VARCHAR2(80),
  group_unit_id   VARCHAR2(40)
);


CREATE INDEX idx_notif_instance ON notification (instance_id);

CREATE TABLE escalation (
  escalation_id   VARCHAR2(40)  PRIMARY KEY,
  instance_id     VARCHAR2(80)  NOT NULL REFERENCES outcome_instance(instance_id),
  kind            VARCHAR2(20)  NOT NULL,             -- DELAY | AGED | SLA | HUMAN
  opened_at       TIMESTAMP    NOT NULL,
  status          VARCHAR2(20)  DEFAULT 'OPEN' NOT NULL
);

CREATE TABLE feed_watermark (
  source_id       VARCHAR2(40)  NOT NULL REFERENCES source_system(source_id),
  partition_id    VARCHAR2(20)  NOT NULL,
  last_offset     VARCHAR2(40)  NOT NULL,
  lag_seconds     NUMBER(10),
  PRIMARY KEY (source_id, partition_id)
);

CREATE TABLE dead_letter (
  dead_letter_id  VARCHAR2(40)  PRIMARY KEY,
  source_id       VARCHAR2(40)  NOT NULL REFERENCES source_system(source_id),
  ingest_offset   VARCHAR2(80)  NOT NULL,
  reason          VARCHAR2(400) NOT NULL,             -- RFC 7807 title
  payload_ref     VARCHAR2(200),
  status          VARCHAR2(20)  DEFAULT 'HOLD' NOT NULL,
  instance_id     VARCHAR2(80)  REFERENCES outcome_instance(instance_id)
);

-- ========== ORIGIN CATALOG (now) / EXPLORER (later) ==========
CREATE TABLE dataset_locator (
  dataset_id      VARCHAR2(80)  PRIMARY KEY,
  group_unit_id   VARCHAR2(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  source_id       VARCHAR2(40)  NOT NULL REFERENCES source_system(source_id),
  instance_id     VARCHAR2(80)  REFERENCES outcome_instance(instance_id),
  locator_url     VARCHAR2(400) NOT NULL,
  registered_at   TIMESTAMP    NOT NULL
);

-- Phase 2 only — do not wire UI in first slice
CREATE TABLE analyst_view_def (
  view_id         VARCHAR2(80)  PRIMARY KEY,
  group_unit_id   VARCHAR2(40)  NOT NULL REFERENCES group_unit(group_unit_id),
  dataset_id      VARCHAR2(80)  NOT NULL REFERENCES dataset_locator(dataset_id),
  widget          VARCHAR2(20)  NOT NULL,             -- GRID | PIVOT | CHART
  field_map_json  VARCHAR2(4000) NOT NULL,
  cees_report     VARCHAR2(80)  NOT NULL,
  status          VARCHAR2(20)  DEFAULT 'UNUSED' NOT NULL
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
INSERT INTO group_unit VALUES ('REV-ACC', 'Revenue Accounting', 'Rev Acc', 'groupUnit:REV-ACC', 'APAC', 'ACTIVE');

INSERT INTO source_system VALUES ('CATS', 'CATS front office', 'TRADE', 'FEED', 'cats.movements.v1', 'cats-v1');
INSERT INTO source_system VALUES ('MOTIF', 'MOTIF ledger', 'LEDGER', 'FEED', 'motif.book.lifecycle.v3', 'motif-v3');
INSERT INTO source_system VALUES ('MBR', 'MBR / Rec Factory', 'BREAK', 'FEED', 'mbr.breaks.v2', 'mbr-v2');

INSERT INTO destination_system VALUES ('HELIX', 'Helix FOBO', 'COMMAND', 'http://helix/analysis');
INSERT INTO destination_system VALUES ('FAS_MOTIF', 'FAS post to MOTIF','COMMAND', 'http://fas/post');
INSERT INTO destination_system VALUES ('PNL_AGENT', 'P&L Agent notify', 'NOTIFY', NULL);

INSERT INTO product_kit VALUES ('FOBO', 'REV-ACC', 'Rev Acc', 'Can I execute this rec?', 'HELIX_RECON', 'SIGN_OFF,POST', 'product:FOBO', '19:00', 1, 'LIVE');

INSERT INTO kit_source VALUES ('FOBO', 'CATS', 'Y');
INSERT INTO kit_source VALUES ('FOBO', 'MOTIF', 'Y');
INSERT INTO kit_source VALUES ('FOBO', 'MBR', 'Y');

INSERT INTO kit_destination VALUES ('FOBO', 'HELIX', 1);
INSERT INTO kit_destination VALUES ('FOBO', 'FAS_MOTIF', 2);
INSERT INTO kit_destination VALUES ('FOBO', 'PNL_AGENT', 3);

INSERT INTO kit_embed VALUES ('FOBO', 'https://helix.example/fobo', 'https://helix.example', 'HOST');

INSERT INTO outcome_instance VALUES ('FOBO|2026-09-12|APAC|R-1042', 'FOBO', 'REV-ACC', DATE '2026-09-12', 'APAC', 'R-1042', 'READY', 'RUN-A37C', NULL, CURRENT_TIMESTAMP);
INSERT INTO outcome_instance VALUES ('FOBO|2026-09-12|EMEA|R-2031', 'FOBO', 'REV-ACC', DATE '2026-09-12', 'EMEA', 'R-2031', 'BLOCKED', NULL, 'MOTIF MB014 FAILED', CURRENT_TIMESTAMP);

INSERT INTO readiness_key VALUES ('FOBO|2026-09-12|APAC|R-1042', 'CATS', 'TR-8812', 'COMPLETED', 'EVT-CATS-8812');
INSERT INTO readiness_key VALUES ('FOBO|2026-09-12|APAC|R-1042', 'MOTIF', 'MB012', 'COMPLETED', 'EVT-MOTIF-MB012');
INSERT INTO readiness_key VALUES ('FOBO|2026-09-12|APAC|R-1042', 'MBR', 'BK-4410', 'COMPLETED', 'EVT-MBR-4410');
INSERT INTO readiness_key VALUES ('FOBO|2026-09-12|EMEA|R-2031', 'CATS', 'TR-9901', 'COMPLETED', 'EVT-CATS-9901');
INSERT INTO readiness_key VALUES ('FOBO|2026-09-12|EMEA|R-2031', 'MOTIF', 'MB014', 'FAILED', 'EVT-MOTIF-MB014');
INSERT INTO readiness_key VALUES ('FOBO|2026-09-12|EMEA|R-2031', 'MBR', 'BK-4420', 'WAITING', NULL);

INSERT INTO command_run VALUES ('RUN-A37C', 'FOBO|2026-09-12|APAC|R-1042', 'HELIX', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'helix://analysis/RUN-A37C', 'Y');

INSERT INTO dataset_locator VALUES ('DS-FOBO-R1042-BREAKS', 'REV-ACC', 'MBR', 'FOBO|2026-09-12|APAC|R-1042', 'helix://breaks/RUN-A37C', CURRENT_TIMESTAMP);
INSERT INTO dataset_locator VALUES ('DS-FOBO-CATS', 'REV-ACC', 'CATS', NULL, 'feed://cats.movements.v1', CURRENT_TIMESTAMP);
INSERT INTO dataset_locator VALUES ('DS-FOBO-MOTIF', 'REV-ACC', 'MOTIF', NULL, 'feed://motif.book.lifecycle.v3', CURRENT_TIMESTAMP);

INSERT INTO escalation VALUES ('ESC-19', 'FOBO|2026-09-12|EMEA|R-2031', 'DELAY', CURRENT_TIMESTAMP, 'OPEN');

INSERT INTO feed_watermark VALUES ('MOTIF', 'p3', '18442091', 12);
INSERT INTO feed_watermark VALUES ('CATS', 'p0', '99211', 4);
INSERT INTO feed_watermark VALUES ('MBR', 'p1', '4402', 0);

INSERT INTO dead_letter VALUES ('DL-4402', 'MOTIF', 'p3/18442099', 'state=PENDING_SIGN not in mapper', 'blob://dl/4402', 'HOLD', 'FOBO|2026-09-12|EMEA|R-2031');

INSERT INTO event_store (event_id, event_type, source_system, source_key, business_id_type, business_id, cross_refs_json, cob_date, region, status, occurred_at, received_at, attributes_json, instance_id, correlation_id, ingest_offset) VALUES ('EVT-CATS-8812', 'TRADE_BOOKED', 'CATS', 'TR-8812', 'TRADE', 'TR-8812', NULL, DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'FOBO|2026-09-12|APAC|R-1042', 'CORR-1042', 'p0/99200');
INSERT INTO event_store (event_id, event_type, source_system, source_key, business_id_type, business_id, cross_refs_json, cob_date, region, status, occurred_at, received_at, attributes_json, instance_id, correlation_id, ingest_offset) VALUES ('EVT-MOTIF-MB012','LEDGER_POSTED', 'MOTIF', 'MB012', 'LEDGER', 'MB012', NULL, DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'FOBO|2026-09-12|APAC|R-1042', 'CORR-1042', 'p3/18442080');
INSERT INTO event_store (event_id, event_type, source_system, source_key, business_id_type, business_id, cross_refs_json, cob_date, region, status, occurred_at, received_at, attributes_json, instance_id, correlation_id, ingest_offset) VALUES ('EVT-MBR-4410', 'BREAK_RAISED', 'MBR', 'BK-4410', 'BREAK', 'BK-4410', NULL, DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'FOBO|2026-09-12|APAC|R-1042', 'CORR-1042', 'p1/4398');
INSERT INTO event_store (event_id, event_type, source_system, source_key, business_id_type, business_id, cross_refs_json, cob_date, region, status, occurred_at, received_at, attributes_json, instance_id, correlation_id, ingest_offset) VALUES ('EVT-HELIX-A37C', 'HELIX_ANALYSIS_COMPLETE','HELIX', 'RUN-A37C','RUN', 'RUN-A37C',NULL, DATE '2026-09-12', 'APAC', 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'FOBO|2026-09-12|APAC|R-1042', 'RUN-A37C', NULL);
INSERT INTO event_store (event_id, event_type, source_system, source_key, business_id_type, business_id, cross_refs_json, cob_date, region, status, occurred_at, received_at, attributes_json, instance_id, correlation_id, ingest_offset) VALUES ('EVT-MOTIF-MB014','LEDGER_REJECTED', 'MOTIF', 'MB014', 'LEDGER', 'MB014', NULL, DATE '2026-09-12', 'EMEA', 'FAILED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 'FOBO|2026-09-12|EMEA|R-2031', 'CORR-2031', 'p3/18442099');

DELETE FROM notification WHERE instance_id IN (
  'FOBO|2026-09-12|APAC|R-1042',
  'FOBO|2026-09-12|EMEA|R-2031'
);

INSERT INTO notification (created_at, severity, transition, outcome_key, outcome_name, audience,
                          title, message, channels, instance_id, group_unit_id)
VALUES (CURRENT_TIMESTAMP, 'INFO', 'READY', 'FOBO', 'Can I execute this rec?', 'product:FOBO', 'FOBO R-1042 ready — sign off or post', 'Helix RUN-A37C echo_ok=Y. instance FOBO|2026-09-12|APAC|R-1042', 'SSE,BARCLAYS_NOW', 'FOBO|2026-09-12|APAC|R-1042', 'REV-ACC');
INSERT INTO notification (created_at, severity, transition, outcome_key, outcome_name, audience,
                          title, message, channels, instance_id, group_unit_id)
VALUES (CURRENT_TIMESTAMP, 'CRITICAL', 'BLOCKED', 'FOBO', 'Can I execute this rec?', 'platform.support', 'FOBO R-2031 blocked — MOTIF MB014 FAILED', 'Named key MOTIF MB014. Escalation ESC-19. Dead letter DL-4402.', 'SSE', 'FOBO|2026-09-12|EMEA|R-2031', 'REV-ACC');

-- ========== PROPAGATION (transactional outbox) + AUDIT ==========
-- event_route: Admin-governed fan-out. A fact whose event_type/source matches an enabled route is
-- copied to event_outbox for that subscriber. NULL event_type or source_id means "any" (wildcard).
CREATE TABLE event_route (
  route_id     VARCHAR2(40)  PRIMARY KEY,
  subscriber   VARCHAR2(80)  NOT NULL,             -- logical downstream consumer
  event_type   VARCHAR2(80),                       -- NULL = any event type
  source_id    VARCHAR2(40),                       -- NULL = any source system
  target_url   VARCHAR2(300),                      -- POC HTTP sink; NULL = in-app (SSE) delivery only
  description  VARCHAR2(200),
  enabled      CHAR(1)      DEFAULT 'Y' NOT NULL,
  created_at   TIMESTAMP    NOT NULL
);

-- event_outbox: one row per (fact x matching route). Written in the same flow that appends the fact,
-- so propagation cannot diverge from persistence. A relay dispatches PENDING rows at-least-once and the
-- subscriber de-duplicates on event_id. This is the propagation + audit trail for cross-system fan-out.
CREATE TABLE event_outbox (
  outbox_id     VARCHAR2(40)  PRIMARY KEY,
  event_id      VARCHAR2(120) NOT NULL,
  route_id      VARCHAR2(40)  NOT NULL,
  subscriber    VARCHAR2(80)  NOT NULL,
  event_type    VARCHAR2(80),
  source_id     VARCHAR2(40),
  target_url    VARCHAR2(300),
  payload_json  CLOB NOT NULL,
  status        VARCHAR2(20)  DEFAULT 'PENDING' NOT NULL,   -- PENDING | DISPATCHED | FAILED
  attempts      NUMBER(10)          DEFAULT 0 NOT NULL,
  created_at    TIMESTAMP    NOT NULL,
  dispatched_at TIMESTAMP,
  last_error    VARCHAR2(400)
);
CREATE INDEX idx_outbox_status ON event_outbox (status, created_at);
CREATE INDEX idx_outbox_event  ON event_outbox (event_id);

-- audit_log: every human command, entitlement decision and report open. Append-only, who/when/what/why.
CREATE TABLE audit_log (
  id           NUMBER(19) GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  at           TIMESTAMP    NOT NULL,
  actor        VARCHAR2(80)  NOT NULL,
  action       VARCHAR2(60)  NOT NULL,
  "RESOURCE"   VARCHAR2(200),                      -- RESOURCE is reserved in Oracle; quoted upper case is the same column on H2
  decision     VARCHAR2(20),                        -- OK | ALLOW | DENY
  detail_json  VARCHAR2(2000)
);
CREATE INDEX idx_audit_at ON audit_log (at DESC);

-- Seed subscribers (other systems that need our facts). ARCHIVE_STORE takes every fact for audit;
-- FINANCE_STORE wants ledger postings; PNL_FEED wants Helix rec completions. All POC-delivered to the
-- simulator sink so propagation is a real cross-process HTTP hop, not a mock in the same JVM.
INSERT INTO event_route VALUES ('RT-ARCHIVE', 'ARCHIVE_STORE', NULL, NULL, 'http://localhost:7081/sim/sink', 'Immutable archive of every business fact', 'Y', CURRENT_TIMESTAMP);
INSERT INTO event_route VALUES ('RT-FINSTORE', 'FINANCE_STORE', 'LEDGER_POSTED', 'MOTIF', 'http://localhost:7081/sim/sink', 'Finance Store consumes posted ledger books', 'Y', CURRENT_TIMESTAMP);
INSERT INTO event_route VALUES ('RT-PNL', 'PNL_FEED', NULL, 'HELIX', 'http://localhost:7081/sim/sink', 'P&L feed consumes Helix rec completions', 'Y', CURRENT_TIMESTAMP);
