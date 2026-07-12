-- Migration 019: Diesel usage type classification + link to supply
-- Feature 4: Distinguish transport fuel from cargo-related fuel records

ALTER TABLE diesel_usage ADD COLUMN IF NOT EXISTS usage_type VARCHAR(30) DEFAULT 'TransportFuel';
ALTER TABLE diesel_usage ADD COLUMN IF NOT EXISTS linked_supply_id UUID REFERENCES supplies(id);

-- Valid usage_type values: 'TransportFuel', 'CargoDiesel', 'Other'
COMMENT ON COLUMN diesel_usage.usage_type IS 'TransportFuel = fuel burned by the truck engine during a trip; CargoDiesel = diesel carried as cargo';
