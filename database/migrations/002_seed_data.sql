-- Seed data for Chosen Energy Operations Portal

-- Insert depots
INSERT INTO depots (name, location, contact_info) VALUES
('Delta Petroleum Depot', 'Lagos', '{"phone": "08012345678", "email": "delta@depot.com"}'),
('MRS Oil Depot', 'Port Harcourt', '{"phone": "08023456789", "email": "mrs@depot.com"}'),
('Conoil Depot', 'Warri', '{"phone": "08034567890", "email": "conoil@depot.com"}'),
('Total Depot', 'Abuja', '{"phone": "08045678901", "email": "total@depot.com"}')
ON CONFLICT DO NOTHING;

-- Insert customers
INSERT INTO customers (company_name, contact_person, phone, email, address, created_at) VALUES
('ABC Transport Ltd', 'John Doe', '08011111111', 'john@abc.com', '123 Lagos Street, Lagos', NOW()),
('XYZ Logistics', 'Jane Smith', '08022222222', 'jane@xyz.com', '456 PH Road, Port Harcourt', NOW()),
('Global Freight', 'Mike Johnson', '08033333333', 'mike@global.com', '789 Abuja Ave, Abuja', NOW())
ON CONFLICT DO NOTHING;

-- Insert trucks
INSERT INTO trucks (registration_number, capacity_litres, status, assigned_driver_id) VALUES
('ABC-123-XY', 33000, 'Active', NULL),
('DEF-456-ZW', 33000, 'Active', NULL),
('GHI-789-UV', 45000, 'Active', NULL),
('JKL-012-ST', 33000, 'Maintenance', NULL)
ON CONFLICT DO NOTHING;

-- Insert drivers
INSERT INTO drivers (full_name, phone, license_number, status, created_at) VALUES
('Ahmed Musa', '08044444444', 'DL-001-2024', 'Active', NOW()),
('Chidi Okafor', '08055555555', 'DL-002-2024', 'Active', NOW()),
('Emeka Eze', '08066666666', 'DL-003-2024', 'Active', NOW()),
('Fatima Bello', '08077777777', 'DL-004-2024', 'Inactive', NOW())
ON CONFLICT DO NOTHING;

-- Insert sample purchases (if user exists)
INSERT INTO purchases (depot_id, quantity, cost_per_litre, total_cost, purchase_date, status, created_by, created_at)
SELECT 
    d.id, 
    15000, 
    850, 
    12750000, 
    '2026-01-20', 
    'Approved', 
    u.id,
    NOW()
FROM users u, depots d 
WHERE u.email = 'admin@chosenenergy.com' AND d.name = 'Delta Petroleum Depot'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchases (depot_id, quantity, cost_per_litre, total_cost, purchase_date, status, created_by, created_at)
SELECT 
    d.id, 
    20000, 
    840, 
    16800000, 
    '2026-01-19', 
    'Pending', 
    u.id,
    NOW()
FROM users u, depots d 
WHERE u.email = 'admin@chosenenergy.com' AND d.name = 'MRS Oil Depot'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchases (depot_id, quantity, cost_per_litre, total_cost, purchase_date, status, created_by, created_at)
SELECT 
    d.id, 
    12000, 
    855, 
    10260000, 
    '2026-01-18', 
    'Pending', 
    u.id,
    NOW()
FROM users u, depots d 
WHERE u.email = 'admin@chosenenergy.com' AND d.name = 'Conoil Depot'
LIMIT 1
ON CONFLICT DO NOTHING;
