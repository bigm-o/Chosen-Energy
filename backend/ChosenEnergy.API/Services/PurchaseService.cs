using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using System.Text.Json;

namespace ChosenEnergy.API.Services;

public interface IPurchaseService
{
    Task<IEnumerable<Purchase>> GetAllAsync();
    Task<IEnumerable<Purchase>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<Purchase?> GetByIdAsync(Guid id);
    Task<Purchase> CreateAsync(Purchase purchase, Guid userId, string userRole);
    Task<Purchase> UpdateAsync(Guid id, Purchase purchase, Guid userId, string userRole, string? editReason = null);
    Task<bool> DeleteAsync(Guid id);
    Task<Purchase> ApproveAsync(Guid id, Guid userId, string userRole);
    Task<Purchase> RejectAsync(Guid id, Guid userId, string reason);
    Task<Purchase> ApproveEditAsync(Guid id, Guid userId, string userRole);
    Task<Purchase> RejectEditAsync(Guid id, Guid userId);
    Task<IEnumerable<Purchase>> GetPendingAsync();
    Task UpdateReceiptUrlAsync(Guid id, string receiptUrl);
}

public class PurchaseService : IPurchaseService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;

    public PurchaseService(IDbConnectionFactory connectionFactory, IAuditService auditService, INotificationService notificationService)
    {
        _connectionFactory = connectionFactory;
        _auditService = auditService;
        _notificationService = notificationService;
    }

    public async Task<IEnumerable<Purchase>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                p.id as Id,
                p.purchase_id as PurchaseId,
                p.depot_id as DepotId,
                p.quantity as Quantity,
                p.cost_per_litre as CostPerLitre,
                p.total_cost as TotalCost,
                p.purchase_date as PurchaseDate,
                p.receipt_url as ReceiptUrl,
                p.status::text as Status,
                p.created_by as CreatedBy,
                p.approved_by as ApprovedBy,
                p.edited_by as EditedBy,
                p.rejection_reason as RejectionReason,
                p.edit_reason as EditReason,
                p.original_values as OriginalValues,
                p.has_pending_edit as HasPendingEdit,
                p.created_at as CreatedAt,
                p.updated_at as UpdatedAt,
                d.name as DepotName,
                u1.full_name as CreatedByName,
                u2.full_name as ApprovedByName,
                u3.full_name as EditedByName
            FROM purchases p
            LEFT JOIN depots d ON p.depot_id = d.id
            LEFT JOIN users u1 ON p.created_by = u1.id
            LEFT JOIN users u2 ON p.approved_by = u2.id
            LEFT JOIN users u3 ON p.edited_by = u3.id
            ORDER BY p.created_at DESC";
        
        return await connection.QueryAsync<Purchase>(sql);
    }

    public async Task<IEnumerable<Purchase>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                p.id as Id,
                p.purchase_id as PurchaseId,
                p.depot_id as DepotId,
                p.quantity as Quantity,
                p.cost_per_litre as CostPerLitre,
                p.total_cost as TotalCost,
                p.purchase_date as PurchaseDate,
                p.receipt_url as ReceiptUrl,
                p.status::text as Status,
                p.created_by as CreatedBy,
                p.approved_by as ApprovedBy,
                p.edited_by as EditedBy,
                p.rejection_reason as RejectionReason,
                p.edit_reason as EditReason,
                p.original_values as OriginalValues,
                p.has_pending_edit as HasPendingEdit,
                p.created_at as CreatedAt,
                p.updated_at as UpdatedAt,
                d.name as DepotName,
                u1.full_name as CreatedByName,
                u2.full_name as ApprovedByName,
                u3.full_name as EditedByName
            FROM purchases p
            LEFT JOIN depots d ON p.depot_id = d.id
            LEFT JOIN users u1 ON p.created_by = u1.id
            LEFT JOIN users u2 ON p.approved_by = u2.id
            LEFT JOIN users u3 ON p.edited_by = u3.id
            WHERE p.purchase_date >= @StartDate AND p.purchase_date <= @EndDate
            ORDER BY p.purchase_date DESC";
        
        return await connection.QueryAsync<Purchase>(sql, new { StartDate = startDate, EndDate = endDate });
    }

    public async Task<Purchase?> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                p.id as Id,
                p.purchase_id as PurchaseId,
                p.depot_id as DepotId,
                p.quantity as Quantity,
                p.cost_per_litre as CostPerLitre,
                p.total_cost as TotalCost,
                p.purchase_date as PurchaseDate,
                p.receipt_url as ReceiptUrl,
                p.status::text as Status,
                p.created_by as CreatedBy,
                p.approved_by as ApprovedBy,
                p.edited_by as EditedBy,
                p.rejection_reason as RejectionReason,
                p.edit_reason as EditReason,
                p.original_values as OriginalValues,
                p.has_pending_edit as HasPendingEdit,
                p.created_at as CreatedAt,
                p.updated_at as UpdatedAt,
                d.name as DepotName,
                u1.full_name as CreatedByName,
                u2.full_name as ApprovedByName,
                u3.full_name as EditedByName
            FROM purchases p
            LEFT JOIN depots d ON p.depot_id = d.id
            LEFT JOIN users u1 ON p.created_by = u1.id
            LEFT JOIN users u2 ON p.approved_by = u2.id
            LEFT JOIN users u3 ON p.edited_by = u3.id
            WHERE p.id = @Id";
        
        return await connection.QueryFirstOrDefaultAsync<Purchase>(sql, new { Id = id });
    }

    public async Task<Purchase> CreateAsync(Purchase purchase, Guid userId, string userRole)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // MD can create and auto-approve, Admin creates as Pending
        var status = userRole == "MD" ? "Approved" : "Pending";
        
        var sql = @"
            INSERT INTO purchases (purchase_id, depot_id, quantity, cost_per_litre, total_cost, purchase_date, receipt_url, status, created_by, approved_by)
            VALUES ('PUR-' || LPAD(nextval('purchase_id_seq')::TEXT, 3, '0'), @DepotId, @Quantity, @CostPerLitre, @TotalCost, @PurchaseDate, @ReceiptUrl, @Status::approval_status, @UserId, @ApprovedBy)
            RETURNING 
                id as Id,
                purchase_id as PurchaseId,
                depot_id as DepotId,
                quantity as Quantity,
                cost_per_litre as CostPerLitre,
                total_cost as TotalCost,
                purchase_date as PurchaseDate,
                receipt_url as ReceiptUrl,
                status::text as Status,
                created_by as CreatedBy,
                approved_by as ApprovedBy,
                created_at as CreatedAt,
                updated_at as UpdatedAt";

        var created = await connection.QueryFirstAsync<Purchase>(sql, new
        {
            purchase.DepotId,
            purchase.Quantity,
            purchase.CostPerLitre,
            purchase.TotalCost,
            purchase.PurchaseDate,
            purchase.ReceiptUrl,
            Status = status,
            UserId = userId,
            ApprovedBy = userRole == "MD" ? userId : (Guid?)null
        });

        // If MD created and auto-approved, update stock immediately
        if (userRole == "MD" && purchase.DepotId.HasValue)
        {
            await UpdateDepotStock(connection, purchase.DepotId.Value, purchase.Quantity, true);
        }

        if (status == "Pending")
        {
            await _notificationService.NotifyRoleAsync("MD", 
                "New Purchase Request", 
                $"New purchase pending approval (₦{purchase.TotalCost:N2}).", 
                "Info", $"/purchases?status=Pending");
        }

        await _auditService.LogAsync(userId, "Create", "Purchase", created.Id, null, new { Status = status }, null);

        return created;
    }

    public async Task<Purchase> UpdateAsync(Guid id, Purchase purchase, Guid userId, string userRole, string? editReason = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Purchase not found");

            // If already approved, and user is not MD, create a pending edit
            if (existing.Status == "Approved" && userRole != "MD")
            {
                var originalValues = JsonSerializer.Serialize(new
                {
                    existing.DepotId,
                    existing.Quantity,
                    existing.CostPerLitre,
                    existing.TotalCost,
                    existing.PurchaseDate
                });

                var sqlEdit = @"
                    UPDATE purchases 
                    SET depot_id = @DepotId,
                        quantity = @Quantity,
                        cost_per_litre = @CostPerLitre,
                        total_cost = @TotalCost,
                        purchase_date = @PurchaseDate,
                        edit_reason = @EditReason,
                        edited_by = @UserId,
                        has_pending_edit = true,
                        original_values = @OriginalValues,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @Id
                    RETURNING *";

                var updated = await connection.QueryFirstAsync<Purchase>(sqlEdit, new
                {
                    Id = id,
                    purchase.DepotId,
                    purchase.Quantity,
                    purchase.CostPerLitre,
                    TotalCost = purchase.Quantity * purchase.CostPerLitre,
                    purchase.PurchaseDate,
                    EditReason = editReason,
                    UserId = userId,
                    OriginalValues = originalValues
                }, transaction);

                await _notificationService.NotifyRoleAsync("MD", "Purchase Edit Pending", $"A purchase edit request for {existing.PurchaseId} needs your approval.", "Info", "/purchases/pending");

                transaction.Commit();
                return updated;
            }
            else
            {
                // Direct update (if still pending or if user is MD)
                var oldQuantity = existing.Status == "Approved" ? existing.Quantity : 0;
                var newQuantity = purchase.Quantity;

                var sqlDirect = @"
                    UPDATE purchases 
                    SET depot_id = @DepotId,
                        quantity = @Quantity,
                        cost_per_litre = @CostPerLitre,
                        total_cost = @TotalCost,
                        purchase_date = @PurchaseDate,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @Id
                    RETURNING *";

                var updated = await connection.QueryFirstAsync<Purchase>(sqlDirect, new
                {
                    Id = id,
                    purchase.DepotId,
                    purchase.Quantity,
                    purchase.CostPerLitre,
                    TotalCost = purchase.Quantity * purchase.CostPerLitre,
                    purchase.PurchaseDate
                }, transaction);

                // If MD updating an approved purchase, update stock by difference
                if (existing.Status == "Approved" && purchase.DepotId.HasValue)
                {
                    var diff = newQuantity - oldQuantity;
                    if (diff != 0)
                    {
                        await UpdateDepotStock(connection, purchase.DepotId.Value, diff, true, transaction);
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

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) return false;

            // If approved, reverse stock
            if (existing.Status == "Approved" && existing.DepotId.HasValue)
            {
                await UpdateDepotStock(connection, existing.DepotId.Value, existing.Quantity, false, transaction);
            }

            await connection.ExecuteAsync("DELETE FROM purchases WHERE id = @Id", new { Id = id }, transaction);
            transaction.Commit();
            return true;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<Purchase> ApproveAsync(Guid id, Guid userId, string userRole)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Purchase not found");
            if (existing.Status == "Approved") throw new InvalidOperationException("Already approved");

            var sql = @"
                UPDATE purchases 
                SET status = 'Approved'::approval_status,
                    approved_by = @UserId,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING *";

            var updatedPurchase = await connection.QueryFirstAsync<Purchase>(sql, new { Id = id, UserId = userId }, transaction);

            if (existing.DepotId.HasValue)
            {
                await UpdateDepotStock(connection, existing.DepotId.Value, existing.Quantity, true, transaction);
            }

            await _auditService.LogAsync(
                userId: userId,
                action: "Approve",
                entityType: "Purchase",
                entityId: id,
                oldValues: new { Status = existing.Status },
                newValues: new { Status = "Approved", QuantityAdded = updatedPurchase.Quantity },
                null
            );
            
            if (existing.CreatedBy.HasValue)
            {
                await _notificationService.NotifyUserAsync(existing.CreatedBy.Value, 
                    "Purchase Approved", 
                    $"Purchase request {existing.PurchaseId} approved.", 
                    "Success", $"/purchases/{id}");
            }

            transaction.Commit();
            return updatedPurchase;
        }
        catch 
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<Purchase> RejectAsync(Guid id, Guid userId, string reason)
    {
        using var connection = _connectionFactory.CreateConnection();
        var existing = await GetByIdAsync(id);

        var sql = @"
            UPDATE purchases 
            SET status = 'Rejected'::approval_status,
                approved_by = @UserId,
                rejection_reason = @Reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id
            RETURNING *";

        var updatedPurchase = await connection.QueryFirstAsync<Purchase>(sql, new { Id = id, UserId = userId, Reason = reason });

        await _auditService.LogAsync(
            userId: userId,
            action: "Reject",
            entityType: "Purchase",
            entityId: id,
            oldValues: new { Status = existing?.Status },
            newValues: new { Status = "Rejected", RejectionReason = reason },
            null
        );
        
        if (existing?.CreatedBy.HasValue == true)
        {
            await _notificationService.NotifyUserAsync(existing.CreatedBy.Value, 
                "Purchase Rejected", 
                $"Purchase request {existing.PurchaseId} rejected. Reason: {reason}", 
                "Warning", $"/purchases/{id}");
        }

        return updatedPurchase;
    }

    public async Task<Purchase> ApproveEditAsync(Guid id, Guid userId, string userRole)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Purchase not found");
            if (!existing.HasPendingEdit || string.IsNullOrEmpty(existing.OriginalValues)) 
                throw new InvalidOperationException("No pending edit found");

            var original = JsonSerializer.Deserialize<JsonElement>(existing.OriginalValues);
            decimal oldQuantity = original.GetProperty("Quantity").GetDecimal();
            Guid? oldDepotId = null;
            
            if (original.TryGetProperty("DepotId", out JsonElement depotEl) && depotEl.ValueKind != JsonValueKind.Null)
                oldDepotId = depotEl.GetGuid();

            // Apply edit
            var sql = @"
                UPDATE purchases 
                SET has_pending_edit = false,
                    original_values = NULL,
                    approved_by = @UserId,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING *";

            var updated = await connection.QueryFirstAsync<Purchase>(sql, new { Id = id, UserId = userId }, transaction);

            // Update Stock: Reverse old quantity, add new quantity
            if (oldDepotId.HasValue)
            {
                await UpdateDepotStock(connection, oldDepotId.Value, oldQuantity, false, transaction);
            }
            if (updated.DepotId.HasValue)
            {
                await UpdateDepotStock(connection, updated.DepotId.Value, updated.Quantity, true, transaction);
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

    public async Task<Purchase> RejectEditAsync(Guid id, Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Purchase not found");
            if (!existing.HasPendingEdit || string.IsNullOrEmpty(existing.OriginalValues))
                throw new InvalidOperationException("No pending edit to reject");

            var original = JsonSerializer.Deserialize<JsonElement>(existing.OriginalValues);
            
            var sql = @"
                UPDATE purchases 
                SET depot_id = @DepotId,
                    quantity = @Quantity,
                    cost_per_litre = @CostPerLitre,
                    total_cost = @TotalCost,
                    purchase_date = @PurchaseDate,
                    has_pending_edit = false,
                    original_values = NULL,
                    edit_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id
                RETURNING *";

            var updated = await connection.QueryFirstAsync<Purchase>(sql, new
            {
                Id = id,
                DepotId = original.GetProperty("DepotId").ValueKind == JsonValueKind.Null ? (Guid?)null : original.GetProperty("DepotId").GetGuid(),
                Quantity = original.GetProperty("Quantity").GetDecimal(),
                CostPerLitre = original.GetProperty("CostPerLitre").GetDecimal(),
                TotalCost = original.GetProperty("TotalCost").GetDecimal(),
                PurchaseDate = original.GetProperty("PurchaseDate").GetDateTime()
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

    public async Task<IEnumerable<Purchase>> GetPendingAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                p.id as Id,
                p.purchase_id as PurchaseId,
                p.depot_id as DepotId,
                p.quantity as Quantity,
                p.cost_per_litre as CostPerLitre,
                p.total_cost as TotalCost,
                p.purchase_date as PurchaseDate,
                p.receipt_url as ReceiptUrl,
                p.status::text as Status,
                p.has_pending_edit as HasPendingEdit,
                p.created_at as CreatedAt,
                d.name as DepotName,
                u.full_name as CreatedByName
            FROM purchases p
            LEFT JOIN depots d ON p.depot_id = d.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.status = 'Pending'::approval_status OR p.has_pending_edit = true
            ORDER BY p.created_at DESC";
        
        return await connection.QueryAsync<Purchase>(sql);
    }

    public async Task UpdateReceiptUrlAsync(Guid id, string receiptUrl)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE purchases SET receipt_url = @ReceiptUrl WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = id, ReceiptUrl = receiptUrl });
    }

    private async Task UpdateDepotStock(System.Data.IDbConnection connection, Guid depotId, decimal quantity, bool isAddition, System.Data.IDbTransaction? transaction = null)
    {
        var operation = isAddition ? "+" : "-";
        var sql = $"UPDATE depots SET current_stock = current_stock {operation} @Quantity WHERE id = @DepotId";
        await connection.ExecuteAsync(sql, new { Quantity = Math.Abs(quantity), DepotId = depotId }, transaction);
    }
}
