using System;

namespace ChosenEnergy.API.Models;

public class Transload
{
    public Guid Id { get; set; }
    public Guid SourceTruckId { get; set; }
    public string? SourceTruckReg { get; set; }
    public Guid DestinationTruckId { get; set; }
    public string? DestinationTruckReg { get; set; }
    public decimal Quantity { get; set; }
    public DateTime TransferDate { get; set; }
    public string Status { get; set; } = "Pending"; // approval_status: Pending, Approved, Rejected
    public Guid? ReceivingDriverId { get; set; }
    public string? ReceivingDriverName { get; set; }
    public string? SourceDriverName { get; set; }
    public bool IsConfirmedByReceiver { get; set; }
    public DateTime? ReceiverConfirmedAt { get; set; }
    public string? TransloadType { get; set; } // S-S, L-S, L-L
    public string? SlipUrl { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
