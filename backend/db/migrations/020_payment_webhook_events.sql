-- Durable webhook idempotency ledger. A provider event may be retried many
-- times; only the first active claim is allowed to mutate payment state.

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider       TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  event_type     TEXT NOT NULL DEFAULT '',
  livemode       BOOLEAN NOT NULL DEFAULT FALSE,
  payload_hash   TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'processing'
                 CHECK (status IN ('processing', 'processed', 'failed')),
  attempts       INTEGER NOT NULL DEFAULT 1,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ,
  last_error     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_received
  ON payment_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status
  ON payment_webhook_events (status, received_at DESC);
