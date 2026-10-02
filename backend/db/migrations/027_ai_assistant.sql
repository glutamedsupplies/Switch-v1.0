-- Role-aware Switch AI assistant: structured sessions, message history,
-- tool-call audit log, and the server-side cart used by AI checkout.
-- Never store payment credentials, OTPs, CVVs, or passwords in these tables;
-- the service redacts them before anything is written.

CREATE TABLE IF NOT EXISTS ai_assistant_sessions (
  id            TEXT PRIMARY KEY,
  user_key      TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'rider')),
  account_id    TEXT NOT NULL DEFAULT '',
  admin_id      TEXT NOT NULL DEFAULT '',
  company_id    TEXT NOT NULL DEFAULT '',
  rider_id      TEXT NOT NULL DEFAULT '',
  session_type  TEXT NOT NULL DEFAULT 'assistant',
  state         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_assistant_sessions_owner
  ON ai_assistant_sessions (user_key, role, admin_id);

CREATE TABLE IF NOT EXISTS ai_assistant_messages (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES ai_assistant_sessions(id) ON DELETE CASCADE,
  author        TEXT NOT NULL CHECK (author IN ('user', 'assistant')),
  text          TEXT NOT NULL DEFAULT '',
  blocks        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_assistant_messages_session
  ON ai_assistant_messages (session_id, id DESC);

CREATE TABLE IF NOT EXISTS ai_action_log (
  id            BIGSERIAL PRIMARY KEY,
  user_key      TEXT NOT NULL,
  role          TEXT NOT NULL,
  account_id    TEXT NOT NULL DEFAULT '',
  admin_id      TEXT NOT NULL DEFAULT '',
  rider_id      TEXT NOT NULL DEFAULT '',
  tool          TEXT NOT NULL,
  risk          TEXT NOT NULL DEFAULT 'low',
  source        TEXT NOT NULL DEFAULT '',
  entity_type   TEXT NOT NULL DEFAULT '',
  entity_id     TEXT NOT NULL DEFAULT '',
  ok            BOOLEAN NOT NULL DEFAULT TRUE,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  request       JSONB NOT NULL DEFAULT '{}'::jsonb,
  result        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_log_user_time
  ON ai_action_log (user_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_log_tool_time
  ON ai_action_log (tool, created_at DESC);

CREATE TABLE IF NOT EXISTS buyer_carts (
  account_id    TEXT PRIMARY KEY,
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
