using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<User?> GetByEmailOrUsernameAsync(string emailOrUsername)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                id as Id,
                email as Email,
                username as Username,
                password_hash as PasswordHash,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt,
                theme_preference as ThemePreference,
                custom_permissions as CustomPermissionsRaw,
                requires_password_change as RequiresPasswordChange,
                last_login_at as LastLoginAt
            FROM users 
            WHERE (email = @EmailOrUsername OR username = @EmailOrUsername)";
        
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { EmailOrUsername = emailOrUsername });
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                id as Id,
                email as Email,
                username as Username,
                password_hash as PasswordHash,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt,
                theme_preference as ThemePreference,
                custom_permissions as CustomPermissionsRaw,
                requires_password_change as RequiresPasswordChange,
                last_login_at as LastLoginAt
            FROM users 
            WHERE email = @Email";
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { Email = email });
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                id as Id,
                email as Email,
                username as Username,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt,
                theme_preference as ThemePreference,
                custom_permissions as CustomPermissionsRaw,
                requires_password_change as RequiresPasswordChange,
                last_login_at as LastLoginAt
            FROM users 
            WHERE role != 'Driver'::user_role
            ORDER BY created_at DESC";
        return await connection.QueryAsync<User>(sql);
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                id as Id,
                email as Email,
                username as Username,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt,
                theme_preference as ThemePreference,
                custom_permissions as CustomPermissionsRaw,
                requires_password_change as RequiresPasswordChange,
                last_login_at as LastLoginAt
            FROM users 
            WHERE id = @Id";
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { Id = id });
    }

    public async Task<User> CreateAsync(User user, string passwordHash)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO users (email, username, password_hash, full_name, role, is_active, theme_preference)
            VALUES (@Email, @Username, @PasswordHash, @FullName, @Role::user_role, true, 'light')
            RETURNING 
                id as Id,
                email as Email,
                username as Username,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt,
                theme_preference as ThemePreference,
                custom_permissions as CustomPermissionsRaw,
                requires_password_change as RequiresPasswordChange,
                last_login_at as LastLoginAt";

        return await connection.QueryFirstAsync<User>(sql, new
        {
            user.Email,
            user.Username,
            PasswordHash = passwordHash,
            user.FullName,
            Role = user.Role.ToString()
        });
    }

    public async Task<User> UpdateAsync(User user)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            UPDATE users 
            SET full_name = @FullName,
                role = @Role::user_role,
                is_active = @IsActive,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id
            RETURNING 
                id as Id,
                email as Email,
                username as Username,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt,
                theme_preference as ThemePreference,
                custom_permissions as CustomPermissionsRaw,
                requires_password_change as RequiresPasswordChange,
                last_login_at as LastLoginAt";

        return await connection.QueryFirstAsync<User>(sql, new
        {
            user.Id,
            user.FullName,
            Role = user.Role.ToString(),
            user.IsActive
        });
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = @Id";
        var affected = await connection.ExecuteAsync(sql, new { Id = id });
        return affected > 0;
    }

    public async Task<bool> UpdateThemeAsync(Guid id, string themePreference)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE users SET theme_preference = @ThemePreference, updated_at = CURRENT_TIMESTAMP WHERE id = @Id";
        var affected = await connection.ExecuteAsync(sql, new { Id = id, ThemePreference = themePreference });
        return affected > 0;
    }

    public async Task<bool> UpdatePermissionsAsync(Guid id, string permissionsJson)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE users SET custom_permissions = @PermissionsJson, updated_at = CURRENT_TIMESTAMP WHERE id = @Id";
        var affected = await connection.ExecuteAsync(sql, new { Id = id, PermissionsJson = permissionsJson });
        return affected > 0;
    }

    public async Task<bool> UpdatePasswordAsync(Guid id, string passwordHash, bool requiresPasswordChange)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE users SET password_hash = @PasswordHash, requires_password_change = @RequiresPasswordChange, updated_at = CURRENT_TIMESTAMP WHERE id = @Id";
        var affected = await connection.ExecuteAsync(sql, new { Id = id, PasswordHash = passwordHash, RequiresPasswordChange = requiresPasswordChange });
        return affected > 0;
    }

    public async Task<bool> UpdateLastLoginAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = @Id";
        var affected = await connection.ExecuteAsync(sql, new { Id = id });
        return affected > 0;
    }
}
