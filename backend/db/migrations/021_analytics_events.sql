-- Step 5: append-only marketplace analytics events (migration 021).
-- Numbered 021 so 020 can own the payment_provider/payment_intent_id unique index.
-- Funnel: browse → cart → checkout → order → payment → pack/ship/cancel.
-- Client events (product_view, add_to_cart, begin_checkout) are ingested via
-- POST /api/analytics/events. Server lifecycle (place_order, payment_*, pack,
-- ship, cancel) is also written here when order status changes.
--
-- order_id FK is optional: browse/cart events have no order yet. Missing order
-- ids are stored as NULL so ingest never fails a batch on a stale client id.
-- product_id is not FK'd so views still record after a listing is removed.

CREATE TABLE IF NOT EXISTS analytics_events (
  id            TEXT PRIMARY KEY,
  admin_id      TEXT NOT NULL DEFAULT '',
  user_id       TEXT,
  session_id    TEXT,
  event_name    TEXT NOT NULL,
  product_id    TEXT,
  order_id      TEXT REFERENCES orders(id) ON DELETE SET NULL,
  properties    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_order_id
  ON analytics_events (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id
  ON analytics_events (product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_admin_id
  ON analytics_events (admin_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_admin_created
  ON analytics_events (admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events (created_at DESC);
