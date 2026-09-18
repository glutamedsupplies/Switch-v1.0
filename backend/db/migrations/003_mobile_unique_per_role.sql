-- Mobile uniqueness should be per role (users/admins), not global across all accounts.
-- Employees keep uniqueness scoped in application code (per admin_id).

DROP INDEX IF EXISTS accounts_mobile_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_mobile_unique_user_idx
  ON accounts (country_code, mobile_number)
  WHERE role = 'user'
    AND mobile_number IS NOT NULL
    AND mobile_number <> '';

CREATE UNIQUE INDEX IF NOT EXISTS accounts_mobile_unique_admin_idx
  ON accounts (country_code, mobile_number)
  WHERE role = 'admin'
    AND mobile_number IS NOT NULL
    AND mobile_number <> '';
