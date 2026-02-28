using System;

namespace ChosenEnergy.API.Models;

public class Customer
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    

    
    // Aggregated data for frontend
    public decimal TotalLitresBought { get; set; }
}
