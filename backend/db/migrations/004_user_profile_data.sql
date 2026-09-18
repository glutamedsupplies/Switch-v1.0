-- Buyer/user moderation and extra fields used by Super Admin UI

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;
