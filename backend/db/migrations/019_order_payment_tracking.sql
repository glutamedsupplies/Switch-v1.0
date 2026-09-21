-- Step 6 Integration prep: PayMongo idempotency columns + shipment tracking.
-- orders.id remains the stable server-generated order_group_id across dual-write
-- and JSON import (never rewritten when present). Payment adapters are not wired
-- in this migration; columns exist so checkout can attach later without a rewrite.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_checkout_session_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_idempotency_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_client_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT NOT NULL DEFAULT '';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_checkout_session_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_idempotency_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_client_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_intent_id_key
  ON orders (payment_intent_id)
  WHERE payment_intent_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_idempotency_key_key
  ON orders (payment_idempotency_key)
  WHERE payment_idempotency_key <> '';

CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id
  ON orders (payment_intent_id)
  WHERE payment_intent_id <> '';

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number
  ON orders (tracking_number)
  WHERE tracking_number <> '';

CREATE INDEX IF NOT EXISTS idx_order_items_tracking_number
  ON order_items (tracking_number)
  WHERE tracking_number <> '';
