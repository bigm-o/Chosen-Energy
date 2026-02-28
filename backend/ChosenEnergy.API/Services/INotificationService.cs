using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Services;

public interface INotificationService
{
    Task NotifyUserAsync(Guid userId, string title, string message, string type = "Info", string? link = null);
    Task NotifyRoleAsync(string role, string title, string message, string type = "Info", string? link = null);
    Task<IEnumerable<Notification>> GetForUserAsync(Guid userId, string userRole);
    Task MarkAsReadAsync(Guid id);
    Task MarkAllAsReadAsync(Guid userId);
}
