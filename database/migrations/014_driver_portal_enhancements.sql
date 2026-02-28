-- Add truck_type to trucks
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS truck_type TEXT CHECK (truck_type IN ('Small', 'Large')) DEFAULT 'Large';

-- Update transloading table
ALTER TABLE transloading ADD COLUMN IF NOT EXISTS receiving_driver_id UUID REFERENCES drivers(id);
ALTER TABLE transloading ADD COLUMN IF NOT EXISTS is_confirmed_by_receiver BOOLEAN DEFAULT FALSE;
ALTER TABLE transloading ADD COLUMN IF NOT EXISTS receiver_confirmed_at TIMESTAMP;
ALTER TABLE transloading ADD COLUMN IF NOT EXISTS transload_type TEXT; -- S-S, L-S, L-L
ALTER TABLE transloading ALTER COLUMN transfer_date TYPE TIMESTAMP;

-- System Settings for Diesel Price
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    pending_value TEXT,
    pending_updated_by UUID REFERENCES users(id),
    status approval_status DEFAULT 'Approved'
);

-- Seed diesel price
INSERT INTO system_settings (key, value) VALUES ('DieselSellingPrice', '1200') ON CONFLICT DO NOTHING;

-- Inward Loads (from Company/Depot to Truck)
CREATE TABLE IF NOT EXISTS inward_loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES trucks(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    depot_id UUID REFERENCES depots(id),
    quantity DECIMAL(18, 2) NOT NULL,
    load_date TIMESTAMP NOT NULL,
    status approval_status DEFAULT 'Pending',
    approved_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT
);
