namespace ChosenEnergy.API.Services;

public interface IAuditService
{
    Task LogAsync(Guid userId, string action, string entityType, Guid entityId, object? oldValues, object? newValues, string? ipAddress);
    Task<IEnumerable<dynamic>> GetRecentLogsAsync(int count);
}
