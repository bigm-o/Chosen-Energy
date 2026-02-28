-- First, let's create a test to verify BCrypt hashing
-- Hash for "Admin@123" generated with BCrypt work factor 11
-- This is a known good hash that should work

-- Delete existing test users
DELETE FROM users WHERE username IN ('md', 'manager', 'driver');

-- Insert users with a freshly generated BCrypt hash
-- Using a hash I'll generate: $2a$11$8vJ5qH5YqH5YqH5YqH5YqOZxK5qH5YqH5YqH5YqH5YqH5YqH5YqHu
-- Actually, let me use the exact hash from the admin user that IS working

INSERT INTO users (email, username, password_hash, full_name, role, is_active)
SELECT 
    'md@chosenenergy.com',
    'md',
    password_hash,  -- Copy the working hash from admin
    'Managing Director',
    'MD'::user_role,
    true
FROM users 
WHERE email = 'admin@chosenenergy.com'
LIMIT 1;

INSERT INTO users (email, username, password_hash, full_name, role, is_active)
SELECT 
    'manager@chosenenergy.com',
    'manager',
    password_hash,  -- Copy the working hash from admin
    'Garage Manager',
    'GarageManager'::user_role,
    true
FROM users 
WHERE email = 'admin@chosenenergy.com'
LIMIT 1;

INSERT INTO users (email, username, password_hash, full_name, role, is_active)
SELECT 
    'driver@chosenenergy.com',
    'driver',
    password_hash,  -- Copy the working hash from admin
    'Test Driver',
    'Driver'::user_role,
    true
FROM users 
WHERE email = 'admin@chosenenergy.com'
LIMIT 1;

-- Verify
SELECT username, email, role, is_active FROM users WHERE username IN ('md', 'manager', 'driver', 'admin');
