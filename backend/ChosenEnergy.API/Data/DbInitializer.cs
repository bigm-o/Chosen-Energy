using Dapper;

namespace ChosenEnergy.API.Data;

public class DbInitializer
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DbInitializer(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task InitializeAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // Ensure Maintenance status in truck_status enum
        var checkEnumSql = "SELECT 1 FROM pg_enum WHERE enumlabel = 'Maintenance' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'truck_status')";
        var exists = await connection.ExecuteScalarAsync<int?>(checkEnumSql);
        
        if (exists == null)
        {
            try 
            {
                await connection.ExecuteAsync("ALTER TYPE truck_status ADD VALUE 'Maintenance'");
            }
            catch { /* Ignore if race condition or already exists */ }
        }

        // Create trucks table if not exists (minimal columns)
        await connection.ExecuteAsync(@"
            CREATE TABLE IF NOT EXISTS trucks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                registration_number TEXT NOT NULL UNIQUE,
                capacity DECIMAL(18, 2) NOT NULL DEFAULT 33000, 
                status truck_status DEFAULT 'Active', 
                assigned_driver_id UUID REFERENCES drivers(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ");

        // Feature 5: User Management & Permissions
        try
        {
            await connection.ExecuteAsync("ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions TEXT;");
            await connection.ExecuteAsync("ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;");
            await connection.ExecuteAsync("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;");
        }
        catch { /* Ignore */ }

        // Feature 3: Advanced Maintenance Scheduler - Update Trucks Table
        try 
        {
            await connection.ExecuteAsync("ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity DECIMAL(18, 2) NOT NULL DEFAULT 33000;");
            await connection.ExecuteAsync("ALTER TABLE trucks ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id);");
            
            // New columns for maintenance
            await connection.ExecuteAsync("ALTER TABLE trucks ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMP;");
            await connection.ExecuteAsync("ALTER TABLE trucks ADD COLUMN IF NOT EXISTS next_maintenance_date TIMESTAMP;");
            await connection.ExecuteAsync("ALTER TABLE trucks ADD COLUMN IF NOT EXISTS maintenance_interval_days INT DEFAULT 90;");
        }
        catch { /* Ignore */ }

        // Feature 2: Customer Credit & Payment Tracking - Update Customers Table
        try
        {
             await connection.ExecuteAsync("ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(18, 2) NOT NULL DEFAULT 0;");
             await connection.ExecuteAsync("ALTER TABLE customers ADD COLUMN IF NOT EXISTS current_balance DECIMAL(18, 2) NOT NULL DEFAULT 0;");
        }
        catch { /* Ignore */ }

        // Feature 4: Profitability - Update Supplies Table
        try
        {
            await connection.ExecuteAsync("ALTER TABLE supplies ADD COLUMN IF NOT EXISTS cost_per_litre DECIMAL(18, 2) NOT NULL DEFAULT 0;");
        }
        catch { /* Ignore */ }

        // Create maintenance_logs table ... (existing code)
        var sql = @"
            CREATE TABLE IF NOT EXISTS maintenance_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                truck_id UUID NOT NULL REFERENCES trucks(id),
                type TEXT NOT NULL, 
                description TEXT,
                cost DECIMAL(18,2) NOT NULL DEFAULT 0,
                scheduled_date TIMESTAMP NOT NULL,
                completed_date TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ";
        await connection.ExecuteAsync(sql);

        // Feature 2: Payments Table
        var paymentsSql = @"
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_id UUID NOT NULL REFERENCES customers(id),
                amount DECIMAL(18, 2) NOT NULL,
                payment_date TIMESTAMP NOT NULL,
                payment_method TEXT,
                reference TEXT,
                notes TEXT,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ";
        await connection.ExecuteAsync(paymentsSql);

        // Feature 5: Notifications Table
        var notificationsSql = @"
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                role TEXT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'Info',
                is_read BOOLEAN DEFAULT FALSE,
                link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ";
        await connection.ExecuteAsync(notificationsSql);
        
        // Feature: Customer Specific Pricing
        var customerPricesSql = @"
            CREATE TABLE IF NOT EXISTS customer_fuel_prices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
                price_per_litre DECIMAL(18, 2) NOT NULL,
                created_by UUID REFERENCES users(id),
                updated_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ";
        await connection.ExecuteAsync(customerPricesSql);

        // Feature: Diesel Usage Tracking
        var dieselUsageSql = @"
            CREATE TABLE IF NOT EXISTS diesel_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                truck_id UUID NOT NULL REFERENCES trucks(id),
                driver_id UUID NOT NULL REFERENCES drivers(id),
                quantity_litres DECIMAL(18, 2) NOT NULL,
                usage_date TIMESTAMP NOT NULL,
                route TEXT,
                mileage INT,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ";
        await connection.ExecuteAsync(dieselUsageSql);
        
        // Cleanup dirty data from mapping bug period and enforce constraints
        try
        {
            // Ensure all required columns exist for older schemas
            await connection.ExecuteAsync("ALTER TABLE customer_fuel_prices ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id)");
            await connection.ExecuteAsync("ALTER TABLE customer_fuel_prices ADD COLUMN IF NOT EXISTS price_per_litre DECIMAL(18, 2) DEFAULT 0");

            // Repair any null data that might cause mapping crashes
            await connection.ExecuteAsync("UPDATE customer_fuel_prices SET price_per_litre = 0 WHERE price_per_litre IS NULL");
            
            // Enforce NOT NULL constraints
            await connection.ExecuteAsync("ALTER TABLE customer_fuel_prices ALTER COLUMN price_per_litre SET NOT NULL");

            // Remove records with empty UUIDs that were incorrectly created
            await connection.ExecuteAsync("DELETE FROM customer_fuel_prices WHERE customer_id = '00000000-0000-0000-0000-000000000000'");
            
            // Ensure the unique constraint exists on older tables (if they were created without it)
            await connection.ExecuteAsync(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_fuel_prices_customer_id_key') THEN
                        ALTER TABLE customer_fuel_prices ADD CONSTRAINT customer_fuel_prices_customer_id_key UNIQUE (customer_id);
                    END IF;
                END $$;");

            // --- EXPENSES MODULE TABLES ---
            
            // 1. Expense Categories
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS expense_categories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL UNIQUE,
                    is_system BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ");

            // Seed Default Categories
            var categories = new[] { "Overhead", "Salaries", "Utilities" };
            foreach (var catName in categories)
            {
                var catExists = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM expense_categories WHERE name = @name", new { name = catName });
                if (catExists == 0)
                {
                    await connection.ExecuteAsync("INSERT INTO expense_categories (name, is_system) VALUES (@name, true)", new { name = catName });
                }
            }

            // 2. Manual Expenses Ledger
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS manual_expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    category_id UUID NOT NULL REFERENCES expense_categories(id),
                    amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
                    description TEXT,
                    expense_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    receipt_url TEXT,
                    created_by UUID REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ");
            
            try {
                await connection.ExecuteAsync("ALTER TABLE manual_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;");
                await connection.ExecuteAsync("ALTER TABLE manual_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);");
                await connection.ExecuteAsync("ALTER TABLE manual_expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
                await connection.ExecuteAsync("ALTER TABLE manual_expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
            } catch { /* Migration resiliency */ }

            // 3. Invoices Table
            await connection.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS invoices (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    supply_id UUID NOT NULL REFERENCES supplies(id),
                    customer_id UUID NOT NULL REFERENCES customers(id),
                    invoice_number TEXT NOT NULL UNIQUE,
                    amount_due DECIMAL(18,2) NOT NULL,
                    amount_paid DECIMAL(18,2) NOT NULL DEFAULT 0,
                    due_date TIMESTAMP NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Unpaid',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ");

            // Migration: Ensure invoices table has all required columns if it already existed
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);");
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_due DECIMAL(18,2);");
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(18,2) DEFAULT 0;");
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;");
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Unpaid';");
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
            await connection.ExecuteAsync("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
            
            // Repair data: Link missing customer_ids from supplies
            await connection.ExecuteAsync(@"
                UPDATE invoices i 
                SET customer_id = s.customer_id 
                FROM supplies s 
                WHERE i.supply_id = s.id AND i.customer_id IS NULL");
                
            await connection.ExecuteAsync(@"
                UPDATE invoices i 
                SET amount_due = s.total_amount 
                FROM supplies s 
                WHERE i.supply_id = s.id AND i.amount_due IS NULL");
                
            await connection.ExecuteAsync(@"
                UPDATE invoices i 
                SET due_date = s.supply_date + INTERVAL '7 days' 
                FROM supplies s 
                WHERE i.supply_id = s.id AND i.due_date IS NULL");

            await connection.ExecuteAsync("UPDATE invoices SET amount_paid = 0 WHERE amount_paid IS NULL");
        }
        catch { /* Fallback for already correct schema */ }


        // Seed Users
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword("Admin@123");
        var users = new[]
        {
            new { Email = "admin@chosenenergy.com", Username = "admin", FullName = "System Admin", Role = "Admin" },
            new { Email = "md@chosenenergy.com", Username = "md", FullName = "Managing Director", Role = "MD" },
            new { Email = "manager@chosenenergy.com", Username = "manager", FullName = "Garage Manager", Role = "GarageManager" },
            new { Email = "driver@chosenenergy.com", Username = "driver", FullName = "Test Driver", Role = "Driver" }
        };

        foreach (var user in users)
        {
            var userExists = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE email = @Email", new { user.Email });
            if (userExists == 0)
            {
                await connection.ExecuteAsync(@"
                    INSERT INTO users (email, username, password_hash, full_name, role, is_active)
                    VALUES (@Email, @Username, @PasswordHash, @FullName, @Role::user_role, true)",
                    new { user.Email, user.Username, PasswordHash = hashedPassword, user.FullName, user.Role });
            }
        }
    }
}
