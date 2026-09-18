-- Switch accounts schema (Phase 1: customer/user auth + stubs for seller/employee)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
    CREATE TYPE account_role AS ENUM ('user', 'admin', 'employee', 'super_admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM (
      'active',
      'inactive',
      'pending',
      'on_leave',
      'probation',
      'restricted',
      'banned',
      'suspended',
      'locked',
      'deactivated',
      'deleted'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS accounts (
  id                    TEXT PRIMARY KEY,
  account_code          TEXT UNIQUE,
  role                  account_role NOT NULL,
  email                 TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  country_code          TEXT NOT NULL DEFAULT '+63',
  mobile_number         TEXT,
  status                account_status NOT NULL DEFAULT 'active',
  profile_image_url     TEXT NOT NULL DEFAULT '',
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  mobile_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at         TIMESTAMPTZ,
  last_active_at        TIMESTAMPTZ,
  password_updated_at   TIMESTAMPTZ,
  is_online             BOOLEAN NOT NULL DEFAULT FALSE,
  presence_status       TEXT NOT NULL DEFAULT 'offline',
  presence_updated_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_email_unique UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_mobile_unique_idx
  ON accounts (country_code, mobile_number)
  WHERE mobile_number IS NOT NULL AND mobile_number <> '';

CREATE INDEX IF NOT EXISTS idx_accounts_role_status ON accounts (role, status);

CREATE TABLE IF NOT EXISTS user_profiles (
  account_id      TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  middle_name     TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL,
  suffix          TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  date_of_birth   TEXT NOT NULL DEFAULT '',
  gender          TEXT NOT NULL DEFAULT '',
  username        TEXT NOT NULL DEFAULT '',
  gmail_binding   TEXT,
  face_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  admin_id        TEXT NOT NULL DEFAULT 'admin',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  account_id              TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  admin_id                TEXT NOT NULL UNIQUE,
  store_name              TEXT NOT NULL,
  store_type              TEXT NOT NULL DEFAULT '',
  plan_name               TEXT NOT NULL DEFAULT 'Free Plan',
  plan_status             TEXT NOT NULL DEFAULT 'active',
  first_name              TEXT NOT NULL DEFAULT '',
  middle_name             TEXT NOT NULL DEFAULT '',
  last_name               TEXT NOT NULL DEFAULT '',
  suffix                  TEXT NOT NULL DEFAULT '',
  ban_type                TEXT,
  ban_expires_at          TIMESTAMPTZ,
  restrict_expires_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_profiles (
  account_id        TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  admin_id          TEXT NOT NULL,
  employee_id       TEXT NOT NULL,
  position          TEXT NOT NULL,
  department        TEXT NOT NULL DEFAULT '',
  employment_type   TEXT NOT NULL DEFAULT 'Regular',
  employee_role     TEXT NOT NULL DEFAULT 'Employee',
  time_in           TEXT NOT NULL DEFAULT '',
  time_out          TEXT NOT NULL DEFAULT '',
  work_hours        NUMERIC(4,1) NOT NULL DEFAULT 8,
  supervisor        TEXT NOT NULL DEFAULT '',
  start_date        TEXT NOT NULL DEFAULT '',
  face_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  first_name        TEXT NOT NULL,
  middle_name       TEXT NOT NULL DEFAULT '',
  last_name         TEXT NOT NULL,
  suffix            TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_id_per_seller UNIQUE (admin_id, employee_id)
);

CREATE TABLE IF NOT EXISTS employee_permissions (
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  permission_key  TEXT NOT NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, permission_key)
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id              TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL DEFAULT '',
  label           TEXT NOT NULL DEFAULT '',
  file_name       TEXT NOT NULL DEFAULT '',
  file_extension  TEXT NOT NULL DEFAULT '',
  url             TEXT NOT NULL DEFAULT '',
  uploaded_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id              TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  role            account_role NOT NULL,
  admin_id        TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_account ON auth_sessions (account_id);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
