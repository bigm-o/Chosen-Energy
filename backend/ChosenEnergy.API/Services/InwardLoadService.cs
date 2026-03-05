using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface IInwardLoadService
{
    Task<InwardLoad> CreateAsync(InwardLoad load, Guid userId);
    Task<InwardLoad> CreateBulkAsync(BulkInwardLoadRequest request, Guid userId);
    Task<InwardLoad> ApproveAsync(Guid id, Guid userId);
    Task<bool> ApproveBatchAsync(Guid batchId, Guid userId);
    Task<IEnumerable<InwardLoad>> GetAllAsync(DateTime? date = null);
    Task<IEnumerable<InwardLoad>> GetByBatchIdAsync(Guid batchId);
    Task<IEnumerable<dynamic>> GetPendingGroupedAsync();
}

public class InwardLoadService : IInwardLoadService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuditService _auditService;

    public InwardLoadService(IDbConnectionFactory connectionFactory, IAuditService auditService)
    {
        _connectionFactory = connectionFactory;
        _auditService = auditService;
    }

    public async Task<InwardLoad> CreateAsync(InwardLoad load, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var batchId = Guid.NewGuid();
        var sql = @"
            INSERT INTO inward_loads (truck_id, driver_id, depot_id, quantity, load_date, status, created_by, remarks, batch_id)
            VALUES (@TruckId, @DriverId, @DepotId, @Quantity, @LoadDate, 'Pending'::approval_status, @UserId, @Remarks, @BatchId)
            RETURNING id";
        
        var id = await connection.ExecuteScalarAsync<Guid>(sql, new
        {
            load.TruckId,
            load.DriverId,
            load.DepotId,
            load.Quantity,
            LoadDate = DateTime.UtcNow,
            UserId = userId,
            load.Remarks,
            BatchId = batchId
        });

        return await GetByIdAsync(id);
    }

    public async Task<InwardLoad> CreateBulkAsync(BulkInwardLoadRequest request, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var batchId = Guid.NewGuid();
            var sql = @"
                INSERT INTO inward_loads (truck_id, driver_id, depot_id, quantity, load_date, status, created_by, remarks, batch_id)
                VALUES (@TruckId, @DriverId, @DepotId, @Quantity, @LoadDate, 'Pending'::approval_status, @UserId, @Remarks, @BatchId)";

            foreach (var item in request.Items)
            {
                await connection.ExecuteAsync(sql, new
                {
                    item.TruckId,
                    item.DriverId,
                    request.DepotId,
                    request.Quantity,
                    LoadDate = DateTime.UtcNow,
                    UserId = userId,
                    request.Remarks,
                    BatchId = batchId
                }, transaction);
            }

            transaction.Commit();
            return new InwardLoad { Remarks = $"Bulk created {request.Items.Count} entries" };
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<InwardLoad> ApproveAsync(Guid id, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(@"
            UPDATE inward_loads 
            SET status = 'Approved'::approval_status, 
                approved_by = @UserId,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id", new { Id = id, UserId = userId });

        return await GetByIdAsync(id);
    }
    
    public async Task<bool> ApproveBatchAsync(Guid batchId, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(@"
            UPDATE inward_loads 
            SET status = 'Approved'::approval_status, 
                approved_by = @UserId,
                updated_at = CURRENT_TIMESTAMP
            WHERE batch_id = @BatchId", new { BatchId = batchId, UserId = userId });
        return true;
    }

    public async Task<IEnumerable<InwardLoad>> GetAllAsync(DateTime? date = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                i.id as Id,
                i.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                i.driver_id as DriverId,
                d.full_name as DriverName,
                i.depot_id as DepotId,
                dep.name as DepotName,
                i.quantity as Quantity,
                i.load_date as LoadDate,
                i.status::text as Status,
                i.remarks as Remarks,
                i.batch_id as BatchId
            FROM inward_loads i
            JOIN trucks t ON i.truck_id = t.id
            JOIN drivers d ON i.driver_id = d.id
            LEFT JOIN depots dep ON i.depot_id = dep.id
            ORDER BY i.load_date DESC";
        
        return await connection.QueryAsync<InwardLoad>(sql);
    }

    public async Task<IEnumerable<InwardLoad>> GetByBatchIdAsync(Guid batchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                i.id as Id,
                i.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                i.driver_id as DriverId,
                d.full_name as DriverName,
                i.depot_id as DepotId,
                dep.name as DepotName,
                i.quantity as Quantity,
                i.load_date as LoadDate,
                i.status::text as Status,
                i.remarks as Remarks,
                i.batch_id as BatchId
            FROM inward_loads i
            JOIN trucks t ON i.truck_id = t.id
            JOIN drivers d ON i.driver_id = d.id
            LEFT JOIN depots dep ON i.depot_id = dep.id
            WHERE i.batch_id = @BatchId";
        
        return await connection.QueryAsync<InwardLoad>(sql, new { BatchId = batchId });
    }

    public async Task<IEnumerable<dynamic>> GetPendingGroupedAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                batch_id as BatchId,
                SUM(quantity) as TotalQuantity,
                COUNT(*) as TruckCount,
                MIN(remarks) as Remarks,
                MIN(load_date) as Date,
                MIN(u.full_name) as CreatedBy
            FROM inward_loads i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.status = 'Pending'::approval_status
            GROUP BY batch_id
            ORDER BY MIN(load_date) DESC";
        
        return await connection.QueryAsync<dynamic>(sql);
    }

    private async Task<InwardLoad> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                i.id as Id,
                i.truck_id as TruckId,
                t.registration_number as TruckRegNumber,
                i.driver_id as DriverId,
                d.full_name as DriverName,
                i.depot_id as DepotId,
                dep.name as DepotName,
                i.quantity as Quantity,
                i.load_date as LoadDate,
                i.status::text as Status,
                i.remarks as Remarks
            FROM inward_loads i
            JOIN trucks t ON i.truck_id = t.id
            JOIN drivers d ON i.driver_id = d.id
            LEFT JOIN depots dep ON i.depot_id = dep.id
            WHERE i.id = @Id";
        
        return await connection.QueryFirstOrDefaultAsync<InwardLoad>(sql, new { Id = id });
    }
}
