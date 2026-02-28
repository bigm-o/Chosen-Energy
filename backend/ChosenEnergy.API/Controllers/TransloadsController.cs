using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/transloads")]
[Authorize]
public class TransloadsController : ControllerBase
{
    private readonly ITransloadService _transloadService;
    private readonly IDriverService _driverService;

    public TransloadsController(ITransloadService transloadService, IDriverService driverService)
    {
        _transloadService = transloadService;
        _driverService = driverService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var transloads = await _transloadService.GetAllAsync();
        return Ok(new { success = true, data = transloads });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Transload transload)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        try
        {
            var created = await _transloadService.CreateAsync(transload, Guid.Parse(userIdStr));
            return Ok(new { success = true, data = created, message = "Transload request sent to receiver" });
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

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> Confirm(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        try
        {
            var result = await _transloadService.ConfirmAsync(id, Guid.Parse(userIdStr));
            return Ok(new { success = true, data = result, message = "Transload confirmed by receiver" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin" && role != "MD") return StatusCode(403, new { success = false, message = "Only Admin or MD can approve transloads" });

        try
        {
            var result = await _transloadService.ApproveAsync(id, Guid.Parse(userIdStr));
            return Ok(new { success = true, data = result, message = "Transload approved and inventory updated" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var result = await _transloadService.RejectAsync(id, Guid.Parse(userIdStr), request.Reason);
        return Ok(new { success = true, data = result, message = "Transload rejected" });
    }

    [HttpGet("pending-confirmations")]
    public async Task<IActionResult> GetPendingConfirmations()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var driver = await _driverService.GetByUserIdAsync(Guid.Parse(userIdStr));
        if (driver == null) return NotFound(new { success = false, message = "Driver profile not found" });

        var results = await _transloadService.GetPendingConfirmationsAsync(driver.Id);
        return Ok(new { success = true, data = results });
    }
}

public class RejectRequest { public string Reason { get; set; } = string.Empty; }
