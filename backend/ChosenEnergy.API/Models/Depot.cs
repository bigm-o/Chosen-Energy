using System;

namespace ChosenEnergy.API.Models;

public class Depot
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? ContactInfo { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateTime CreatedAt { get; set; }
}
