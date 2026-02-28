-- Add missing rejection_reason column to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
