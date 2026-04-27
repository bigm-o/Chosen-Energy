using System;

namespace ChosenEnergy.API.Models.DTOs;

public class InvoiceSummaryDTO
{
    public decimal TotalOutstanding { get; set; }
    public decimal PaidThisMonth { get; set; }
    public int PendingInvoicesCount { get; set; }
    public int OverdueInvoicesCount { get; set; }
}

public class InvoiceResponseDTO
{
    public Guid Id { get; set; }
    public Guid SupplyId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal AmountDue { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Balance => AmountDue - AmountPaid;
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = "Unpaid";
    public DateTime CreatedAt { get; set; }
}

public class CreateInvoiceRequest
{
    public Guid SupplyId { get; set; }
    public DateTime DueDate { get; set; }
}

public class MarkAsPaidRequest
{
    public decimal Amount { get; set; }
}
