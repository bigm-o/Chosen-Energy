namespace ChosenEnergy.API.Models.DTOs;

public class CreateSupplyRequest
{
    public int CustomerId { get; set; }
    public int TruckId { get; set; }
    public int DriverId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }
    public DateTime SupplyDate { get; set; }
    public string? InvoiceUrl { get; set; }
}

public class UpdateSupplyRequest
{
    public int CustomerId { get; set; }
    public int TruckId { get; set; }
    public int DriverId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }
    public DateTime SupplyDate { get; set; }
    public string? InvoiceUrl { get; set; }
}

public class ApproveSupplyRequest
{
    public string? Notes { get; set; }
}

public class RejectSupplyRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SupplyResponse
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int TruckId { get; set; }
    public string TruckRegistration { get; set; } = string.Empty;
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime SupplyDate { get; set; }
    public string? InvoiceUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? AdminApprovedBy { get; set; }
    public string? AdminApproverName { get; set; }
    public DateTime? AdminApprovedAt { get; set; }
    public int? MdApprovedBy { get; set; }
    public string? MdApproverName { get; set; }
    public DateTime? MdApprovedAt { get; set; }
    public int CreatedBy { get; set; }
    public string CreatorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? RejectionReason { get; set; }
}
