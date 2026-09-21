-- Inventory ledger. Product stockHistory and order.inventoryMovements remain
-- in extra_data for API compatibility; this table is the durable movement log.

CREATE TABLE IF NOT EXISTS inventory_movements (
  id                TEXT PRIMARY KEY,
  admin_id          TEXT NOT NULL DEFAULT '',
  account_id        TEXT NOT NULL DEFAULT '',
  product_id        TEXT NOT NULL DEFAULT '',
  variant_id        TEXT NOT NULL DEFAULT '',
  order_group_id    TEXT,
  order_item_id     TEXT,
  quantity          INTEGER NOT NULL DEFAULT 0,
  direction         TEXT NOT NULL,
  reason            TEXT NOT NULL DEFAULT '',
  role              TEXT NOT NULL DEFAULT 'main',
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  extra_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_movements_direction_check
    CHECK (direction IN ('deduct', 'restore', 'restock', 'adjust'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_admin_id
  ON inventory_movements (admin_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_account_id
  ON inventory_movements (account_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id
  ON inventory_movements (product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_group_id
  ON inventory_movements (order_group_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_item_id
  ON inventory_movements (order_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at
  ON inventory_movements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred_at
  ON inventory_movements (occurred_at DESC);
