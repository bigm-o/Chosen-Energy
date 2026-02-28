-- Migration: 010_seed_test_users.sql (Updated)
-- Purpose: Add test users for different roles with correct password hash
-- Password for all is: Admin@123
-- Hash generated using BCrypt with work factor 11

-- Delete existing test users first
DELETE FROM users WHERE email IN ('md@chosenenergy.com', 'manager@chosenenergy.com', 'driver@chosenenergy.com');

INSERT INTO users (email, username, password_hash, full_name, role, is_active)
VALUES 
    -- MD User
    ('md@chosenenergy.com', 'md', '$2a$11$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Managing Director', 'MD', true),
    
    -- Garage Manager User
    ('manager@chosenenergy.com', 'manager', '$2a$11$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Garage Manager', 'GarageManager', true),
    
    -- Driver User
    ('driver@chosenenergy.com', 'driver', '$2a$11$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Test Driver', 'Driver', true);
