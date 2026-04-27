namespace ChosenEnergy.API.Models;

public class CustomerFuelPrice
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public decimal PricePerLitre { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation/Display property
    public string? CompanyName { get; set; }
}
