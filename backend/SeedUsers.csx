using Dapper;
using Npgsql;

var connectionString = "Host=localhost;Port=5432;Database=chosen_energy_db;Username=mfanu;Password=";
var password = "Admin@123";
var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);

Console.WriteLine($"Hashed password: {hashedPassword}");
Console.WriteLine($"Verification test: {BCrypt.Net.BCrypt.Verify(password, hashedPassword)}");

using var connection = new NpgsqlConnection(connectionString);
connection.Open();

var users = new[]
{
    new { Email = "md@chosenenergy.com", Username = "md", FullName = "Managing Director", Role = "MD" },
    new { Email = "manager@chosenenergy.com", Username = "manager", FullName = "Garage Manager", Role = "GarageManager" },
    new { Email = "driver@chosenenergy.com", Username = "driver", FullName = "Test Driver", Role = "Driver" }
};

foreach (var user in users)
{
    var sql = @"
        INSERT INTO users (email, username, password_hash, full_name, role, is_active)
        VALUES (@Email, @Username, @PasswordHash, @FullName, @Role::user_role, true)
        ON CONFLICT (email) DO UPDATE 
        SET password_hash = @PasswordHash, username = @Username, is_active = true";
    
    await connection.ExecuteAsync(sql, new 
    { 
        user.Email, 
        user.Username, 
        PasswordHash = hashedPassword, 
        user.FullName, 
        user.Role 
    });
    
    Console.WriteLine($"Inserted/Updated user: {user.Username}");
}

Console.WriteLine("\nVerifying inserted users:");
var verifyUsers = await connection.QueryAsync("SELECT username, email, role FROM users WHERE username IN ('md', 'manager', 'driver')");
foreach (var u in verifyUsers)
{
    Console.WriteLine($"  - {u.username} ({u.email}) - {u.role}");
}

Console.WriteLine("\nDone! All users should now be able to login with password: Admin@123");
