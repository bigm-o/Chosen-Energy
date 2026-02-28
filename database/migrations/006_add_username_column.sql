-- Migration: Add username column to users table
-- Date: 2024
-- Description: Add username field to support login by username (especially for drivers)

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

-- Update existing users to have username same as email for now (will be updated when drivers are created)
UPDATE users SET username = email WHERE username IS NULL;

-- Make username NOT NULL after populating existing records
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
