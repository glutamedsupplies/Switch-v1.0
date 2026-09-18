-- Trending / Top Searches (manual SA pins + organic hit counts)
CREATE TABLE IF NOT EXISTS trending_searches (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  term              TEXT NOT NULL,
  term_normalized   TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_manual         BOOLEAN NOT NULL DEFAULT FALSE,
  manual_rank       INTEGER NOT NULL DEFAULT 0,
  hit_count         BIGINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trending_searches_term_normalized_key UNIQUE (term_normalized)
);

CREATE INDEX IF NOT EXISTS idx_trending_searches_active_rank
  ON trending_searches (is_active, manual_rank DESC, hit_count DESC, updated_at DESC);

-- Per-user / guest recent search history
CREATE TABLE IF NOT EXISTS user_search_history (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  account_id        TEXT NOT NULL DEFAULT '',
  client_key        TEXT NOT NULL DEFAULT '',
  search_term       TEXT NOT NULL,
  term_normalized   TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_search_history_account
  ON user_search_history (account_id, created_at DESC)
  WHERE account_id <> '';

CREATE INDEX IF NOT EXISTS idx_user_search_history_client
  ON user_search_history (client_key, created_at DESC)
  WHERE client_key <> '';
