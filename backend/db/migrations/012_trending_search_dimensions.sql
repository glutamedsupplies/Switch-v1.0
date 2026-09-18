-- Dimensional monthly search aggregates for Super Admin filter-by
-- (platform, category, store type, client).

CREATE TABLE IF NOT EXISTS trending_search_dim_monthly (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  term              TEXT NOT NULL,
  term_normalized   TEXT NOT NULL,
  month_key         TEXT NOT NULL,
  platform_id       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT '',
  store_type        TEXT NOT NULL DEFAULT '',
  client            TEXT NOT NULL DEFAULT '',
  hit_count         BIGINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trending_search_dim_monthly_unique
    UNIQUE (term_normalized, month_key, platform_id, category, store_type, client)
);

CREATE INDEX IF NOT EXISTS idx_trending_search_dim_monthly_month
  ON trending_search_dim_monthly (month_key, hit_count DESC);

CREATE INDEX IF NOT EXISTS idx_trending_search_dim_monthly_platform
  ON trending_search_dim_monthly (month_key, platform_id);

CREATE INDEX IF NOT EXISTS idx_trending_search_dim_monthly_category
  ON trending_search_dim_monthly (month_key, category);

CREATE INDEX IF NOT EXISTS idx_trending_search_dim_monthly_client
  ON trending_search_dim_monthly (month_key, client);

CREATE TABLE IF NOT EXISTS trending_search_dim_unique_hits (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  actor_key         TEXT NOT NULL,
  term_normalized   TEXT NOT NULL,
  month_key         TEXT NOT NULL,
  platform_id       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT '',
  store_type        TEXT NOT NULL DEFAULT '',
  client            TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trending_search_dim_unique_hits_unique
    UNIQUE (
      actor_key,
      term_normalized,
      month_key,
      platform_id,
      category,
      store_type,
      client
    )
);

CREATE INDEX IF NOT EXISTS idx_trending_search_dim_unique_hits_month
  ON trending_search_dim_unique_hits (month_key, term_normalized);
