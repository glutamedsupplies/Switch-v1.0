-- Unified account capabilities + company membership layer.
-- Backward compatible with the legacy accounts.role values.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_capability') THEN
    CREATE TYPE account_capability AS ENUM (
      'buyer',
      'seller_admin',
      'supplier_admin',
      'employee',
      'super_admin'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_type') THEN
    CREATE TYPE company_type AS ENUM ('seller', 'supplier');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
    CREATE TYPE company_status AS ENUM (
      'draft',
      'pending_review',
      'active',
      'restricted',
      'banned',
      'deactivated',
      'deleted'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_membership_role') THEN
    CREATE TYPE company_membership_role AS ENUM (
      'owner',
      'seller_admin',
      'supplier_admin',
      'employee'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'draft',
      'pending_payment',
      'pending_review',
      'active',
      'past_due',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS account_capabilities (
  id              TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  capability      account_capability NOT NULL,
  granted_by      TEXT,
  granted_reason  TEXT NOT NULL DEFAULT '',
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_account_capabilities_account
  ON account_capabilities (account_id);

CREATE INDEX IF NOT EXISTS idx_account_capabilities_capability
  ON account_capabilities (capability);

CREATE TABLE IF NOT EXISTS companies (
  id                    TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  company_code          TEXT UNIQUE,
  type                  company_type NOT NULL,
  status                company_status NOT NULL DEFAULT 'draft',
  name                  TEXT NOT NULL,
  legal_name            TEXT NOT NULL DEFAULT '',
  public_name           TEXT NOT NULL DEFAULT '',
  masked_public_name    TEXT NOT NULL DEFAULT '',
  email                 TEXT NOT NULL DEFAULT '',
  country_code          TEXT NOT NULL DEFAULT '+63',
  mobile_number         TEXT NOT NULL DEFAULT '',
  logo_url              TEXT NOT NULL DEFAULT '',
  business_type         TEXT NOT NULL DEFAULT '',
  subscription_status   subscription_status NOT NULL DEFAULT 'draft',
  verification_status   TEXT NOT NULL DEFAULT 'unverified',
  source_account_id     TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  profile_data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_type_status
  ON companies (type, status);

CREATE INDEX IF NOT EXISTS idx_companies_source_account
  ON companies (source_account_id);

CREATE TABLE IF NOT EXISTS company_memberships (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  company_id        TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id        TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  membership_role   company_membership_role NOT NULL,
  membership_status account_status NOT NULL DEFAULT 'active',
  title             TEXT NOT NULL DEFAULT '',
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, account_id, membership_role)
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_account
  ON company_memberships (account_id);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company
  ON company_memberships (company_id);

CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id                    TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  company_id            TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name             TEXT NOT NULL DEFAULT 'Free Plan',
  status                subscription_status NOT NULL DEFAULT 'draft',
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly',
  payment_gateway       TEXT NOT NULL DEFAULT '',
  payment_reference     TEXT NOT NULL DEFAULT '',
  amount                NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code         TEXT NOT NULL DEFAULT 'PHP',
  started_at            TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  approved_by           TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_company
  ON seller_subscriptions (company_id);

CREATE TABLE IF NOT EXISTS supplier_profiles (
  company_id                TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  supplier_code             TEXT UNIQUE,
  contact_visibility_policy TEXT NOT NULL DEFAULT 'masked',
  minimum_order_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  lead_time_days            INTEGER NOT NULL DEFAULT 0,
  profile_data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Baseline capability backfill.
INSERT INTO account_capabilities (
  account_id,
  capability,
  granted_reason,
  metadata
)
SELECT
  a.id,
  'buyer'::account_capability,
  'baseline_account_backfill',
  jsonb_build_object('legacyRole', a.role::text)
FROM accounts a
WHERE a.role IN ('user', 'admin', 'super_admin')
ON CONFLICT (account_id, capability) DO NOTHING;

INSERT INTO account_capabilities (
  account_id,
  capability,
  granted_reason,
  metadata
)
SELECT
  a.id,
  'employee'::account_capability,
  'legacy_employee_backfill',
  jsonb_build_object('legacyRole', a.role::text)
FROM accounts a
WHERE a.role = 'employee'
ON CONFLICT (account_id, capability) DO NOTHING;

INSERT INTO account_capabilities (
  account_id,
  capability,
  granted_reason,
  metadata
)
SELECT
  a.id,
  'seller_admin'::account_capability,
  'legacy_seller_backfill',
  jsonb_build_object('legacyRole', a.role::text, 'adminId', s.admin_id)
FROM accounts a
INNER JOIN seller_profiles s ON s.account_id = a.id
WHERE a.role = 'admin'
ON CONFLICT (account_id, capability) DO NOTHING;

INSERT INTO account_capabilities (
  account_id,
  capability,
  granted_reason,
  metadata
)
SELECT
  a.id,
  'super_admin'::account_capability,
  'legacy_super_admin_backfill',
  jsonb_build_object('legacyRole', a.role::text)
FROM accounts a
WHERE a.role = 'super_admin'
ON CONFLICT (account_id, capability) DO NOTHING;

-- Backfill seller companies from seller profiles.
INSERT INTO companies (
  id,
  company_code,
  type,
  status,
  name,
  legal_name,
  public_name,
  masked_public_name,
  email,
  country_code,
  mobile_number,
  logo_url,
  business_type,
  subscription_status,
  verification_status,
  source_account_id,
  profile_data,
  created_at,
  updated_at
)
SELECT
  CONCAT('comp_', s.admin_id),
  s.admin_id,
  'seller'::company_type,
  CASE
    WHEN a.status::text IN ('banned', 'restricted', 'deactivated', 'deleted') THEN a.status::text::company_status
    WHEN a.status::text = 'active' THEN 'active'::company_status
    ELSE 'pending_review'::company_status
  END,
  COALESCE(NULLIF(TRIM(s.store_name), ''), 'Store'),
  COALESCE(NULLIF(TRIM(s.store_name), ''), 'Store'),
  COALESCE(NULLIF(TRIM(s.store_name), ''), 'Store'),
  CONCAT('Seller ', RIGHT(COALESCE(NULLIF(TRIM(s.admin_id), ''), a.id), 4)),
  a.email,
  a.country_code,
  COALESCE(a.mobile_number, ''),
  COALESCE(a.profile_image_url, ''),
  COALESCE(NULLIF(TRIM(s.store_type), ''), ''),
  CASE
    WHEN LOWER(COALESCE(s.plan_status, '')) IN ('active', 'pending_review', 'pending_payment', 'expired', 'cancelled', 'past_due') THEN LOWER(s.plan_status)::subscription_status
    WHEN LOWER(COALESCE(s.plan_status, '')) = 'pending' THEN 'pending_review'::subscription_status
    ELSE 'active'::subscription_status
  END,
  CASE
    WHEN a.email_verified OR a.mobile_verified THEN 'verified'
    ELSE 'unverified'
  END,
  a.id,
  COALESCE(s.profile_data, '{}'::jsonb),
  COALESCE(s.created_at, a.created_at, NOW()),
  COALESCE(s.updated_at, a.updated_at, NOW())
FROM seller_profiles s
INNER JOIN accounts a ON a.id = s.account_id
ON CONFLICT (id) DO NOTHING;

-- Link seller owners.
INSERT INTO company_memberships (
  company_id,
  account_id,
  membership_role,
  membership_status,
  title,
  is_primary,
  metadata,
  created_at,
  updated_at
)
SELECT
  CONCAT('comp_', s.admin_id),
  s.account_id,
  'owner'::company_membership_role,
  a.status,
  'Owner',
  TRUE,
  jsonb_build_object('legacyAdminId', s.admin_id),
  COALESCE(s.created_at, a.created_at, NOW()),
  COALESCE(s.updated_at, a.updated_at, NOW())
FROM seller_profiles s
INNER JOIN accounts a ON a.id = s.account_id
ON CONFLICT (company_id, account_id, membership_role) DO NOTHING;

-- Link seller employees to the seller company identified by admin_id.
INSERT INTO company_memberships (
  company_id,
  account_id,
  membership_role,
  membership_status,
  title,
  is_primary,
  metadata,
  created_at,
  updated_at
)
SELECT
  CONCAT('comp_', e.admin_id),
  e.account_id,
  'employee'::company_membership_role,
  a.status,
  COALESCE(NULLIF(TRIM(e.position), ''), 'Employee'),
  FALSE,
  jsonb_build_object(
    'legacyAdminId', e.admin_id,
    'legacyEmployeeId', e.employee_id,
    'department', e.department,
    'employeeRole', e.employee_role
  ),
  COALESCE(e.created_at, a.created_at, NOW()),
  COALESCE(e.updated_at, a.updated_at, NOW())
FROM employee_profiles e
INNER JOIN accounts a ON a.id = e.account_id
INNER JOIN companies c ON c.id = CONCAT('comp_', e.admin_id)
ON CONFLICT (company_id, account_id, membership_role) DO NOTHING;

-- Backfill one seller subscription row per existing seller company.
INSERT INTO seller_subscriptions (
  company_id,
  plan_name,
  status,
  billing_cycle,
  started_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  CONCAT('comp_', s.admin_id),
  COALESCE(NULLIF(TRIM(s.plan_name), ''), 'Free Plan'),
  CASE
    WHEN LOWER(COALESCE(s.plan_status, '')) IN ('active', 'pending_review', 'pending_payment', 'expired', 'cancelled', 'past_due') THEN LOWER(s.plan_status)::subscription_status
    WHEN LOWER(COALESCE(s.plan_status, '')) = 'pending' THEN 'pending_review'::subscription_status
    ELSE 'active'::subscription_status
  END,
  'monthly',
  s.created_at,
  jsonb_build_object('legacyPlanStatus', s.plan_status),
  COALESCE(s.created_at, NOW()),
  COALESCE(s.updated_at, NOW())
FROM seller_profiles s
ON CONFLICT DO NOTHING;
