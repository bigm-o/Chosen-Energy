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
                updated_at as UpdatedAt
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
                updated_at as UpdatedAt
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
                updated_at as UpdatedAt
            FROM users 
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
                updated_at as UpdatedAt
            FROM users 
            WHERE id = @Id";
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { Id = id });
    }

    public async Task<User> CreateAsync(User user, string passwordHash)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO users (email, username, password_hash, full_name, role, is_active)
            VALUES (@Email, @Username, @PasswordHash, @FullName, @Role::user_role, true)
            RETURNING 
                id as Id,
                email as Email,
                username as Username,
                full_name as FullName,
                role::text as Role,
                is_active as IsActive,
                created_at as CreatedAt,
                updated_at as UpdatedAt";

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
                updated_at as UpdatedAt";

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
}
