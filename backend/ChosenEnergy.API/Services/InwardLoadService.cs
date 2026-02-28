using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface IInwardLoadService
{
    Task<InwardLoad> CreateAsync(InwardLoad load, Guid userId);
    Task<InwardLoad> ApproveAsync(Guid id, Guid userId);
    Task<IEnumerable<InwardLoad>> GetAllAsync(DateTime? date = null);
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
        var sql = @"
            INSERT INTO inward_loads (truck_id, driver_id, depot_id, quantity, load_date, status, created_by, remarks)
            VALUES (@TruckId, @DriverId, @DepotId, @Quantity, @LoadDate, 'Pending'::approval_status, @UserId, @Remarks)
            RETURNING id";
        
        var id = await connection.ExecuteScalarAsync<Guid>(sql, new
        {
            load.TruckId,
            load.DriverId,
            load.DepotId,
            load.Quantity,
            LoadDate = DateTime.UtcNow,
            UserId = userId,
            load.Remarks
        });

        return await GetByIdAsync(id);
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
                i.remarks as Remarks
            FROM inward_loads i
            JOIN trucks t ON i.truck_id = t.id
            JOIN drivers d ON i.driver_id = d.id
            LEFT JOIN depots dep ON i.depot_id = dep.id
            ORDER BY i.load_date DESC";
        
        return await connection.QueryAsync<InwardLoad>(sql);
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
