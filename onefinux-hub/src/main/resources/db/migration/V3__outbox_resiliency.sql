-- Outbox resiliency (Flyway V3)
--
-- next_attempt_at drives exponential backoff: a failed row is retried automatically only once this
-- timestamp has passed. Terminal status 'DEAD' is the dead-letter: a row that exhausted its retries and
-- needs an operator to redrive it (or fix the subscriber) — it is no longer retried automatically.
ALTER TABLE event_outbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP;

-- Backfill existing rows so they remain immediately eligible.
UPDATE event_outbox SET next_attempt_at = created_at WHERE next_attempt_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_due ON event_outbox (status, next_attempt_at);
