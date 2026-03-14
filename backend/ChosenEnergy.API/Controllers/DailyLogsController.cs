using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Services;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/daily-logs")]
[Authorize]
public class DailyLogsController : ControllerBase
{
    private readonly IDailyLogService _dailyLogService;

    public DailyLogsController(IDailyLogService dailyLogService)
    {
        _dailyLogService = dailyLogService;
    }

    [HttpGet("{date}")]
    public async Task<IActionResult> GetByDate(DateTime date)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        
        if (role == "Driver")
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
            
            var userId = Guid.Parse(userIdStr);
            var log = await _dailyLogService.GetDriverDailyLogAsync(userId, date);
            
            if (log == null)
                return NotFound(new { success = false, message = "No active truck assignment found for your account." });
                
            return Ok(new { success = true, data = log });
        }
        else
        {
            var logs = await _dailyLogService.GetAdminDailyLogsAsync(date);
            return Ok(new { success = true, data = logs });
        }
    }

    [HttpGet("truck/{truckId}/{date}")]
    [Authorize(Roles = "Admin")] // Assuming only Admins can request detailed logs for any truck
    public async Task<IActionResult> GetDetailedTruckLog(Guid truckId, DateTime date)
    {
        var log = await _dailyLogService.GetDetailedLogByTruckAsync(truckId, date);
        if (log == null)
        {
            return NotFound(new { success = false, message = "No detailed log found for the specified truck and date." });
        }
        return Ok(new { success = true, data = log });
    }

    [HttpGet]
    public async Task<IActionResult> GetCurrent()
    {
        return await GetByDate(DateTime.UtcNow);
    }
}
