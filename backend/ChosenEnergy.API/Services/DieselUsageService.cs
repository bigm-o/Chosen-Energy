using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface IDieselUsageService
{
    Task<IEnumerable<DieselUsage>> GetAllAsync();
    Task<DieselUsage> GetByIdAsync(Guid id);
    Task<IEnumerable<DieselUsage>> GetByDriverIdAsync(Guid driverId);
    Task<IEnumerable<DieselUsage>> GetByTruckIdAsync(Guid truckId);
    Task<DieselUsage> CreateAsync(DieselUsage usage, Guid userId);
    Task<bool> DeleteAsync(Guid id);
}

public class DieselUsageService : IDieselUsageService
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DieselUsageService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<DieselUsage>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                du.id as Id,
                du.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                du.driver_id as DriverId,
                d.full_name as DriverName,
                du.quantity_litres as QuantityLitres,
                du.usage_date as UsageDate,
                du.route as Route,
                du.mileage as Mileage,
                du.created_by as CreatedBy,
                u.full_name as CreatedByName,
                du.created_at as CreatedAt
            FROM diesel_usage du
            JOIN trucks t ON du.truck_id = t.id
            JOIN drivers d ON du.driver_id = d.id
            LEFT JOIN users u ON du.created_by = u.id
            ORDER BY du.usage_date DESC, du.created_at DESC";
        
        return await connection.QueryAsync<DieselUsage>(sql);
    }

    public async Task<DieselUsage> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                du.id as Id,
                du.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                du.driver_id as DriverId,
                d.full_name as DriverName,
                du.quantity_litres as QuantityLitres,
                du.usage_date as UsageDate,
                du.route as Route,
                du.mileage as Mileage,
                du.created_by as CreatedBy,
                u.full_name as CreatedByName,
                du.created_at as CreatedAt
            FROM diesel_usage du
            JOIN trucks t ON du.truck_id = t.id
            JOIN drivers d ON du.driver_id = d.id
            LEFT JOIN users u ON du.created_by = u.id
            WHERE du.id = @Id";
        
        return (await connection.QueryFirstOrDefaultAsync<DieselUsage>(sql, new { Id = id }))!;
    }

    public async Task<IEnumerable<DieselUsage>> GetByDriverIdAsync(Guid driverId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                du.id as Id,
                du.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                du.driver_id as DriverId,
                d.full_name as DriverName,
                du.quantity_litres as QuantityLitres,
                du.usage_date as UsageDate,
                du.route as Route,
                du.mileage as Mileage,
                du.created_by as CreatedBy,
                u.full_name as CreatedByName,
                du.created_at as CreatedAt
            FROM diesel_usage du
            JOIN trucks t ON du.truck_id = t.id
            JOIN drivers d ON du.driver_id = d.id
            LEFT JOIN users u ON du.created_by = u.id
            WHERE du.driver_id = @DriverId
            ORDER BY du.usage_date DESC";
        
        return await connection.QueryAsync<DieselUsage>(sql, new { DriverId = driverId });
    }

    public async Task<IEnumerable<DieselUsage>> GetByTruckIdAsync(Guid truckId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                du.id as Id,
                du.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                du.driver_id as DriverId,
                d.full_name as DriverName,
                du.quantity_litres as QuantityLitres,
                du.usage_date as UsageDate,
                du.route as Route,
                du.mileage as Mileage,
                du.created_by as CreatedBy,
                u.full_name as CreatedByName,
                du.created_at as CreatedAt
            FROM diesel_usage du
            JOIN trucks t ON du.truck_id = t.id
            JOIN drivers d ON du.driver_id = d.id
            LEFT JOIN users u ON du.created_by = u.id
            WHERE du.truck_id = @TruckId
            ORDER BY du.usage_date DESC";
        
        return await connection.QueryAsync<DieselUsage>(sql, new { TruckId = truckId });
    }

    public async Task<DieselUsage> CreateAsync(DieselUsage usage, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO diesel_usage (truck_id, driver_id, quantity_litres, usage_date, route, mileage, created_by)
            VALUES (@TruckId, @DriverId, @QuantityLitres, @UsageDate, @Route, @Mileage, @CreatedBy)
            RETURNING id";
        
        var id = await connection.ExecuteScalarAsync<Guid>(sql, new 
        {
            usage.TruckId,
            usage.DriverId,
            usage.QuantityLitres,
            usage.UsageDate,
            usage.Route,
            usage.Mileage,
            CreatedBy = userId
        });

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "DELETE FROM diesel_usage WHERE id = @Id";
        var rows = await connection.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }
}
