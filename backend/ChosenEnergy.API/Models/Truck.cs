namespace ChosenEnergy.API.Models;

public class Truck
{
    public Guid Id { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public decimal Capacity { get; set; } // Renamed to mapped in controller as CapacityLitres if needed or use straight mapping
    public string Status { get; set; } = "Active";
    public string TruckType { get; set; } = "Large"; // Small or Large
    public Guid? AssignedDriverId { get; set; }
    public string? DriverName { get; set; }
    public DateTime? LastMaintenanceDate { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }
    public int MaintenanceIntervalDays { get; set; } = 90;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
