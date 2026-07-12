using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;
using Dapper;
using ChosenEnergy.API.Data;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/inwardloads")]
[Authorize]
public class InwardLoadsController : ControllerBase
{
    private readonly IInwardLoadService _loadService;
    private readonly IDbConnectionFactory _connectionFactory;

    public InwardLoadsController(IInwardLoadService loadService, IDbConnectionFactory connectionFactory)
    {
        _loadService = loadService;
        _connectionFactory = connectionFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var logs = await _loadService.GetAllAsync();
        return Ok(new { success = true, data = logs });
    }

    // Feature 5: Get approved purchases that have remaining undisbursed quantity
    [HttpGet("pending-purchases")]
    [Authorize(Roles = "Admin,MD")]
    public async Task<IActionResult> GetPendingPurchases()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                p.id as Id,
                p.purchase_id as PurchaseId,
                p.quantity as Quantity,
                p.cost_per_litre as CostPerLitre,
                p.total_cost as TotalCost,
                p.purchase_date as PurchaseDate,
                p.status::text as Status,
                COALESCE(p.disbursed_quantity, 0) as DisbursedQuantity,
                p.quantity - COALESCE(p.disbursed_quantity, 0) as RemainingQuantity,
                d.name as DepotName,
                u.full_name as CreatedByName
            FROM purchases p
            LEFT JOIN depots d ON p.depot_id = d.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.status = 'Approved'::approval_status
            AND COALESCE(p.disbursed_quantity, 0) < p.quantity
            ORDER BY p.purchase_date DESC";

        var purchases = await connection.QueryAsync<Purchase>(sql);
        return Ok(new { success = true, data = purchases });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InwardLoad load)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var created = await _loadService.CreateAsync(load, Guid.Parse(userIdStr));

        // Feature 5: Update disbursed_quantity on the purchase record
        if (load.PurchaseId.HasValue)
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(
                "UPDATE purchases SET disbursed_quantity = COALESCE(disbursed_quantity, 0) + @Qty WHERE id = @Id",
                new { Qty = load.Quantity, Id = load.PurchaseId.Value });
        }

        return Ok(new { success = true, data = created, message = "Inward load created successfully" });
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulk([FromBody] BulkInwardLoadRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var created = await _loadService.CreateBulkAsync(request, Guid.Parse(userIdStr));

        // Feature 5: Update disbursed_quantity on the purchase record
        if (request.PurchaseId.HasValue)
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(
                "UPDATE purchases SET disbursed_quantity = COALESCE(disbursed_quantity, 0) + @Qty WHERE id = @Id",
                new { Qty = request.Quantity, Id = request.PurchaseId.Value });
        }

        return Ok(new { success = true, data = created, message = "Bulk inward loads created" });
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin" && role != "MD") return StatusCode(403, new { success = false, message = "Access denied" });

        var pending = await _loadService.GetPendingGroupedAsync();
        return Ok(new { success = true, data = pending });
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin" && role != "MD") return StatusCode(403, new { success = false, message = "Only Admin or MD can approve loads" });

        var result = await _loadService.ApproveAsync(id, Guid.Parse(userIdStr));
        return Ok(new { success = true, data = result, message = "Load approved" });
    }

    [HttpPost("batch/{batchId}/approve")]
    public async Task<IActionResult> ApproveBatch(Guid batchId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin" && role != "MD") return StatusCode(403, new { success = false, message = "Only Admin or MD can approve" });

        await _loadService.ApproveBatchAsync(batchId, Guid.Parse(userIdStr));
        return Ok(new { success = true, message = "Batch approved successfully" });
    }
}

