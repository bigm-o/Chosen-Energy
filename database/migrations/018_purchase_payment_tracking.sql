-- Migration 018: Purchase partial payment tracking
-- Feature 3: Track original cost vs amount actually paid, and carry balance forward

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS balance_forward DECIMAL(12,2) DEFAULT 0;

-- Backfill: set original_cost and amount_paid to total_cost for existing records
UPDATE purchases SET original_cost = total_cost, amount_paid = total_cost WHERE original_cost IS NULL;

-- Feature 3: Track outstanding balance per depot
ALTER TABLE depots ADD COLUMN IF NOT EXISTS total_outstanding_balance DECIMAL(12,2) DEFAULT 0;
