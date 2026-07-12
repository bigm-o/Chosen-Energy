-- Migration 017: Multi-feature additions
-- Feature 1: Unverified customers (on-the-fly creation by drivers)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_unverified BOOLEAN DEFAULT FALSE;

-- Feature 2: Fraud flagging on supplies
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES users(id);
ALTER TABLE supplies ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP;

-- Feature 5: Link inward_loads to a purchase record
ALTER TABLE inward_loads ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id);

-- Feature 5: Track how much of a purchase has been disbursed
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS disbursed_quantity DECIMAL(10,2) DEFAULT 0;
