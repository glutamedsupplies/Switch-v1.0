-- Durable, tenant-scoped product funnel events used by analytics summaries.

CREATE TABLE IF NOT EXISTS analytics_events (
  id              TEXT PRIMARY KEY,
  event_name      TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL,
  admin_id        TEXT NOT NULL,
  account_id      TEXT NOT NULL DEFAULT '',
  anonymous_id    TEXT NOT NULL DEFAULT '',
  session_id      TEXT NOT NULL DEFAULT '',
  product_id      TEXT NOT NULL DEFAULT '',
  order_group_id  TEXT NOT NULL DEFAULT '',
  platform_id     TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT '',
  properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_time
  ON analytics_events (admin_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_name_time
  ON analytics_events (admin_id, event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_product_time
  ON analytics_events (admin_id, product_id, occurred_at DESC)
  WHERE product_id <> '';

CREATE INDEX IF NOT EXISTS idx_analytics_events_order_group
  ON analytics_events (admin_id, order_group_id)
  WHERE order_group_id <> '';
