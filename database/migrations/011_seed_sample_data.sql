-- Migration: 011_seed_sample_data.sql
-- Purpose: Add sample data for testing

-- Insert sample depots with initial stock
INSERT INTO depots (name, location, contact_info, current_stock)
VALUES 
    ('Main Depot Lagos', 'Apapa, Lagos', '+234 801 234 5678', 50000.00),
    ('Abuja Branch', 'Wuse 2, Abuja', '+234 802 345 6789', 30000.00),
    ('Port Harcourt Depot', 'Trans Amadi, PH', '+234 803 456 7890', 25000.00)
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (company_name, contact_person, phone, email, address)
VALUES 
    ('ABC Logistics Ltd', 'John Okafor', '+234 810 111 2222', 'john@abclogistics.com', '123 Ikorodu Road, Lagos'),
    ('XYZ Transport Co', 'Mary Adeyemi', '+234 811 222 3333', 'mary@xyztransport.com', '456 Aba Road, Port Harcourt'),
    ('Delta Haulage', 'Ibrahim Musa', '+234 812 333 4444', 'ibrahim@deltahaulage.com', '789 Airport Road, Abuja'),
    ('Swift Movers', 'Grace Nwosu', '+234 813 444 5555', 'grace@swiftmovers.com', '321 Allen Avenue, Lagos')
ON CONFLICT DO NOTHING;

-- Note: Drivers will be created via the API which auto-creates user accounts
-- But we can insert sample trucks first

INSERT INTO trucks (registration_number, capacity_litres, status, current_load)
VALUES 
    ('LAG-001-AA', 33000.00, 'Active', 0),
    ('ABJ-002-BB', 33000.00, 'Active', 0),
    ('PH-003-CC', 45000.00, 'Active', 0),
    ('LAG-004-DD', 33000.00, 'Maintenance', 0),
    ('ABJ-005-EE', 20000.00, 'Active', 0)
ON CONFLICT (registration_number) DO NOTHING;
