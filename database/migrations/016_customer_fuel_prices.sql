-- Migration: 016_customer_fuel_prices.sql
-- Created: 2026-03-31
-- Purpose: Add customer-specific fuel pricing with fallback to global rates.

CREATE TABLE customer_fuel_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    price_per_litre DECIMAL(15,2) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id)
);

-- Index for fast lookup by customer
CREATE INDEX idx_customer_fuel_prices_customer ON customer_fuel_prices(customer_id);

-- Add a comment for clarity
COMMENT ON TABLE customer_fuel_prices IS 'Stores specific diesel rates for individual customers. If no record exists for a customer, the global DieselSellingPrice setting is used.';
