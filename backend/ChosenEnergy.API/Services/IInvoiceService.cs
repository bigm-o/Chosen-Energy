using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Models.DTOs;

namespace ChosenEnergy.API.Services;

public interface IInvoiceService
{
    Task<IEnumerable<Invoice>> GetAllAsync();
    Task<Invoice?> GetByIdAsync(Guid id);
    Task<InvoiceSummaryDTO> GetSummaryAsync();
    Task<Invoice> CreateFromSupplyAsync(Guid supplyId, DateTime dueDate);
    Task<bool> MarkAsPaidAsync(Guid id, decimal amount);
    Task<bool> DeleteAsync(Guid id);
}
