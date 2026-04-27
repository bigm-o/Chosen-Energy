using System;

namespace ChosenEnergy.API.Models;

public class DieselUsage
{
    public Guid Id { get; set; }
    public Guid TruckId { get; set; }
    public string? TruckRegNumber { get; set; } // Joined field
    public Guid DriverId { get; set; }
    public string? DriverName { get; set; } // Joined field
    public decimal QuantityLitres { get; set; }
    public DateTime UsageDate { get; set; }
    public string? Route { get; set; }
    public int? Mileage { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; } // Joined field
    public DateTime CreatedAt { get; set; }
}
