-- Google/social identity linking + registration verification codes

CREATE TABLE IF NOT EXISTS auth_identities (
  id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  account_id        TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,
  provider_subject  TEXT NOT NULL,
  email             TEXT NOT NULL DEFAULT '',
  profile_data      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_identities_provider_subject_unique UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_account
  ON auth_identities (account_id);

CREATE INDEX IF NOT EXISTS idx_auth_identities_email
  ON auth_identities (lower(email));

CREATE TABLE IF NOT EXISTS registration_verification_codes (
  id              TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  purpose         TEXT NOT NULL DEFAULT 'registration',
  channel         TEXT NOT NULL DEFAULT 'email',
  target          TEXT NOT NULL,
  code_hash       TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registration_verification_active
  ON registration_verification_codes (purpose, channel, target)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS registration_verification_tokens (
  id              TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  purpose         TEXT NOT NULL DEFAULT 'registration',
  channel         TEXT NOT NULL DEFAULT 'email',
  target          TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registration_verification_tokens_active
  ON registration_verification_tokens (purpose, target)
  WHERE consumed_at IS NULL;
