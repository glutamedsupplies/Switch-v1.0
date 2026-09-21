-- Step 4.1 follow-up: composite partial UNIQUE on (payment_provider, payment_intent_id)
-- for multi-provider PayMongo / idempotency safety (Martin Integration).
--
-- 019 already has:
--   UNIQUE orders (payment_intent_id) WHERE payment_intent_id <> ''
--   UNIQUE orders (payment_idempotency_key) WHERE payment_idempotency_key <> ''
-- Those stay. The single-column intent unique is stricter (the same intent id
-- cannot appear under two providers). The composite does not replace it; both
-- coexist with no conflict. Empty strings are excluded so unpaid / unsettled
-- rows do not collide.
--
-- order_items has the same payment_provider / payment_intent_id columns (copied
-- onto each line for the flat API). A UNIQUE index there is not safe: several
-- lines in one checkout share the same (provider, intent). Uniqueness stays on
-- the order group (`orders`).

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_provider_intent_id_key
  ON orders (payment_provider, payment_intent_id)
  WHERE payment_provider <> '' AND payment_intent_id <> '';
