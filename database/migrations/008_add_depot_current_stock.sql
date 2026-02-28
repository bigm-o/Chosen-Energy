-- Add current_stock column to depots table
ALTER TABLE depots 
ADD COLUMN current_stock DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
