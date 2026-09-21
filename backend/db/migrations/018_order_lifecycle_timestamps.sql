-- Step 5 prep: first-class lifecycle timestamps for the browse→cart→order→pay→ship
-- funnel, plus indexes on product approval times that already exist as columns.
--
-- Order stages in this codebase:
--   toPay → (awaitingWaybill) → toPrepare → toShip → toReceive → toReview
--   plus returnRequest and cancelled.
-- Mapping:
--   paid_at      left toPay (toPrepare / awaitingWaybill / later)
--   packed_at    pack endpoint, stage toShip
--   shipped_at   ship endpoint, stage toReceive
--   received_at  customerReceivedAtEpochMs / stage toReview
--   cancelled_at stage cancelled
--   return_requested_at stage returnRequest
--
-- IDs: products.id, product_variants.id, orders.id (= order_group_id), and
-- order_items.id are application-assigned TEXT keys. Existing JSON string IDs
-- are kept on import and dual-write; they are never regenerated when present.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waybill_printed_at TIMESTAMPTZ;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waybill_printed_at TIMESTAMPTZ;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_paid_at
  ON orders (paid_at DESC)
  WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_packed_at
  ON orders (packed_at DESC)
  WHERE packed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shipped_at
  ON orders (shipped_at DESC)
  WHERE shipped_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at
  ON orders (cancelled_at DESC)
  WHERE cancelled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_received_at
  ON orders (received_at DESC)
  WHERE received_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_paid_at
  ON order_items (paid_at DESC)
  WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_packed_at
  ON order_items (packed_at DESC)
  WHERE packed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_shipped_at
  ON order_items (shipped_at DESC)
  WHERE shipped_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_cancelled_at
  ON order_items (cancelled_at DESC)
  WHERE cancelled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_submitted_at
  ON products (submitted_at DESC)
  WHERE submitted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_approved_at
  ON products (approved_at DESC)
  WHERE approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_rejected_at
  ON products (rejected_at DESC)
  WHERE rejected_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_listed_at
  ON products (listed_at DESC)
  WHERE listed_at IS NOT NULL;
