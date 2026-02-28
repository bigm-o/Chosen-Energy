namespace ChosenEnergy.API.DTOs;

public class CreatePurchaseRequest
{
    public Guid? DepotId { get; set; }
    public decimal Quantity { get; set; }
    public decimal CostPerLitre { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? ReceiptUrl { get; set; }
}

public class UpdatePurchaseRequest
{
    public Guid? DepotId { get; set; }
    public decimal Quantity { get; set; }
    public decimal CostPerLitre { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? EditReason { get; set; }
}

public class ApprovePurchaseRequest
{
    public bool Approved { get; set; }
    public string? Reason { get; set; }
}

public class PurchaseResponse
{
    public Guid Id { get; set; }
    public string? PurchaseId { get; set; }
    public Guid? DepotId { get; set; }
    public string? DepotName { get; set; }
    public decimal Quantity { get; set; }
    public decimal CostPerLitre { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? ReceiptUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? CreatedByName { get; set; }
    public string? ApprovedByName { get; set; }
    public string? EditedByName { get; set; }
    public bool HasPendingEdit { get; set; }
    public string? OriginalValues { get; set; }
    public string? RejectionReason { get; set; }
    public string? EditReason { get; set; }
    public DateTime CreatedAt { get; set; }
}
