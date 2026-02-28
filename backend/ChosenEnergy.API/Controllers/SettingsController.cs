using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _settingsService.GetAllAsync();
        return Ok(new { success = true, data = settings });
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key)
    {
        var value = await _settingsService.GetValueAsync(key);
        return Ok(new { success = true, data = value });
    }

    [HttpPost("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var result = await _settingsService.UpdateValueAsync(key, request.Value, Guid.Parse(userIdStr));
        return Ok(new { success = result, message = result ? "Update pending approval" : "Update failed" });
    }

    [HttpPost("{key}/approve")]
    public async Task<IActionResult> Approve(string key)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "MD") return StatusCode(403, new { success = false, message = "Only MD can approve settings changes" });

        var result = await _settingsService.ApproveUpdateAsync(key, Guid.Parse(userIdStr));
        return Ok(new { success = result, message = result ? "Setting approved" : "Approval failed" });
    }
}

public class UpdateSettingRequest { public string Value { get; set; } = string.Empty; }
