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
    private readonly IUserService _userService;

    public DriversController(IDriverService driverService, IUserService userService)
    {
        _driverService = driverService;
        _userService = userService;
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

    [HttpPut("{id}/reset-password")]
    [Authorize(Roles = "Admin,MD")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
    {
        try
        {
            var driver = await _driverService.GetByIdAsync(id);
            if (driver == null || driver.UserId == null)
                return NotFound(new { success = false, message = "Driver user account not found" });

            var updated = await _userService.ResetPasswordAsync(driver.UserId.Value, request.NewPassword, request.RequiresPasswordChange);
            if (!updated)
                return BadRequest(new { success = false, message = "Failed to reset password" });

            return Ok(new { success = true, message = "Password reset successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/toggle-account")]
    [Authorize(Roles = "Admin,MD")]
    public async Task<IActionResult> ToggleAccount(Guid id, [FromBody] ToggleAccountRequest request)
    {
        try
        {
            var driver = await _driverService.GetByIdAsync(id);
            if (driver == null || driver.UserId == null)
                return NotFound(new { success = false, message = "Driver user account not found" });

            var userToUpdate = await _userService.GetByIdAsync(driver.UserId.Value);
            if (userToUpdate == null)
                return NotFound(new { success = false, message = "User account not found" });

            userToUpdate.IsActive = request.IsActive;
            await _userService.UpdateAsync(driver.UserId.Value, userToUpdate);

            return Ok(new { success = true, message = request.IsActive ? "Account activated" : "Account deactivated" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/create-account")]
    [Authorize(Roles = "Admin,MD")]
    public async Task<IActionResult> CreateAccount(Guid id)
    {
        try
        {
            var success = await _driverService.CreateUserAccountAsync(id);
            if (!success)
                return BadRequest(new { success = false, message = "Failed to create account or account already exists." });

            return Ok(new { success = true, message = "User account created successfully" });
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

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
    public bool RequiresPasswordChange { get; set; } = true;
}

public class ToggleAccountRequest
{
    public bool IsActive { get; set; }
}
