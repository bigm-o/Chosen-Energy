-- Add user_id and assigned_truck_id to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS assigned_truck_id UUID REFERENCES trucks(id);
