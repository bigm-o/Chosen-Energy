using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Models.DTOs;

namespace ChosenEnergy.API.Services;

public interface IExpenseService
{
    Task<IEnumerable<UnifiedExpenseDTO>> GetAllExpensesAsync();
    Task<ExpenseSummaryDTO> GetSummaryAsync();
    Task<IEnumerable<ExpenseCategory>> GetCategoriesAsync();
    Task<ExpenseCategory> CreateCategoryAsync(string name);
    Task<ManualExpense> CreateExpenseAsync(ManualExpense expense);
    Task<ManualExpense?> UpdateExpenseAsync(Guid id, ManualExpense expense);
    Task<bool> DeleteExpenseAsync(Guid id);
    Task<bool> UpdateReceiptUrlAsync(Guid id, string receiptUrl);
    Task<bool> DeleteCategoryAsync(Guid id);
}
