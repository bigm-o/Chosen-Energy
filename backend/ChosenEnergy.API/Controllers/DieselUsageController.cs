using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DieselUsageController : ControllerBase
{
    private readonly IDieselUsageService _dieselUsageService;

    public DieselUsageController(IDieselUsageService dieselUsageService)
    {
        _dieselUsageService = dieselUsageService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (role == "Driver") 
        {
            return Forbid();
        }

        var usages = await _dieselUsageService.GetAllAsync();
        return Ok(new { success = true, data = usages });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DieselUsage usage)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        try
        {
            var created = await _dieselUsageService.CreateAsync(usage, Guid.Parse(userIdStr));
            return Ok(new { success = true, data = created, message = "Diesel usage recorded successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _dieselUsageService.DeleteAsync(id);
        if (success)
            return Ok(new { success = true, message = "Record deleted successfully" });
        return BadRequest(new { success = false, message = "Failed to delete record" });
    }
}
