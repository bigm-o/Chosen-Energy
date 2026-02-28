using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Services;

public class NotificationService : INotificationService
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task NotifyUserAsync(Guid userId, string title, string message, string type = "Info", string? link = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO notifications (user_id, title, message, type, link, created_at, is_read)
            VALUES (@UserId, @Title, @Message, @Type, @Link, CURRENT_TIMESTAMP, FALSE)";
        
        await connection.ExecuteAsync(sql, new { UserId = userId, Title = title, Message = message, Type = type, Link = link });
    }

    public async Task NotifyRoleAsync(string role, string title, string message, string type = "Info", string? link = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // Enum to string if needed, assume stored as string in users table
        var users = await connection.QueryAsync<Guid>("SELECT id FROM users WHERE role = @Role::user_role", new { Role = role });
        
        foreach (var userId in users)
        {
            await NotifyUserAsync(userId, title, message, type, link);
        }
    }

    public async Task<IEnumerable<Notification>> GetForUserAsync(Guid userId, string userRole)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                id, user_id, title, message, type, link, created_at as CreatedAt, is_read as IsRead
            FROM notifications 
            WHERE user_id = @UserId 
            ORDER BY created_at DESC 
            LIMIT 50";
        
        return await connection.QueryAsync<Notification>(sql, new { UserId = userId });
    }

    public async Task MarkAsReadAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("UPDATE notifications SET is_read = TRUE WHERE id = @Id", new { Id = id });
    }
    
    public async Task MarkAllAsReadAsync(Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync("UPDATE notifications SET is_read = TRUE WHERE user_id = @UserId", new { UserId = userId });
    }
}
