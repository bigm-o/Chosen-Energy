using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Services;

public class MaintenanceService : IMaintenanceService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuditService _auditService;

    public MaintenanceService(IDbConnectionFactory connectionFactory, IAuditService auditService)
    {
        _connectionFactory = connectionFactory;
        _auditService = auditService;
    }

    public async Task<IEnumerable<MaintenanceLog>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                m.id as Id,
                m.truck_id as TruckId,
                m.type as Type,
                m.description as Description,
                m.cost as Cost,
                m.scheduled_date as ScheduledDate,
                m.completed_date as CompletedDate,
                m.status as Status,
                m.created_by as CreatedBy,
                m.created_at as CreatedAt,
                m.updated_at as UpdatedAt,
                t.registration_number as TruckRegNumber,
                u.full_name as CreatedByName
            FROM maintenance_logs m
            JOIN trucks t ON m.truck_id = t.id
            LEFT JOIN users u ON m.created_by = u.id
            ORDER BY m.created_at DESC";
        
        return await connection.QueryAsync<MaintenanceLog>(sql);
    }

    public async Task<IEnumerable<MaintenanceLog>> GetByTruckIdAsync(Guid truckId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                m.id as Id,
                m.truck_id as TruckId,
                m.type as Type,
                m.description as Description,
                m.cost as Cost,
                m.scheduled_date as ScheduledDate,
                m.completed_date as CompletedDate,
                m.status as Status,
                m.created_by as CreatedBy,
                m.created_at as CreatedAt,
                m.updated_at as UpdatedAt,
                t.registration_number as TruckRegNumber,
                u.full_name as CreatedByName
            FROM maintenance_logs m
            JOIN trucks t ON m.truck_id = t.id
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.truck_id = @TruckId
            ORDER BY m.created_at DESC";
        
        return await connection.QueryAsync<MaintenanceLog>(sql, new { TruckId = truckId });
    }

    public async Task<MaintenanceLog> CreateAsync(MaintenanceLog log)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var sql = @"
                INSERT INTO maintenance_logs (truck_id, type, description, cost, scheduled_date, status, created_by)
                VALUES (@TruckId, @Type, @Description, @Cost, @ScheduledDate, @Status, @CreatedBy)
                RETURNING id";
            
            var id = await connection.ExecuteScalarAsync<Guid>(sql, new 
            {
                log.TruckId,
                Type = log.Type.ToString(),
                log.Description,
                log.Cost,
                log.ScheduledDate,
                Status = log.Status.ToString(),
                log.CreatedBy
            }, transaction);

            // Fetch the full record with joins
            var created = await connection.QueryFirstAsync<MaintenanceLog>(@"
                SELECT 
                    m.*, 
                    t.registration_number as TruckRegNumber,
                    u.full_name as CreatedByName
                FROM maintenance_logs m
                JOIN trucks t ON m.truck_id = t.id
                LEFT JOIN users u ON m.created_by = u.id
                WHERE m.id = @Id", new { Id = id }, transaction);

            // Update truck status
            await connection.ExecuteAsync("UPDATE trucks SET status = 'Maintenance'::truck_status WHERE id = @TruckId", new { log.TruckId }, transaction);

            // Audit
            await _auditService.LogAsync(log.CreatedBy, "Maintenance Logged", "Truck", log.TruckId, null, new { Type = log.Type.ToString(), Status = "Maintenance" }, null);

            transaction.Commit();
            return created;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<MaintenanceLog> UpdateStatusAsync(Guid id, MaintenanceStatus status)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            // First, update the log status
            var sqlUpdate = @"
                UPDATE maintenance_logs 
                SET status = @Status,
                    completed_date = CASE WHEN @Status = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING *";

            var updated = await connection.QueryFirstAsync<MaintenanceLog>(sqlUpdate, new { Id = id, Status = status.ToString() }, transaction);

            if (status == MaintenanceStatus.Completed)
            {
                // Set truck back to Active and update maintenance dates
                await connection.ExecuteAsync(@"
                    UPDATE trucks 
                    SET status = 'Active'::truck_status,
                        last_maintenance_date = CURRENT_TIMESTAMP,
                        next_maintenance_date = CURRENT_TIMESTAMP + (maintenance_interval_days * INTERVAL '1 day')
                    WHERE id = @TruckId", 
                    new { TruckId = updated.TruckId }, transaction);
            }

            transaction.Commit();
            return updated;
        }
        catch (Exception)
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var deleted = await connection.ExecuteAsync("DELETE FROM maintenance_logs WHERE id = @Id", new { Id = id });
        return deleted > 0;
    }
}
