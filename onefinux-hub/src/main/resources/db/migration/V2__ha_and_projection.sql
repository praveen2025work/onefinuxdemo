-- HA support (Flyway V2)
--
-- shedlock: distributed lock table so only one node runs each @Scheduled job (the outbox relay and
-- the SLA clock). Without it, N replicas would double-dispatch propagations and raise duplicate SLA
-- breach events. This is the standard ShedLock JdbcTemplateLockProvider table.
CREATE TABLE IF NOT EXISTS shedlock (
  name       VARCHAR(64)  NOT NULL,
  lock_until TIMESTAMP    NOT NULL,
  locked_at  TIMESTAMP    NOT NULL,
  locked_by  VARCHAR(255) NOT NULL,
  PRIMARY KEY (name)
);

-- outcome_projection: a durable snapshot of the outcome board. The engine folds events in memory
-- (single writer, replay-rebuildable); on every change it also upserts the view here so a restarting
-- node, a second replica, or a reporting consumer can read the last known board straight from the
-- database without waiting for a full replay. The JSON is the same OutcomeView the API/SSE serve.
CREATE TABLE IF NOT EXISTS outcome_projection (
  instance_key VARCHAR(120) PRIMARY KEY,
  outcome_id   VARCHAR(60)  NOT NULL,
  cob_date     DATE         NOT NULL,
  region       VARCHAR(20)  NOT NULL,
  status       VARCHAR(20)  NOT NULL,
  view_json    VARCHAR(8000) NOT NULL,
  updated_at   TIMESTAMP    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projection_cob ON outcome_projection (cob_date, status);
