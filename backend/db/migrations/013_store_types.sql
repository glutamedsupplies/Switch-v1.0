-- Global Super Admin business types / store types.
-- Products and seller profiles historically referenced these by name; this
-- table gives them stable IDs while keeping name uniqueness for JSON compat.

CREATE TABLE IF NOT EXISTS store_types (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  name_normalized   TEXT NOT NULL,
  platform_id       TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'active',
  commission_rate   NUMERIC(12, 4) NOT NULL DEFAULT 0,
  service_fee       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  hero_image_url    TEXT NOT NULL DEFAULT '',
  icon_image_url    TEXT NOT NULL DEFAULT '',
  icon_name         TEXT NOT NULL DEFAULT '',
  extra_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_types_name_normalized_key UNIQUE (name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_store_types_status
  ON store_types (status);

CREATE INDEX IF NOT EXISTS idx_store_types_platform
  ON store_types (platform_id);
