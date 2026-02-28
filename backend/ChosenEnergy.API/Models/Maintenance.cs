namespace ChosenEnergy.API.Models;

public enum MaintenanceType
{
    Preventive,
    Breakdown,
    Repair,
    Inspection
}

public enum MaintenanceStatus
{
    Pending,
    InProgress,
    Completed
}

public class MaintenanceLog
{
    public Guid Id { get; set; }
    public Guid TruckId { get; set; }
    public MaintenanceType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public MaintenanceStatus Status { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation props (for Dapper mapping)
    public string? TruckRegNumber { get; set; }
    public string? CreatedByName { get; set; }
}
