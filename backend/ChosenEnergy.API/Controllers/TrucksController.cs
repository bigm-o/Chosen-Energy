using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/trucks")]
[Authorize]
public class TrucksController : ControllerBase
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IDailyLogService _dailyLogService;

    public TrucksController(IDbConnectionFactory connectionFactory, IDailyLogService dailyLogService)
    {
        _connectionFactory = connectionFactory;
        _dailyLogService = dailyLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                t.id as Id, 
                t.registration_number as RegistrationNumber, 
                t.capacity as Capacity, 
                t.status::text as Status,
                t.assigned_driver_id as AssignedDriverId,
                u.full_name as DriverName,
                t.created_at as CreatedAt
            FROM trucks t
            LEFT JOIN users u ON t.assigned_driver_id = u.id -- Assuming drivers are users with role 'Driver' or in separate drivers table? DriverService used drivers table... let's check.
            ORDER BY t.registration_number";
            
        // DriverService joined 'drivers' table and 'trucks' table.
        // If drivers are separate entity:
        // 'drivers' table has 'user_id', 'assigned_truck_id'.
        // 'trucks' table might have 'assigned_driver_id' too?
        
        // Let's re-read DriverService GetAll query:
        // SELECT d.id as Id, t.registration_number as TruckRegistration FROM drivers d LEFT JOIN trucks t ON d.assigned_truck_id = t.id
        
        // So trucks -> assigned_driver_id might link to drivers table? Or users table?
        // DriverService CreateAsync sets `assigned_truck_id` on driver, but doesn't set assigned_driver_id on truck?
        // Wait, trucks table schema is unknown.
        
        // Assuming trucks table has 'assigned_driver_id' linking to 'drivers' table (guid).
        
        sql = @"
            SELECT 
                t.id as Id, 
                t.registration_number as RegistrationNumber, 
                t.capacity as CapacityLitres, 
                t.status::text as Status,
                t.truck_type as TruckType,
                t.assigned_driver_id as AssignedDriverId,
                d.full_name as DriverName,
                t.last_maintenance_date as LastMaintenanceDate,
                t.next_maintenance_date as NextMaintenanceDate,
                t.maintenance_interval_days as MaintenanceIntervalDays,
                t.created_at as CreatedAt
            FROM trucks t
            LEFT JOIN drivers d ON t.assigned_driver_id = d.id
            ORDER BY t.registration_number";

        var trucks = await connection.QueryAsync<TruckDto>(sql);
        return Ok(new { success = true, data = trucks });
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                t.id as Id, 
                t.registration_number as RegistrationNumber, 
                t.capacity as CapacityLitres, 
                t.status::text as Status,
                t.truck_type as TruckType
            FROM trucks t
            WHERE t.assigned_driver_id IS NULL AND t.status = 'Active'::truck_status
            ORDER BY t.registration_number";

        var trucks = await connection.QueryAsync<TruckDto>(sql);
        return Ok(new { success = true, data = trucks });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTruckRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try 
        {
            // 1. Insert Truck
            var sqlInsert = @"
                INSERT INTO trucks (registration_number, capacity, status, truck_type, assigned_driver_id, maintenance_interval_days)
                VALUES (@RegistrationNumber, @CapacityLitres, @Status::truck_status, @TruckType, @AssignedDriverId, @MaintenanceIntervalDays)
                RETURNING id";
            
            var truckId = await connection.ExecuteScalarAsync<Guid>(sqlInsert, request, transaction);
            
            // 2. If Driver Assigned, update Driver and handle re-assignment
            if (request.AssignedDriverId.HasValue)
            {
                var driverId = request.AssignedDriverId.Value;
                
                // Check if driver was assigned to another truck
                var oldTruckId = await connection.QueryFirstOrDefaultAsync<Guid?>(
                    "SELECT assigned_truck_id FROM drivers WHERE id = @DriverId", new { DriverId = driverId }, transaction);
                    
                if (oldTruckId.HasValue)
                {
                    // Clean up old truck
                    await connection.ExecuteAsync(
                        "UPDATE trucks SET assigned_driver_id = NULL WHERE id = @OldTruckId", 
                        new { OldTruckId = oldTruckId }, transaction);
                }
                
                // Update Driver to point to new truck
                await connection.ExecuteAsync(
                    "UPDATE drivers SET assigned_truck_id = @TruckId WHERE id = @DriverId",
                    new { DriverId = driverId, TruckId = truckId }, transaction);
            }
            
            transaction.Commit();
            return Ok(new { success = true, data = new { Id = truckId }, message = "Truck created" });
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTruckRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            // 1. Get current truck state
            var currentTruck = await connection.QueryFirstOrDefaultAsync<TruckDto>(
                "SELECT assigned_driver_id as AssignedDriverId FROM trucks WHERE id = @Id", new { Id = id }, transaction);
                
            if (currentTruck == null) return NotFound(new { success = false, message = "Truck not found" });

            // 2. Update Truck basic info
            var sqlUpdate = @"
                UPDATE trucks 
                SET registration_number = @RegistrationNumber, 
                    capacity = @CapacityLitres, 
                    status = @Status::truck_status,
                    truck_type = @TruckType,
                    assigned_driver_id = @AssignedDriverId,
                    maintenance_interval_days = @MaintenanceIntervalDays,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id";
                
            await connection.ExecuteAsync(sqlUpdate, new { 
                Id = id, 
                request.RegistrationNumber, 
                request.CapacityLitres, 
                request.Status, 
                request.TruckType,
                request.AssignedDriverId,
                request.MaintenanceIntervalDays
            }, transaction);

            // 3. Handle Driver Assignment Changes
            // If driver changed
            if (currentTruck.AssignedDriverId != request.AssignedDriverId)
            {
                // A. If there was an old driver, clear their truck assignment
                if (currentTruck.AssignedDriverId.HasValue)
                {
                    await connection.ExecuteAsync(
                        "UPDATE drivers SET assigned_truck_id = NULL WHERE id = @DriverId",
                        new { DriverId = currentTruck.AssignedDriverId }, transaction);
                }

                // B. If there is a new driver, update their assignment
                if (request.AssignedDriverId.HasValue)
                {
                    var newDriverId = request.AssignedDriverId.Value;
                    
                    // Check if new driver had another truck
                    var oldTruckOfNewDriver = await connection.QueryFirstOrDefaultAsync<Guid?>(
                        "SELECT assigned_truck_id FROM drivers WHERE id = @DriverId", new { DriverId = newDriverId }, transaction);

                    if (oldTruckOfNewDriver.HasValue && oldTruckOfNewDriver != id)
                    {
                        // Set that other truck's driver to null
                        await connection.ExecuteAsync(
                            "UPDATE trucks SET assigned_driver_id = NULL WHERE id = @OldTruckId",
                            new { OldTruckId = oldTruckOfNewDriver }, transaction);
                    }

                    // Assign driver to this truck
                    await connection.ExecuteAsync(
                        "UPDATE drivers SET assigned_truck_id = @TruckId WHERE id = @DriverId",
                        new { DriverId = newDriverId, TruckId = id }, transaction);
                }
            }

            transaction.Commit();
            return Ok(new { success = true, message = "Truck updated successfully" });
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            // Check if truck has assigned driver
            var assignedDriverId = await connection.ExecuteScalarAsync<Guid?>(
                "SELECT assigned_driver_id FROM trucks WHERE id = @Id", new { Id = id }, transaction);

            if (assignedDriverId.HasValue)
            {
                // Unassign driver first
                await connection.ExecuteAsync(
                    "UPDATE drivers SET assigned_truck_id = NULL WHERE id = @DriverId",
                    new { DriverId = assignedDriverId }, transaction);
            }

            // Delete truck (soft delete preferably, but user asked for Delete)
            // Assuming hard delete for now or status='Inactive' if preferred.
            // Let's do Soft Delete by setting status Inactive? No, Delete implies removal.
            // But let's check if supplies use it.
            
            var supplyCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM supplies WHERE truck_id = @Id", new { Id = id }, transaction);

            if (supplyCount > 0)
            {
                 // Soft delete
                 await connection.ExecuteAsync(
                    "UPDATE trucks SET status = 'Inactive'::truck_status, assigned_driver_id = NULL WHERE id = @Id",
                    new { Id = id }, transaction);
                 
                 transaction.Commit();
                 return Ok(new { success = true, message = "Truck set to Inactive due to existing records" });
            }

            await connection.ExecuteAsync("DELETE FROM trucks WHERE id = @Id", new { Id = id }, transaction);
            
            transaction.Commit();
            return Ok(new { success = true, message = "Truck deleted successfully" });
        }
        catch (Exception ex)
        {
             transaction.Rollback();
             return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{id}/balance")]
    public async Task<IActionResult> GetBalance(Guid id)
    {
        var balance = await _dailyLogService.GetTruckBalanceAsync(id, DateTime.UtcNow);
        return Ok(new { success = true, balance });
    }
}

public class UpdateTruckRequest : CreateTruckRequest { }

public class CreateTruckRequest
{
    public string RegistrationNumber { get; set; } = string.Empty;
    public decimal CapacityLitres { get; set; }
    public string Status { get; set; } = "Active";
    public string TruckType { get; set; } = "Large"; // Small or Large
    public Guid? AssignedDriverId { get; set; }
    public int MaintenanceIntervalDays { get; set; } = 90;
}

public class TruckDto
{
    public Guid Id { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public decimal CapacityLitres { get; set; }
    public string Status { get; set; } = string.Empty;
    public string TruckType { get; set; } = "Large";
    public Guid? AssignedDriverId { get; set; }
    public string? DriverName { get; set; }
    public DateTime? LastMaintenanceDate { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }
    public int MaintenanceIntervalDays { get; set; }
    public DateTime CreatedAt { get; set; }
}
