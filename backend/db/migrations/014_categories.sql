-- Categories used by store types (taxonomy) and products (tenant catalog).
-- Prefer IDs over name-only joins; names stay unique within a store type or
-- within an admin workspace when store_type_id is null.

CREATE TABLE IF NOT EXISTS categories (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  name_normalized   TEXT NOT NULL,
  admin_id          TEXT NOT NULL DEFAULT '',
  store_type_id     TEXT REFERENCES store_types(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'active',
  image_url         TEXT NOT NULL DEFAULT '',
  icon_image_url    TEXT NOT NULL DEFAULT '',
  icon_name         TEXT NOT NULL DEFAULT '',
  product_count     INTEGER NOT NULL DEFAULT 0,
  extra_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_store_type_name_key
  ON categories (store_type_id, name_normalized)
  WHERE store_type_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_admin_name_key
  ON categories (admin_id, name_normalized)
  WHERE store_type_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_admin_id
  ON categories (admin_id);

CREATE INDEX IF NOT EXISTS idx_categories_store_type_id
  ON categories (store_type_id);

CREATE INDEX IF NOT EXISTS idx_categories_status
  ON categories (status);
