-- Add purchase_price to depots
ALTER TABLE depots ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(18, 2) DEFAULT 0;
