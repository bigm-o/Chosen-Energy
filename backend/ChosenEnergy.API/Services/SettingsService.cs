using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface ISettingsService
{
    Task<string> GetValueAsync(string key);
    Task<SystemSetting> GetSettingAsync(string key);
    Task<bool> UpdateValueAsync(string key, string value, Guid userId);
    Task<bool> ApproveUpdateAsync(string key, Guid userId);
    Task<IEnumerable<SystemSetting>> GetAllAsync();
}

public class SettingsService : ISettingsService
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SettingsService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<string> GetValueAsync(string key)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<string>("SELECT value FROM system_settings WHERE key = @Key", new { Key = key }) ?? "";
    }

    public async Task<SystemSetting> GetSettingAsync(string key)
    {
        using var connection = _connectionFactory.CreateConnection();
        return (await connection.QueryFirstOrDefaultAsync<SystemSetting>("SELECT * FROM system_settings WHERE key = @Key", new { Key = key }))!;
    }

    public async Task<bool> UpdateValueAsync(string key, string value, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            UPDATE system_settings 
            SET pending_value = @Value, 
                pending_updated_by = @UserId, 
                status = 'Pending'::approval_status 
            WHERE key = @Key";
        var result = await connection.ExecuteAsync(sql, new { Key = key, Value = value, UserId = userId });
        return result > 0;
    }

    public async Task<bool> ApproveUpdateAsync(string key, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            UPDATE system_settings 
            SET value = pending_value, 
                pending_value = NULL, 
                pending_updated_by = NULL, 
                status = 'Approved'::approval_status,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = @UserId
            WHERE key = @Key";
        var result = await connection.ExecuteAsync(sql, new { Key = key, UserId = userId });
        return result > 0;
    }

    public async Task<IEnumerable<SystemSetting>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<SystemSetting>("SELECT * FROM system_settings");
    }
}
