-- Phase B: durable chat threads + messages.
-- Stable IDs: chat_threads.id = threadId; chat_messages.id = message id.
-- Typing, product/customer snapshot leftovers, and future agent/reaction
-- fields live in JSONB extra_data / typing.

CREATE TABLE IF NOT EXISTS chat_threads (
  id                         TEXT PRIMARY KEY,
  admin_id                   TEXT NOT NULL,
  customer_id                TEXT NOT NULL,
  product_id                 TEXT NOT NULL DEFAULT '',
  customer_label             TEXT NOT NULL DEFAULT 'App User',
  product_name               TEXT NOT NULL DEFAULT '',
  company_name               TEXT NOT NULL DEFAULT '',
  employee_rating            NUMERIC(4, 2) NOT NULL DEFAULT 0,
  employee_rating_comment    TEXT NOT NULL DEFAULT '',
  employee_rating_updated_at TIMESTAMPTZ,
  last_read_at               TIMESTAMPTZ,
  support_read_at            TIMESTAMPTZ,
  typing                     JSONB NOT NULL DEFAULT '{}'::jsonb,
  extra_data                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_admin_id
  ON chat_threads (admin_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_customer_id
  ON chat_threads (customer_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_admin_customer
  ON chat_threads (admin_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_admin_product
  ON chat_threads (admin_id, product_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at
  ON chat_threads (updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                TEXT PRIMARY KEY,
  thread_id         TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  admin_id          TEXT NOT NULL,
  customer_id       TEXT NOT NULL DEFAULT '',
  text              TEXT NOT NULL DEFAULT '',
  image_url         TEXT NOT NULL DEFAULT '',
  image_name        TEXT NOT NULL DEFAULT '',
  content_type      TEXT NOT NULL DEFAULT '',
  is_from_support   BOOLEAN NOT NULL DEFAULT FALSE,
  source            TEXT NOT NULL DEFAULT 'user',
  sender_name       TEXT NOT NULL DEFAULT '',
  sender_role       TEXT NOT NULL DEFAULT '',
  sender_id         TEXT NOT NULL DEFAULT '',
  sender_avatar_url TEXT NOT NULL DEFAULT '',
  reply_to          JSONB,
  edited_at         TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ NOT NULL,
  extra_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_sent
  ON chat_messages (thread_id, sent_at ASC, id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_admin_id
  ON chat_messages (admin_id);
