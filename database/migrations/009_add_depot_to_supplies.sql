-- Add depot_id to supplies table
ALTER TABLE supplies
ADD COLUMN depot_id UUID REFERENCES depots(id);

-- Create index for performance
CREATE INDEX idx_supplies_depot ON supplies(depot_id);
