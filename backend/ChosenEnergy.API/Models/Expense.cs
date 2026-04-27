using System;

namespace ChosenEnergy.API.Models;

public class ExpenseCategory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ManualExpense
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? ReceiptUrl { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation-like property for Dapper
    public string? CategoryName { get; set; }
    public string? CreatedByName { get; set; }
}
