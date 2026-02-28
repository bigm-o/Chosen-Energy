using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var role = User.FindFirst(ClaimTypes.Role)?.Value!;
        
        var notifications = await _notificationService.GetForUserAsync(userId, role);
        return Ok(new { success = true, data = notifications });
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        await _notificationService.MarkAsReadAsync(id);
        return Ok(new { success = true, message = "Marked as read" });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        await _notificationService.MarkAllAsReadAsync(userId);
        return Ok(new { success = true, message = "All marked as read" });
    }
}
