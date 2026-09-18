-- Extra JSON payload columns for seller/employee compatibility with legacy accounts.json

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS access_permissions TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS access_permission_granted_at JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS access_permissions_configured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS e_document JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_employee_profiles_employee_id_lower
  ON employee_profiles (lower(employee_id));

CREATE INDEX IF NOT EXISTS idx_seller_profiles_admin_id
  ON seller_profiles (admin_id);
