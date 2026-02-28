using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.DTOs;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliesController : ControllerBase
{
    private readonly ISupplyService _supplyService;

    private readonly IFileService _fileService;
    private readonly ISettingsService _settingsService;

    public SuppliesController(ISupplyService supplyService, IFileService fileService, ISettingsService settingsService)
    {
        _supplyService = supplyService;
        _fileService = fileService;
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Supply>>>> GetAll([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        IEnumerable<Supply> supplies;
        if (startDate.HasValue && endDate.HasValue)
        {
            supplies = await _supplyService.GetByDateRangeAsync(startDate.Value, endDate.Value);
        }
        else
        {
            supplies = await _supplyService.GetAllAsync();
        }
        return Ok(ApiResponse<IEnumerable<Supply>>.SuccessResponse(supplies));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        IEnumerable<Supply> supplies;
        if (startDate.HasValue && endDate.HasValue)
        {
            supplies = await _supplyService.GetByDateRangeAsync(startDate.Value, endDate.Value);
        }
        else
        {
            supplies = await _supplyService.GetAllAsync();
        }

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Sale ID,Date,Customer,Quantity (L),Price/Litre,Total Amount,Driver,Truck,Status,Created By");

        foreach (var s in supplies)
        {
            csv.AppendLine($"{s.SaleId},{s.SupplyDate:yyyy-MM-dd},{s.CustomerName},{s.Quantity},{s.PricePerLitre},{s.TotalAmount},{s.DriverName},{s.TruckRegNumber},{s.Status},{s.CreatedByName}");
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"sales_{DateTime.Now:yyyyMMdd}.csv");
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Supply>>> GetById(Guid id)
    {
        var supply = await _supplyService.GetByIdAsync(id);
        if (supply == null)
            return NotFound(ApiResponse<Supply>.ErrorResponse("Supply not found"));

        return Ok(ApiResponse<Supply>.SuccessResponse(supply));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Supply>>> Create([FromForm] CreateSupplyRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        
        try
        {
            if (request.Invoice == null)
                return BadRequest(ApiResponse<Supply>.ErrorResponse("Invoice file is compulsory for sales records"));

            var invoiceUrl = await _fileService.SaveFileAsync(request.Invoice, "invoices");

            // Fetch Fixed Selling Price
            var priceStr = await _settingsService.GetValueAsync("DieselSellingPrice");
            if (!decimal.TryParse(priceStr, out decimal fixedPrice))
            {
                fixedPrice = request.PricePerLitre; // Fallback if setting not found
            }

            var supply = new Supply
            {
                CustomerId = request.CustomerId,
                DriverId = request.DriverId,
                DepotId = request.DepotId,
                Quantity = request.Quantity,
                PricePerLitre = fixedPrice,
                TotalAmount = request.Quantity * fixedPrice,
                SupplyDate = request.SupplyDate,
                InvoiceUrl = invoiceUrl
            };

            var created = await _supplyService.CreateAsync(supply, userId);
            return Ok(ApiResponse<Supply>.SuccessResponse(created, "Supply request created successfully"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<Supply>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult<ApiResponse<Supply>>> Approve(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (role != "MD" && role != "Admin")
            return StatusCode(403, ApiResponse<string>.ErrorResponse("Only MD or Admin can approve supplies"));

        try 
        {
            var approved = await _supplyService.ApproveAsync(id, userId);
            return Ok(ApiResponse<Supply>.SuccessResponse(approved, "Supply approved successfully"));
        }
        catch (InvalidOperationException ex)
        {
             return BadRequest(ApiResponse<Supply>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult<ApiResponse<Supply>>> Reject(Guid id, [FromBody] ApprovePurchaseRequest request) 
    {
         var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
         var rejected = await _supplyService.RejectAsync(id, userId, request.Reason ?? "");
         return Ok(ApiResponse<Supply>.SuccessResponse(rejected, "Supply rejected"));
     }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Supply>>> Update(Guid id, [FromBody] UpdateSupplyRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var role = User.FindFirst(ClaimTypes.Role)?.Value!;

        try
        {
            var supply = new Supply
            {
                CustomerId = request.CustomerId,
                DriverId = request.DriverId,
                Quantity = request.Quantity,
                PricePerLitre = request.PricePerLitre,
                SupplyDate = request.SupplyDate
            };

            var updated = await _supplyService.UpdateAsync(id, supply, userId, role, request.EditReason);
            return Ok(ApiResponse<Supply>.SuccessResponse(updated, "Supply record updated"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<Supply>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id}/approve-edit")]
    public async Task<ActionResult<ApiResponse<Supply>>> ApproveEdit(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var role = User.FindFirst(ClaimTypes.Role)?.Value!;

        if (role != "MD" && role != "Admin")
            return StatusCode(403, ApiResponse<string>.ErrorResponse("Only MD or Admin can approve edits"));

        try
        {
            var approved = await _supplyService.ApproveEditAsync(id, userId, role);
            return Ok(ApiResponse<Supply>.SuccessResponse(approved, "Supply edit approved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<Supply>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id}/reject-edit")]
    public async Task<ActionResult<ApiResponse<Supply>>> RejectEdit(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        try
        {
            var rejected = await _supplyService.RejectEditAsync(id, userId);
            return Ok(ApiResponse<Supply>.SuccessResponse(rejected, "Supply edit rejected (restored to original)"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<Supply>.ErrorResponse(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> Delete(Guid id)
    {
        var success = await _supplyService.DeleteAsync(id);
        if (!success)
            return BadRequest(ApiResponse<string>.ErrorResponse("Failed to delete. Record might be approved already."));

        return Ok(ApiResponse<string>.SuccessResponse("Supply deleted successfully"));
    }

    [HttpGet("pending")]
    public async Task<ActionResult<ApiResponse<IEnumerable<Supply>>>> GetPending()
    {
        var supplies = await _supplyService.GetPendingAsync();
        return Ok(ApiResponse<IEnumerable<Supply>>.SuccessResponse(supplies));
    }
}

public class UpdateSupplyRequest
{
    public Guid CustomerId { get; set; }
    public Guid DriverId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }
    public DateTime SupplyDate { get; set; }
    public string? EditReason { get; set; }
}
