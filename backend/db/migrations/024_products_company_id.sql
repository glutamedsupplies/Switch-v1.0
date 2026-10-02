-- Scope catalog products to companies so multi-company sellers get
-- isolated listings per company (Add company = empty workspace).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Legacy products: prefer companies.id = 'comp_' || admin_id (006 backfill).
UPDATE products p
SET company_id = CONCAT('comp_', p.admin_id)
WHERE (p.company_id IS NULL OR BTRIM(p.company_id) = '')
  AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = CONCAT('comp_', p.admin_id)
  );

-- Remaining: primary seller membership for the account matching admin_id.
UPDATE products p
SET company_id = m.company_id
FROM company_memberships m
WHERE (p.company_id IS NULL OR BTRIM(p.company_id) = '')
  AND m.account_id = p.admin_id
  AND m.membership_role IN ('owner', 'seller_admin')
  AND m.is_primary IS TRUE;

-- Remaining: any seller membership for that account (newest company).
UPDATE products p
SET company_id = scoped.company_id
FROM (
  SELECT DISTINCT ON (m.account_id)
    m.account_id,
    m.company_id
  FROM company_memberships m
  WHERE m.membership_role IN ('owner', 'seller_admin')
  ORDER BY
    m.account_id,
    m.is_primary DESC,
    m.updated_at DESC NULLS LAST,
    m.created_at DESC NULLS LAST
) scoped
WHERE (p.company_id IS NULL OR BTRIM(p.company_id) = '')
  AND scoped.account_id = p.admin_id;

CREATE INDEX IF NOT EXISTS idx_products_company_id
  ON products (company_id);

CREATE INDEX IF NOT EXISTS idx_products_company_approval
  ON products (company_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_products_admin_company
  ON products (admin_id, company_id);
