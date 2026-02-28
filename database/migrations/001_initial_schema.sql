-- Chosen Energy Operations Portal - Initial Schema
-- Migration: 001_initial_schema.sql
-- Created: 2026-01-20

-- Create role enum type
CREATE TYPE user_role AS ENUM ('MD', 'Admin', 'GarageManager', 'Driver');

-- Create status enum types
CREATE TYPE truck_status AS ENUM ('Active', 'Maintenance', 'Inactive');
CREATE TYPE driver_status AS ENUM ('Active', 'Suspended', 'Inactive');
CREATE TYPE approval_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Depots table
CREATE TABLE depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location TEXT,
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    license_number VARCHAR(100),
    status driver_status DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trucks table
CREATE TABLE trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    capacity_litres DECIMAL(10,2) NOT NULL,
    status truck_status DEFAULT 'Active',
    assigned_driver_id UUID REFERENCES drivers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchases table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id UUID REFERENCES depots(id),
    quantity DECIMAL(10,2) NOT NULL,
    cost_per_litre DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    purchase_date DATE NOT NULL,
    receipt_url TEXT,
    status approval_status DEFAULT 'Pending',
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplies table
CREATE TABLE supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    truck_id UUID REFERENCES trucks(id),
    driver_id UUID REFERENCES drivers(id),
    quantity DECIMAL(10,2) NOT NULL,
    price_per_litre DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    supply_date DATE NOT NULL,
    invoice_url TEXT,
    status approval_status DEFAULT 'Pending',
    admin_approved_by UUID REFERENCES users(id),
    admin_approved_at TIMESTAMP,
    md_approved_by UUID REFERENCES users(id),
    md_approved_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transloading table
CREATE TABLE transloading (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_truck_id UUID REFERENCES trucks(id),
    destination_truck_id UUID REFERENCES trucks(id),
    quantity DECIMAL(10,2) NOT NULL,
    transfer_date DATE NOT NULL,
    status approval_status DEFAULT 'Pending',
    approved_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance records table
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID REFERENCES trucks(id),
    maintenance_type VARCHAR(100) NOT NULL,
    cost DECIMAL(15,2) NOT NULL,
    description TEXT,
    maintenance_date DATE NOT NULL,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily logs table
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_date DATE UNIQUE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    total_purchases DECIMAL(15,2) NOT NULL,
    total_supplies DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_id UUID REFERENCES supplies(id),
    invoice_number VARCHAR(100),
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_supplies_status ON supplies(status);
CREATE INDEX idx_supplies_date ON supplies(supply_date);
CREATE INDEX idx_supplies_customer ON supplies(customer_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_trucks_status ON trucks(status);
CREATE INDEX idx_drivers_status ON drivers(status);

-- Insert default admin user (password: Admin@123)
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES ('admin@chosenenergy.com', '$2a$11$xQZH8YqVqVqVqVqVqVqVqeK8YqVqVqVqVqVqVqVqVqVqVqVqVqVqV', 'System Admin', 'Admin', true);

-- Note: Update password_hash with actual BCrypt hash after backend setup
