using System;

namespace ChosenEnergy.API.Models;

public class Notification
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? Role { get; set; } // "Admin", "MD", etc.
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "Info"; // Info, Warning, Success
    public bool IsRead { get; set; }
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // UI Helper
    public string TimeAgo => GetTimeAgo(CreatedAt);

    private string GetTimeAgo(DateTime date)
    {
        var span = DateTime.Now - date;
        if (span.TotalMinutes < 1) return "Just now";
        if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes}m ago";
        if (span.TotalHours < 24) return $"{(int)span.TotalHours}h ago";
        return date.ToString("MMM dd");
    }
}
