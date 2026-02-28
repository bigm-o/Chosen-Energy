using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DriversController : ControllerBase
{
    private readonly IDriverService _driverService;

    public DriversController(IDriverService driverService)
    {
        _driverService = driverService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var drivers = await _driverService.GetAllAsync();
        return Ok(new { success = true, data = drivers });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var userId = Guid.Parse(userIdStr);
        var driver = await _driverService.GetByUserIdAsync(userId);
        
        if (driver == null)
            return NotFound(new { success = false, message = "Driver profile not found" });
        
        return Ok(new { success = true, data = driver });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var driver = await _driverService.GetByIdAsync(id);
        if (driver == null)
            return NotFound(new { success = false, message = "Driver not found" });
        
        return Ok(new { success = true, data = driver });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Driver driver)
    {
        var created = await _driverService.CreateAsync(driver);
        return Ok(new { success = true, data = created, message = "Driver created successfully" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Driver driver)
    {
        var updated = await _driverService.UpdateAsync(id, driver);
        return Ok(new { success = true, data = updated, message = "Driver updated successfully" });
    }

    [HttpPost("{id}/assign-truck")]
    public async Task<IActionResult> AssignTruck(Guid id, [FromBody] AssignTruckRequest request)
    {
        var success = await _driverService.AssignTruckAsync(id, request.TruckId);
        if (!success)
            return BadRequest(new { success = false, message = "Failed to assign truck" });
        
        return Ok(new { success = true, message = "Truck assigned successfully" });
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateDriverStatusRequest request)
    {
        var success = await _driverService.UpdateStatusAsync(id, request.Status);
        if (!success)
            return BadRequest(new { success = false, message = "Failed to update status" });
        
        return Ok(new { success = true, message = "Status updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var deleted = await _driverService.DeleteAsync(id);
            if (!deleted)
                return NotFound(new { success = false, message = "Driver not found" });
            
            return Ok(new { success = true, message = "Driver removed successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}

public class AssignTruckRequest
{
    public Guid TruckId { get; set; }
}

public class UpdateDriverStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
