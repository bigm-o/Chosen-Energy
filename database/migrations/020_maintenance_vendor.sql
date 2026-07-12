-- Migration 020: Maintenance vendor reference and invoice attachment
-- Feature 7: Track which vendor serviced the truck and attach their invoice

ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS invoice_url TEXT;
