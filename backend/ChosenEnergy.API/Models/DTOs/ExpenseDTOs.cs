using System;

namespace ChosenEnergy.API.Models.DTOs;

public class ExpenseSummaryDTO
{
    public decimal FuelCost { get; set; }
    public decimal MaintenanceCost { get; set; }
    public decimal OverheadCost { get; set; }
    public decimal OtherCost { get; set; }
    public decimal TotalCost => FuelCost + MaintenanceCost + OverheadCost + OtherCost;
}

public class UnifiedExpenseDTO
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public string Source { get; set; } = "Manual"; // "Manual", "Fuel", "Maintenance"
    public string Status { get; set; } = "Settled";
    public string? ReceiptUrl { get; set; }
}

public class CreateExpenseRequest
{
    public Guid CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? ReceiptUrl { get; set; }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
}
