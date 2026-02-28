namespace ChosenEnergy.API.Models;

public class Supply
{
    public Guid Id { get; set; }
    public string? SaleId { get; set; }
    public Guid? DepotId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid TruckId { get; set; }
    public Guid DriverId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }

    public decimal TotalAmount { get; set; }
    public DateTime SupplyDate { get; set; }
    public string? InvoiceUrl { get; set; }
    public string Status { get; set; } = "Pending";
    public string? RejectionReason { get; set; }
    
    // Edit tracking
    public bool HasPendingEdit { get; set; }
    public string? OriginalValues { get; set; }
    public string? EditReason { get; set; }
    public Guid? EditedBy { get; set; }
    
    // Approval metadata
    public Guid? AdminApprovedBy { get; set; }
    public DateTime? AdminApprovedAt { get; set; }
    public Guid? MdApprovedBy { get; set; }
    public DateTime? MdApprovedAt { get; set; }
    
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties for Dapper mapping
    public string? CustomerName { get; set; }
    public string? DepotName { get; set; }
    public string? TruckRegNumber { get; set; }
    public string? DriverName { get; set; }
    public string? CreatedByName { get; set; }
    public string? EditedByName { get; set; }
    public string? AdminApprovedByName { get; set; }
    public string? MdApprovedByName { get; set; }
}
