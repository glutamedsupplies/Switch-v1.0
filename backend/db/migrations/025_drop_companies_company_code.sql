-- Companies use `id` as the only public company identity.
-- Drop legacy company_code so new and existing DBs only expose Company ID.

ALTER TABLE companies
  DROP COLUMN IF EXISTS company_code;
