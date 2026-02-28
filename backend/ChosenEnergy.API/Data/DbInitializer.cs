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
