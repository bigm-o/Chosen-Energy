using Microsoft.AspNetCore.Http;

namespace ChosenEnergy.API.DTOs;

public class CreateSupplyRequest
{
    public Guid CustomerId { get; set; }
    public Guid DriverId { get; set; }
    public Guid? DepotId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }
    public DateTime SupplyDate { get; set; }
    public IFormFile? Invoice { get; set; }
}

public class SupplyResponse
{
    public Guid Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SupplyDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
}
