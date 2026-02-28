using System;

namespace ChosenEnergy.API.Models;

public class SystemSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    public string? PendingValue { get; set; }
    public Guid? PendingUpdatedBy { get; set; }
    public string Status { get; set; } = "Approved";
}
