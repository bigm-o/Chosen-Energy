using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface ITransloadService
{
    Task<Transload> CreateAsync(Transload transload, Guid userId);
    Task<Transload> ConfirmAsync(Guid id, Guid userId);
    Task<Transload> ApproveAsync(Guid id, Guid userId);
    Task<Transload> RejectAsync(Guid id, Guid userId, string reason);
    Task<IEnumerable<Transload>> GetPendingConfirmationsAsync(Guid driverId);
    Task<IEnumerable<Transload>> GetAllAsync();
}

public class TransloadService : ITransloadService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuditService _auditService;

    public TransloadService(IDbConnectionFactory connectionFactory, IAuditService auditService)
    {
        _connectionFactory = connectionFactory;
        _auditService = auditService;
    }

    public async Task<Transload> CreateAsync(Transload transload, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // 1. Get Truck Types to determine transload type
        var trucksSql = "SELECT id, truck_type::text as TruckType FROM trucks WHERE id IN (@SourceId, @DestId)";
        var trucks = (await connection.QueryAsync<dynamic>(trucksSql, new { SourceId = transload.SourceTruckId, DestId = transload.DestinationTruckId })).ToList();
        
        var sourceTruck = trucks.FirstOrDefault(t => t.id == transload.SourceTruckId);
        var destTruck = trucks.FirstOrDefault(t => t.id == transload.DestinationTruckId);

        if (sourceTruck == null || destTruck == null) throw new Exception("Invalid trucks");

        string sType = sourceTruck.trucktype;
        string dType = destTruck.trucktype;

        // Validation: Small to Large is never allowed
        if (sType == "Small" && dType == "Large")
            throw new InvalidOperationException("Transloading from a Small truck to a Large truck is not allowed.");

        string transloadType = $"{(sType == "Small" ? "S" : "L")}-{(dType == "Small" ? "S" : "L")}";

        // 2. Get Receiving Driver Id
        var destDriverId = await connection.ExecuteScalarAsync<Guid?>(
            "SELECT id FROM drivers WHERE assigned_truck_id = @TruckId", new { TruckId = transload.DestinationTruckId });

        if (!destDriverId.HasValue) throw new Exception("Destination truck has no assigned driver");

        // 3. Insert
        var sql = @"
            INSERT INTO transloading (source_truck_id, destination_truck_id, quantity, transfer_date, receiving_driver_id, transload_type, created_by, status)
            VALUES (@SourceTruckId, @DestinationTruckId, @Quantity, @TransferDate, @ReceivingDriverId, @TransloadType, @UserId, 'Pending'::approval_status)
            RETURNING id";

        var id = await connection.ExecuteScalarAsync<Guid>(sql, new
        {
            transload.SourceTruckId,
            transload.DestinationTruckId,
            transload.Quantity,
            TransferDate = DateTime.UtcNow,
            ReceivingDriverId = destDriverId.Value,
            TransloadType = transloadType,
            UserId = userId
        });

        await _auditService.LogAsync(userId, "CreateTransload", "Transload", id, null, new { transload.Quantity, TransloadType = transloadType }, null);

        return await GetByIdAsync(id);
    }

    public async Task<Transload> ConfirmAsync(Guid id, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // Verify user is the receiving driver
        var transloadSql = "SELECT receiving_driver_id as ReceivingDriverId FROM transloading WHERE id = @Id";
        var receiverId = await connection.ExecuteScalarAsync<Guid?>(transloadSql, new { Id = id });

        // Get driver id for this user
        var driverId = await connection.ExecuteScalarAsync<Guid?>(
            "SELECT id FROM drivers WHERE user_id = @UserId", new { UserId = userId });

        if (receiverId != driverId) throw new UnauthorizedAccessException("Only the receiving driver can confirm this transload.");

        await connection.ExecuteAsync(@"
            UPDATE transloading 
            SET is_confirmed_by_receiver = TRUE, 
                receiver_confirmed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id", new { Id = id });

        return await GetByIdAsync(id);
    }

    public async Task<Transload> ApproveAsync(Guid id, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        var transload = await GetByIdAsync(id);
        if (transload == null) throw new Exception("Transload not found");
        if (!transload.IsConfirmedByReceiver) throw new InvalidOperationException("Transload must be confirmed by the receiving driver before admin approval.");

        await connection.ExecuteAsync(@"
            UPDATE transloading 
            SET status = 'Approved'::approval_status, 
                approved_by = @UserId,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id", new { Id = id, UserId = userId });

        await _auditService.LogAsync(userId, "ApproveTransload", "Transload", id, null, new { Status = "Approved" }, null);

        return await GetByIdAsync(id);
    }

    public async Task<Transload> RejectAsync(Guid id, Guid userId, string reason)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(@"
            UPDATE transloading 
            SET status = 'Rejected'::approval_status, 
                rejection_reason = @Reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id", new { Id = id, Reason = reason });

        return await GetByIdAsync(id);
    }

    public async Task<IEnumerable<Transload>> GetPendingConfirmationsAsync(Guid driverId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                t.id as Id,
                t.source_truck_id as SourceTruckId,
                st.registration_number as SourceTruckReg,
                t.destination_truck_id as DestinationTruckId,
                dt.registration_number as DestinationTruckReg,
                t.quantity as Quantity,
                t.transfer_date as TransferDate,
                t.status::text as Status,
                t.is_confirmed_by_receiver as IsConfirmedByReceiver,
                t.transload_type as TransloadType,
                u.full_name as CreatedByName
            FROM transloading t
            JOIN trucks st ON t.source_truck_id = st.id
            JOIN trucks dt ON t.destination_truck_id = dt.id
            JOIN users u ON t.created_by = u.id
            WHERE t.receiving_driver_id = @DriverId AND t.is_confirmed_by_receiver = FALSE AND t.status = 'Pending'::approval_status";
        
        return await connection.QueryAsync<Transload>(sql, new { DriverId = driverId });
    }

    public async Task<IEnumerable<Transload>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                t.id as Id,
                t.source_truck_id as SourceTruckId,
                st.registration_number as SourceTruckReg,
                t.destination_truck_id as DestinationTruckId,
                dt.registration_number as DestinationTruckReg,
                t.quantity as Quantity,
                t.transfer_date as TransferDate,
                t.status::text as Status,
                t.is_confirmed_by_receiver as IsConfirmedByReceiver,
                t.transload_type as TransloadType,
                u.full_name as CreatedByName,
                d.full_name as ReceivingDriverName
            FROM transloading t
            JOIN trucks st ON t.source_truck_id = st.id
            JOIN trucks dt ON t.destination_truck_id = dt.id
            JOIN users u ON t.created_by = u.id
            JOIN drivers d ON t.receiving_driver_id = d.id
            ORDER BY t.created_at DESC";
        
        return await connection.QueryAsync<Transload>(sql);
    }

    private async Task<Transload> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                t.id as Id,
                t.source_truck_id as SourceTruckId,
                st.registration_number as SourceTruckReg,
                t.destination_truck_id as DestinationTruckId,
                dt.registration_number as DestinationTruckReg,
                t.quantity as Quantity,
                t.transfer_date as TransferDate,
                t.status::text as Status,
                t.is_confirmed_by_receiver as IsConfirmedByReceiver,
                t.receiver_confirmed_at as ReceiverConfirmedAt,
                t.transload_type as TransloadType,
                u.full_name as CreatedByName,
                d.full_name as ReceivingDriverName
            FROM transloading t
            JOIN trucks st ON t.source_truck_id = st.id
            JOIN trucks dt ON t.destination_truck_id = dt.id
            JOIN users u ON t.created_by = u.id
            JOIN drivers d ON t.receiving_driver_id = d.id
            WHERE t.id = @Id";
        
        return await connection.QueryFirstOrDefaultAsync<Transload>(sql, new { Id = id });
    }
}
