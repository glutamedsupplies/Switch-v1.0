CREATE TABLE IF NOT EXISTS seller_checkout_intents (
  id                  TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  company_id          TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id          TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscription_id     TEXT REFERENCES seller_subscriptions(id) ON DELETE SET NULL,
  plan_name           TEXT NOT NULL DEFAULT 'Starter Seller Plan',
  billing_cycle       TEXT NOT NULL DEFAULT 'monthly',
  amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code       TEXT NOT NULL DEFAULT 'PHP',
  payment_gateway     TEXT NOT NULL DEFAULT '',
  payment_reference   TEXT NOT NULL DEFAULT '',
  status              subscription_status NOT NULL DEFAULT 'pending_payment',
  checkout_url        TEXT NOT NULL DEFAULT '',
  expires_at          TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_checkout_intents_company
  ON seller_checkout_intents (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_checkout_intents_account
  ON seller_checkout_intents (account_id, created_at DESC);
