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

    public MaintenanceController(IMaintenanceService maintenanceService)
    {
        _maintenanceService = maintenanceService;
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
    public async Task<IActionResult> Create([FromBody] MaintenanceLog log)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        log.CreatedBy = userId;
        log.Status = MaintenanceStatus.Pending;

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

public class UpdateStatusRequest
{
    public MaintenanceStatus Status { get; set; }
}
