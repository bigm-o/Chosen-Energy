-- Migration: 012_add_supply_edit_fields.sql
-- Add fields needed for Feature 4 (Edit Tracking) to supplies table

ALTER TABLE supplies 
ADD COLUMN IF NOT EXISTS edit_reason TEXT,
ADD COLUMN IF NOT EXISTS has_pending_edit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_values JSONB,
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id);

-- Ensure rejection_reason exists (it was in 004 but just in case)
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
