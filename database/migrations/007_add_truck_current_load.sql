-- Add current_load column to trucks table
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS current_load DECIMAL(10,2) DEFAULT 0.00;
