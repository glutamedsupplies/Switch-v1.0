-- One trending hit per user (or guest device) per term per month
CREATE TABLE IF NOT EXISTS trending_search_unique_hits (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  actor_key         TEXT NOT NULL,
  term_normalized   TEXT NOT NULL,
  month_key         TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trending_search_unique_hits_actor_term_month_key
    UNIQUE (actor_key, term_normalized, month_key)
);

CREATE INDEX IF NOT EXISTS idx_trending_search_unique_hits_month_term
  ON trending_search_unique_hits (month_key, term_normalized);
