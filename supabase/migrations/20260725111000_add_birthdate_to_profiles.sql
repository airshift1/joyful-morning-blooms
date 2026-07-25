-- Add birthdate column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Update type info in case of any required migrations (no-op)

-- You can run this migration in Supabase SQL editor or via your migration tooling.