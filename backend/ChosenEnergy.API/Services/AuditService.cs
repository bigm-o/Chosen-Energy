using Dapper;
using System.Text.Json;
using ChosenEnergy.API.Data;

namespace ChosenEnergy.API.Services;

public class AuditService : IAuditService
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AuditService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task LogAsync(Guid userId, string action, string entityType, Guid entityId, object? oldValues, object? newValues, string? ipAddress)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, timestamp)
            VALUES (@UserId, @Action, @EntityType, @EntityId, @OldValues::jsonb, @NewValues::jsonb, @IpAddress, CURRENT_TIMESTAMP)";

        await connection.ExecuteAsync(sql, new
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null,
            IpAddress = ipAddress
        });
    }

    public async Task<IEnumerable<dynamic>> GetRecentLogsAsync(int count)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                a.action as Action,
                a.entity_type as EntityType,
                a.timestamp as Timestamp,
                u.full_name as UserName
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC
            LIMIT @Count";
        return await connection.QueryAsync(sql, new { Count = count });
    }
}
