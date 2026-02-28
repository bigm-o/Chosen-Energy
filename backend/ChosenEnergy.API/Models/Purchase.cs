namespace ChosenEnergy.API.Models;

public class Purchase
{
    public Guid Id { get; set; }
    public string? PurchaseId { get; set; }
    public Guid? DepotId { get; set; }
    public decimal Quantity { get; set; }
    public decimal CostPerLitre { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? ReceiptUrl { get; set; }
    public string Status { get; set; } = "Pending";
    public Guid? CreatedBy { get; set; }
    public Guid? ApprovedBy { get; set; }
    public Guid? EditedBy { get; set; }
    public string? RejectionReason { get; set; }
    public string? EditReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Edit tracking - stores original approved values
    public string? OriginalValues { get; set; } // JSON string
    public bool HasPendingEdit { get; set; }
    
    // Navigation properties
    public string? DepotName { get; set; }
    public string? CreatedByName { get; set; }
    public string? ApprovedByName { get; set; }
    public string? EditedByName { get; set; }
}
