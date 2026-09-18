-- Google Instant Sign-In accounts do not set a local password until the user
-- chooses one later (account settings / forgot password).
ALTER TABLE accounts
  ALTER COLUMN password_hash DROP NOT NULL;
