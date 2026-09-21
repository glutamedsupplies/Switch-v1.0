-- Order groups (server-generated order_group_id) + line items.
-- JSON orders.json is a flat array of line items grouped by createdAtEpochMs.
-- New writes get an opaque og_* group id; created_at_epoch_ms is retained so
-- existing pack/ship/cancel/waybill clients keep working.
--
-- Stable IDs: order_items.id is the JSON line id and never changes on import.
-- orders.id = order_group_id (server-generated, stable across dual-write and
-- cutover). If JSON already has orderGroupId, that value is kept; otherwise
-- migrate uses a deterministic og_* from adminId+accountId+createdAtEpochMs
-- so re-running import does not mint a new group key.
-- Payment intent / tracking columns are added in 019 (Step 6 prep).

CREATE TABLE IF NOT EXISTS orders (
  id                    TEXT PRIMARY KEY,
  order_group_id        TEXT NOT NULL,
  admin_id              TEXT NOT NULL,
  account_id            TEXT NOT NULL,
  created_at_epoch_ms   BIGINT NOT NULL DEFAULT 0,
  stage                 TEXT NOT NULL DEFAULT 'toPay',
  extra_data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_order_group_id_key UNIQUE (order_group_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_admin_id
  ON orders (admin_id);

CREATE INDEX IF NOT EXISTS idx_orders_account_id
  ON orders (account_id);

CREATE INDEX IF NOT EXISTS idx_orders_admin_account
  ON orders (admin_id, account_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_epoch_ms
  ON orders (created_at_epoch_ms DESC);

CREATE INDEX IF NOT EXISTS idx_orders_stage
  ON orders (stage);

CREATE TABLE IF NOT EXISTS order_items (
  id                    TEXT PRIMARY KEY,
  order_group_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  admin_id              TEXT NOT NULL,
  account_id            TEXT NOT NULL,
  product_id            TEXT NOT NULL DEFAULT '',
  variant_id            TEXT NOT NULL DEFAULT '',
  quantity              INTEGER NOT NULL DEFAULT 1,
  unit_price            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stage                 TEXT NOT NULL DEFAULT 'toPay',
  created_at_epoch_ms   BIGINT NOT NULL DEFAULT 0,
  extra_data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_group_id
  ON order_items (order_group_id);

CREATE INDEX IF NOT EXISTS idx_order_items_admin_id
  ON order_items (admin_id);

CREATE INDEX IF NOT EXISTS idx_order_items_account_id
  ON order_items (account_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_created_at
  ON order_items (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_created_at_epoch_ms
  ON order_items (created_at_epoch_ms DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_stage
  ON order_items (stage);

CREATE INDEX IF NOT EXISTS idx_order_items_admin_account
  ON order_items (admin_id, account_id);
