-- Monthly hit counts for Top / Trending Searches
CREATE TABLE IF NOT EXISTS trending_search_monthly (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  term              TEXT NOT NULL,
  term_normalized   TEXT NOT NULL,
  month_key         TEXT NOT NULL,
  hit_count         BIGINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trending_search_monthly_term_month_key UNIQUE (term_normalized, month_key)
);

CREATE INDEX IF NOT EXISTS idx_trending_search_monthly_month_hits
  ON trending_search_monthly (month_key, hit_count DESC, updated_at DESC);
