using System;

namespace ChosenEnergy.API.Models;

public class Invoice
{
    public Guid Id { get; set; }
    public Guid SupplyId { get; set; }
    public Guid CustomerId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal AmountDue { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = "Unpaid"; // Unpaid, PartiallyPaid, Paid, Overdue
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation props
    public string? CustomerName { get; set; }
    public string? SupplySaleId { get; set; }
}
