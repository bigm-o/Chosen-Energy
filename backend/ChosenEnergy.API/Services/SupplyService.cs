using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using System.Text.Json;

namespace ChosenEnergy.API.Services;

public interface ISupplyService
{
    Task<IEnumerable<Supply>> GetAllAsync();
    Task<Supply?> GetByIdAsync(Guid id);
    Task<Supply> CreateAsync(Supply supply, Guid userId);
    Task<Supply> UpdateAsync(Guid id, Supply supply, Guid userId, string userRole, string? editReason = null);
    Task<Supply> ApproveAsync(Guid id, Guid userId); 
    Task<Supply> RejectAsync(Guid id, Guid userId, string reason);
    Task<Supply> ApproveEditAsync(Guid id, Guid userId, string userRole);
    Task<Supply> RejectEditAsync(Guid id, Guid userId);
    Task<IEnumerable<Supply>> GetPendingAsync();
    Task<IEnumerable<Supply>> GetByDateRangeAsync(DateTime start, DateTime end);
    Task<bool> DeleteAsync(Guid id);
}

public class SupplyService : ISupplyService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;
    private readonly IDailyLogService _dailyLogService;
    private readonly IInvoiceService _invoiceService;

    public SupplyService(IDbConnectionFactory connectionFactory, IAuditService auditService, INotificationService notificationService, IDailyLogService dailyLogService, IInvoiceService invoiceService)
    {
        _connectionFactory = connectionFactory;
        _auditService = auditService;
        _notificationService = notificationService;
        _dailyLogService = dailyLogService;
        _invoiceService = invoiceService;
    }

    public async Task<IEnumerable<Supply>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                s.id as Id,
                s.sale_id as SaleId,
                s.customer_id as CustomerId,
                s.truck_id as TruckId,
                s.driver_id as DriverId,
                s.quantity as Quantity,
                s.price_per_litre as PricePerLitre,
                s.total_amount as TotalAmount,
                s.supply_date as SupplyDate,
                s.status::text as Status,
                s.invoice_url as InvoiceUrl,
                s.rejection_reason as RejectionReason,
                s.edit_reason as EditReason,
                s.has_pending_edit as HasPendingEdit,
                s.original_values as OriginalValues,
                s.created_at as CreatedAt,
                c.company_name as CustomerName,
                d.name as DepotName,
                t.registration_number as TruckRegNumber,
                dr.full_name as DriverName,
                u.full_name as CreatedByName,
                u2.full_name as EditedByName
            FROM supplies s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN depots d ON s.depot_id = d.id
            LEFT JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN drivers dr ON s.driver_id = dr.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN users u2 ON s.edited_by = u2.id
            ORDER BY s.created_at DESC";
        
        return await connection.QueryAsync<Supply>(sql);
    }

    public async Task<Supply?> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                s.id as Id,
                s.sale_id as SaleId,
                s.customer_id as CustomerId,
                s.truck_id as TruckId,
                s.driver_id as DriverId,
                s.quantity as Quantity,
                s.price_per_litre as PricePerLitre,
                s.total_amount as TotalAmount,
                s.supply_date as SupplyDate,
                s.status::text as Status,
                s.invoice_url as InvoiceUrl,
                s.rejection_reason as RejectionReason,
                s.edit_reason as EditReason,
                s.has_pending_edit as HasPendingEdit,
                s.original_values as OriginalValues,
                s.created_at as CreatedAt,
                c.company_name as CustomerName,
                d.name as DepotName,
                t.registration_number as TruckRegNumber,
                dr.full_name as DriverName,
                u.full_name as CreatedByName,
                u2.full_name as EditedByName
            FROM supplies s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN depots d ON s.depot_id = d.id
            LEFT JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN drivers dr ON s.driver_id = dr.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN users u2 ON s.edited_by = u2.id
            WHERE s.id = @Id";
        
        return await connection.QueryFirstOrDefaultAsync<Supply>(sql, new { Id = id });
    }

    public async Task<Supply> CreateAsync(Supply supply, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // 1. Validation: Truck Assignment
        var truckQuery = @"
            SELECT 
                t.id as truckid,
                t.next_maintenance_date as nextmaintenance
            FROM drivers d
            JOIN trucks t ON d.assigned_truck_id = t.id
            WHERE d.id = @DriverId";
            
        var assignedTruck = await connection.QueryFirstOrDefaultAsync<dynamic>(truckQuery, new { DriverId = supply.DriverId });

        if (assignedTruck == null)
        {
            throw new InvalidOperationException($"The selected driver does not have an active truck assignment. DriverId: {supply.DriverId}");
        }
        
        Guid assignedTruckId = (Guid)assignedTruck.truckid;
        DateTime? nextMaintenance = assignedTruck.nextmaintenance;
        
        if (nextMaintenance.HasValue && nextMaintenance.Value < DateTime.UtcNow.Date)
        {
            throw new InvalidOperationException($"Cannot assign truck. The assigned truck is overdue for maintenance since {nextMaintenance.Value:d}. Please schedule maintenance first.");
        }

        // 2. Validation: Inventory Balance Check
        var currentBalance = await _dailyLogService.GetTruckBalanceAsync(assignedTruckId, DateTime.UtcNow);
        if (currentBalance < supply.Quantity)
        {
            throw new InvalidOperationException($"Insufficient load available. Available: {currentBalance:N0} L, Requested: {supply.Quantity:N0} L");
        }
        // 3. Profitability: Capture Cost Price (Latest Approved Purchase Price)


        var sql = @"
            INSERT INTO supplies (
                sale_id, customer_id, truck_id, driver_id, depot_id, quantity, price_per_litre, total_amount, supply_date, invoice_url, status, created_by
            )
            VALUES (
                'SAL-' || LPAD(nextval('sale_id_seq')::text, 3, '0'), @CustomerId, @TruckId, @DriverId, @DepotId, @Quantity, @PricePerLitre, @TotalAmount, @SupplyDate, @InvoiceUrl, 'Pending'::approval_status, @UserId
            )
            RETURNING 
                id as Id,
                sale_id as SaleId,
                customer_id as CustomerId,
                quantity as Quantity,
                price_per_litre as PricePerLitre,
                total_amount as TotalAmount,
                status::text as Status,
                created_at as CreatedAt;";

        var createdSupply = await connection.QueryFirstAsync<Supply>(sql, new
        {
            CustomerId = supply.CustomerId,
            TruckId = assignedTruckId,
            DriverId = supply.DriverId,
            DepotId = supply.DepotId,
            Quantity = supply.Quantity,
            PricePerLitre = supply.PricePerLitre,
            TotalAmount = supply.TotalAmount,
            SupplyDate = supply.SupplyDate,
            InvoiceUrl = supply.InvoiceUrl,
            UserId = userId
        });

        // Track invoice - Removed old placeholder logic, now handled in ApproveAsync

        // Feature 5: Notifications
        await _notificationService.NotifyRoleAsync("MD", 
            "New Supply Request", 
            $"New supply created for {supply.Quantity:N0} L (₦{supply.TotalAmount:N2}). Pending approval.", 
            "Info", $"/sales?status=Pending");
            
        await _notificationService.NotifyRoleAsync("Admin", 
            "New Supply Request", 
            $"New supply created for {supply.Quantity:N0} L. Pending approval.", 
            "Info", $"/sales?status=Pending");

        return createdSupply;
    }

    public async Task<Supply> UpdateAsync(Guid id, Supply supply, Guid userId, string userRole, string? editReason = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Supply record not found");

            // If already approved, and user is not MD, create a pending edit
            if (existing.Status == "Approved" && userRole != "MD")
            {
                var originalValues = JsonSerializer.Serialize(new
                {
                    existing.CustomerId,
                    existing.Quantity,
                    existing.PricePerLitre,
                    existing.DriverId,
                    existing.SupplyDate
                });

                var sqlEdit = @"
                    UPDATE supplies 
                    SET customer_id = @CustomerId,
                        driver_id = @DriverId,
                        quantity = @Quantity,
                        price_per_litre = @PricePerLitre,
                        total_amount = @TotalAmount,
                        supply_date = @SupplyDate,
                        edit_reason = @EditReason,
                        edited_by = @UserId,
                        has_pending_edit = true,
                        original_values = @OriginalValues,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @Id
                    RETURNING *";

                var updated = await connection.QueryFirstAsync<Supply>(sqlEdit, new
                {
                    Id = id,
                    supply.CustomerId,
                    supply.DriverId,
                    supply.Quantity,
                    supply.PricePerLitre,
                    TotalAmount = supply.Quantity * supply.PricePerLitre,
                    supply.SupplyDate,
                    EditReason = editReason,
                    UserId = userId,
                    OriginalValues = originalValues
                }, transaction);

                await _notificationService.NotifyRoleAsync("MD", "Sales Edit Pending", $"A sale edit request for {existing.SaleId} needs your approval.", "Info", "/sales");

                transaction.Commit();
                return updated;
            }
            else
            {
                // Direct update (if still pending or if user is MD)
                var oldQuantity = existing.Status == "Approved" ? existing.Quantity : 0;
                var newQuantity = supply.Quantity;

                var sqlDirect = @"
                    UPDATE supplies 
                    SET customer_id = @CustomerId,
                        driver_id = @DriverId,
                        quantity = @Quantity,
                        price_per_litre = @PricePerLitre,
                        total_amount = @TotalAmount,
                        supply_date = @SupplyDate,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @Id
                    RETURNING *";

                var updated = await connection.QueryFirstAsync<Supply>(sqlDirect, new
                {
                    Id = id,
                    supply.CustomerId,
                    supply.DriverId,
                    supply.Quantity,
                    supply.PricePerLitre,
                    TotalAmount = supply.Quantity * supply.PricePerLitre,
                    supply.SupplyDate
                }, transaction);

                // If MD updating an approved supply, update depot stock by difference
                if (existing.Status == "Approved" && existing.DepotId.HasValue)
                {
                    var diff = newQuantity - oldQuantity;
                    if (diff != 0)
                    {
                        // Reversed stock (diff is positive if new > old, so we deduct MORE from depot)
                        var operation = diff > 0 ? "-" : "+";
                         await connection.ExecuteAsync(
                             $"UPDATE depots SET current_stock = current_stock {operation} @Quantity WHERE id = @DepotId",
                             new { Quantity = Math.Abs(diff), DepotId = existing.DepotId.Value }, transaction);
                    }
                }

                transaction.Commit();
                return updated;
            }
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<Supply> ApproveAsync(Guid id, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var supply = await connection.QueryFirstOrDefaultAsync<Supply>(
                "SELECT * FROM supplies WHERE id = @Id", new { Id = id }, transaction);

            if (supply == null) throw new KeyNotFoundException("Supply record not found");
            if (supply.Status == "Approved") throw new InvalidOperationException("Supply is already approved");

            // Update Supply Status
            var sqlUpdate = @"
                UPDATE supplies 
                SET status = 'Approved'::approval_status,
                    md_approved_by = @UserId,
                    md_approved_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING 
                    id as Id,
                    sale_id as SaleId,
                    depot_id as DepotId,
                    quantity as Quantity,
                    status::text as Status,
                    created_by as CreatedBy,
                    updated_at as UpdatedAt";

            var updatedSupply = await connection.QueryFirstAsync<Supply>(
                sqlUpdate, new { Id = id, UserId = userId }, transaction);

            // Deduct from Depot Stock
            if (supply.DepotId.HasValue)
            {
                await connection.ExecuteAsync(
                    "UPDATE depots SET current_stock = current_stock - @Quantity WHERE id = @DepotId",
                    new { Quantity = supply.Quantity, DepotId = supply.DepotId.Value }, transaction);
            }

            // --- AUTO-GENERATE INVOICE UPON APPROVAL ---
            try 
            {
                // Default due date: 7 days from now
                await _invoiceService.CreateFromSupplyAsync(updatedSupply.Id, DateTime.UtcNow.AddDays(7));
            }
            catch (Exception ex)
            {
                // Log but don't fail approval if invoicing fails
                Console.WriteLine($"Invoicing failed for supply {updatedSupply.Id}: {ex.Message}");
            }

            transaction.Commit();

            await _auditService.LogAsync(
                userId: userId,
                action: "ApproveSupply",
                entityType: "Supply",
                entityId: id,
                oldValues: new { Status = supply.Status },
                newValues: new { Status = "Approved", Quantity = supply.Quantity },
                ipAddress: null
            );

            // Feature 5: Notifications
            if (updatedSupply.CreatedBy.HasValue)
            {
                await _notificationService.NotifyUserAsync(updatedSupply.CreatedBy.Value, 
                    "Supply Approved", 
                    $"Your supply request for {updatedSupply.Quantity:N0} L has been approved.", 
                    "Success", $"/sales");
            }

            return updatedSupply;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<Supply> RejectAsync(Guid id, Guid userId, string reason)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            UPDATE supplies 
            SET status = 'Rejected'::approval_status,
                rejection_reason = @Reason,
                md_approved_by = @UserId,
                md_approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id
            RETURNING 
                id as Id,
                sale_id as SaleId,
                status::text as Status,
                created_by as CreatedBy,
                updated_at as UpdatedAt";

        var result = await connection.QueryFirstAsync<Supply>(sql, new { Id = id, UserId = userId });
        
        await _auditService.LogAsync(
            userId: userId,
            action: "RejectSupply",
            entityType: "Supply",
            entityId: id,
            oldValues: null,
            newValues: new { Status = "Rejected", Reason = reason },
            ipAddress: null
        );
        
        // Feature 5: Notifications
        if (result.CreatedBy.HasValue)
        {
             await _notificationService.NotifyUserAsync(result.CreatedBy.Value, 
                "Supply Rejected", 
                $"Supply request {result.SaleId} rejected. Reason: {reason}", 
                "Warning", $"/sales");
        }

        return result;
    }

    public async Task<Supply> ApproveEditAsync(Guid id, Guid userId, string userRole)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Supply record not found");
            if (!existing.HasPendingEdit || string.IsNullOrEmpty(existing.OriginalValues))
                throw new InvalidOperationException("No pending edit found");

            var original = JsonSerializer.Deserialize<JsonElement>(existing.OriginalValues);
            decimal oldQuantity = original.GetProperty("Quantity").GetDecimal();
            
            // Apply edit
            var sql = @"
                UPDATE supplies 
                SET has_pending_edit = false,
                    original_values = NULL,
                    md_approved_by = @UserId,
                    md_approved_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING *";

            var updated = await connection.QueryFirstAsync<Supply>(sql, new { Id = id, UserId = userId }, transaction);

            // Update Stock: Reverse old quantity effect, add new quantity effect
            if (existing.DepotId.HasValue)
            {
                var diff = updated.Quantity - oldQuantity;
                if (diff != 0)
                {
                    var operation = diff > 0 ? "-" : "+"; // More fuel sold = more deducted from depot
                    await connection.ExecuteAsync(
                         $"UPDATE depots SET current_stock = current_stock {operation} @Quantity WHERE id = @DepotId",
                         new { Quantity = Math.Abs(diff), DepotId = existing.DepotId.Value }, transaction);
                }
            }

            transaction.Commit();
            return updated;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<Supply> RejectEditAsync(Guid id, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Supply record not found");
            if (!existing.HasPendingEdit || string.IsNullOrEmpty(existing.OriginalValues))
                throw new InvalidOperationException("No pending edit to reject");

            var original = JsonSerializer.Deserialize<JsonElement>(existing.OriginalValues);

            var sql = @"
                UPDATE supplies 
                SET customer_id = @CustomerId,
                    quantity = @Quantity,
                    price_per_litre = @PricePerLitre,
                    total_amount = @TotalAmount,
                    supply_date = @SupplyDate,
                    driver_id = @DriverId,
                    has_pending_edit = false,
                    original_values = NULL,
                    edit_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING *";

            var updated = await connection.QueryFirstAsync<Supply>(sql, new
            {
                Id = id,
                CustomerId = original.GetProperty("CustomerId").GetGuid(),
                Quantity = original.GetProperty("Quantity").GetDecimal(),
                PricePerLitre = original.GetProperty("PricePerLitre").GetDecimal(),
                TotalAmount = original.GetProperty("Quantity").GetDecimal() * original.GetProperty("PricePerLitre").GetDecimal(),
                SupplyDate = original.GetProperty("SupplyDate").GetDateTime(),
                DriverId = original.GetProperty("DriverId").GetGuid()
            }, transaction);

            transaction.Commit();
            return updated;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<IEnumerable<Supply>> GetPendingAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                s.id as Id,
                s.sale_id as SaleId,
                s.quantity as Quantity,
                s.total_amount as TotalAmount,
                s.price_per_litre as PricePerLitre,
                s.supply_date as SupplyDate,
                s.status::text as Status,
                s.has_pending_edit as HasPendingEdit,
                s.invoice_url as InvoiceUrl,
                s.customer_id as CustomerId,
                s.truck_id as TruckId,
                s.driver_id as DriverId,
                c.company_name as CustomerName,
                u.full_name as CreatedByName,
                t.registration_number as TruckRegNumber,
                dr.full_name as DriverName
            FROM supplies s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN drivers dr ON s.driver_id = dr.id
            WHERE s.status = 'Pending'::approval_status OR s.has_pending_edit = true
            ORDER BY s.created_at DESC";
        
        return await connection.QueryAsync<Supply>(sql);
    }

    public async Task<IEnumerable<Supply>> GetByDateRangeAsync(DateTime start, DateTime end)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                s.id as Id,
                s.sale_id as SaleId,
                s.customer_id as CustomerId,
                s.truck_id as TruckId,
                s.driver_id as DriverId,
                s.quantity as Quantity,
                s.price_per_litre as PricePerLitre,
                s.total_amount as TotalAmount,
                s.supply_date as SupplyDate,
                s.status::text as Status,
                s.invoice_url as InvoiceUrl,
                s.created_at as CreatedAt,
                c.company_name as CustomerName,
                t.registration_number as TruckRegNumber,
                dr.full_name as DriverName,
                u.full_name as CreatedByName
            FROM supplies s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN drivers dr ON s.driver_id = dr.id
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.supply_date >= @Start AND s.supply_date <= @End
            ORDER BY s.supply_date DESC";
        
        return await connection.QueryAsync<Supply>(sql, new { Start = start, End = end });
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync("DELETE FROM supplies WHERE id = @Id AND status = 'Pending'::approval_status", new { Id = id });
        return rows > 0;
    }
}
