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
    
    // Customer Specific Pricing
    Task<decimal?> GetCustomerPriceAsync(Guid customerId);
    Task<IEnumerable<CustomerFuelPrice>> GetAllCustomerPricesAsync();
    Task<bool> SetCustomerPriceAsync(Guid customerId, decimal price, Guid userId);
    Task<bool> RemoveCustomerPriceAsync(Guid customerId);
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
            SET value = @Value, 
                pending_value = NULL, 
                pending_updated_by = NULL, 
                status = 'Approved'::approval_status,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = @UserId
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

    public async Task<decimal?> GetCustomerPriceAsync(Guid customerId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<decimal?>("SELECT price_per_litre FROM customer_fuel_prices WHERE customer_id = @CustomerId", new { CustomerId = customerId });
    }

    public async Task<IEnumerable<CustomerFuelPrice>> GetAllCustomerPricesAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                cfp.id AS Id,
                cfp.customer_id AS CustomerId,
                cfp.price_per_litre AS PricePerLitre,
                cfp.created_by AS CreatedBy,
                cfp.updated_by AS UpdatedBy,
                cfp.created_at AS CreatedAt,
                cfp.updated_at AS UpdatedAt,
                c.company_name AS CompanyName 
            FROM customer_fuel_prices cfp
            JOIN customers c ON cfp.customer_id = c.id
            ORDER BY c.company_name";
        return await connection.QueryAsync<CustomerFuelPrice>(sql);
    }

    public async Task<bool> SetCustomerPriceAsync(Guid customerId, decimal price, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO customer_fuel_prices (customer_id, price_per_litre, created_by, updated_by)
            VALUES (@CustomerId, @Price, @UserId, @UserId)
            ON CONFLICT (customer_id) 
            DO UPDATE SET 
                price_per_litre = @Price, 
                updated_at = CURRENT_TIMESTAMP,
                updated_by = @UserId";
        var result = await connection.ExecuteAsync(sql, new { CustomerId = customerId, Price = price, UserId = userId });
        return result > 0;
    }

    public async Task<bool> RemoveCustomerPriceAsync(Guid customerId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var result = await connection.ExecuteAsync("DELETE FROM customer_fuel_prices WHERE customer_id = @CustomerId", new { CustomerId = customerId });
        return result > 0;
    }
}
