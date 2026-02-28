-- Add rejection_reason column to supplies table
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
