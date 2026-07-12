using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;
using System.Security.Claims;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaintenanceController : ControllerBase
{
    private readonly IMaintenanceService _maintenanceService;
    private readonly IFileService _fileService;

    public MaintenanceController(IMaintenanceService maintenanceService, IFileService fileService)
    {
        _maintenanceService = maintenanceService;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var logs = await _maintenanceService.GetAllAsync();
        return Ok(new { success = true, data = logs });
    }

    [HttpGet("truck/{truckId}")]
    public async Task<IActionResult> GetByTruck(Guid truckId)
    {
        var logs = await _maintenanceService.GetByTruckIdAsync(truckId);
        return Ok(new { success = true, data = logs });
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateMaintenanceRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        string? invoiceUrl = null;
        if (request.Invoice != null)
        {
            invoiceUrl = await _fileService.SaveFileAsync(request.Invoice, "maintenance");
        }

        var log = new MaintenanceLog
        {
            TruckId = request.TruckId,
            Type = request.Type,
            Description = request.Description,
            Cost = request.Cost,
            ScheduledDate = request.ScheduledDate,
            Status = MaintenanceStatus.Pending,
            CreatedBy = userId,
            VendorName = request.VendorName,
            InvoiceUrl = invoiceUrl
        };

        try
        {
            var created = await _maintenanceService.CreateAsync(log);
            return Ok(new { success = true, data = created, message = "Maintenance log created" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        try
        {
            var updated = await _maintenanceService.UpdateStatusAsync(id, request.Status);
            return Ok(new { success = true, data = updated, message = "Status updated" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _maintenanceService.DeleteAsync(id);
        if (!deleted) return NotFound(new { success = false, message = "Log not found" });
        return Ok(new { success = true, message = "Log deleted" });
    }
}

public class CreateMaintenanceRequest
{
    public Guid TruckId { get; set; }
    public MaintenanceType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public DateTime ScheduledDate { get; set; }
    public string? VendorName { get; set; }
    public IFormFile? Invoice { get; set; }
}

public class UpdateStatusRequest
{
    public MaintenanceStatus Status { get; set; }
}

