using System;

namespace ChosenEnergy.API.Models;

public class InwardLoad
{
    public Guid Id { get; set; }
    public Guid TruckId { get; set; }
    public string? TruckRegNumber { get; set; }
    public Guid DriverId { get; set; }
    public string? DriverName { get; set; }
    public Guid? DepotId { get; set; }
    public string? DepotName { get; set; }
    public decimal Quantity { get; set; }
    public DateTime LoadDate { get; set; }
    public string Status { get; set; } = "Pending";
    public Guid? ApprovedBy { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Remarks { get; set; }
    public Guid? BatchId { get; set; }
}

public class BulkInwardLoadRequest
{
    public List<BulkInwardLoadItem> Items { get; set; } = new();
    public decimal Quantity { get; set; }
    public Guid? DepotId { get; set; }
    public string? Remarks { get; set; }
}

public class BulkInwardLoadItem
{
    public Guid TruckId { get; set; }
    public Guid DriverId { get; set; }
}
