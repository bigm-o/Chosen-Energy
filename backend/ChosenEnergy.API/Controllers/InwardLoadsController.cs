using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/inwardloads")]
[Authorize]
public class InwardLoadsController : ControllerBase
{
    private readonly IInwardLoadService _loadService;

    public InwardLoadsController(IInwardLoadService loadService)
    {
        _loadService = loadService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var logs = await _loadService.GetAllAsync();
        return Ok(new { success = true, data = logs });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InwardLoad load)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var created = await _loadService.CreateAsync(load, Guid.Parse(userIdStr));
        return Ok(new { success = true, data = created, message = "Inward load created successfully" });
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulk([FromBody] BulkInwardLoadRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

        var created = await _loadService.CreateBulkAsync(request, Guid.Parse(userIdStr));
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
