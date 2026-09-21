-- Catalog products, variants, and category links.
-- Queryable columns cover CRUD + catalog filters; remaining legacy JSON
-- (media, visual-search fingerprints, reviews, stockHistory, YOLO, etc.)
-- lives in extra_data for a lossless round-trip with products.json.
--
-- Stable IDs: products.id and product_variants.id keep the existing JSON
-- string identifiers across migrate + dual-write. Do not rewrite those keys.

CREATE TABLE IF NOT EXISTS products (
  id                    TEXT PRIMARY KEY,
  admin_id              TEXT NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  approval_status       TEXT NOT NULL DEFAULT 'pending',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  original_price        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sales_price           NUMERIC(12, 2),
  stock                 INTEGER NOT NULL DEFAULT 0,
  sold                  INTEGER NOT NULL DEFAULT 0,
  barcode               TEXT NOT NULL DEFAULT '',
  category              TEXT NOT NULL DEFAULT '',
  rating                NUMERIC(4, 2) NOT NULL DEFAULT 0,
  comment_count         INTEGER NOT NULL DEFAULT 0,
  image_url             TEXT NOT NULL DEFAULT '',
  submitted_at          TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  approved_by           TEXT NOT NULL DEFAULT '',
  rejected_at           TIMESTAMPTZ,
  rejected_by           TEXT NOT NULL DEFAULT '',
  rejection_reason      TEXT NOT NULL DEFAULT '',
  approval_updated_at   TIMESTAMPTZ,
  extra_data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_admin_id
  ON products (admin_id);

CREATE INDEX IF NOT EXISTS idx_products_approval_status
  ON products (approval_status);

CREATE INDEX IF NOT EXISTS idx_products_admin_approval
  ON products (admin_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON products (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_updated_at
  ON products (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (category);

CREATE UNIQUE INDEX IF NOT EXISTS products_admin_barcode_key
  ON products (admin_id, barcode)
  WHERE barcode <> '';

CREATE TABLE IF NOT EXISTS product_variants (
  id                TEXT PRIMARY KEY,
  product_id        TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  quantity          TEXT NOT NULL DEFAULT '',
  image_url         TEXT NOT NULL DEFAULT '',
  original_price    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sales_price       NUMERIC(12, 2),
  stock             INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  add_ons           JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_category_id
  ON product_categories (category_id);
