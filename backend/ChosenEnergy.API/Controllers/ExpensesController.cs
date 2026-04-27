using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Models.DTOs;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,MD,GarageManager")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;
    private readonly IFileService _fileService;

    public ExpensesController(IExpenseService expenseService, IFileService fileService)
    {
        _expenseService = expenseService;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<UnifiedExpenseDTO>>>> GetAll()
    {
        try 
        {
            var expenses = await _expenseService.GetAllExpensesAsync();
            return Ok(ApiResponse<IEnumerable<UnifiedExpenseDTO>>.SuccessResponse(expenses));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<IEnumerable<UnifiedExpenseDTO>>.ErrorResponse($"Backend Failure: {ex.Message}"));
        }
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<ExpenseSummaryDTO>>> GetSummary()
    {
        try
        {
            var summary = await _expenseService.GetSummaryAsync();
            return Ok(ApiResponse<ExpenseSummaryDTO>.SuccessResponse(summary));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ExpenseSummaryDTO>.ErrorResponse($"Summary Failure: {ex.Message}"));
        }
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ExpenseCategory>>>> GetCategories()
    {
        var categories = await _expenseService.GetCategoriesAsync();
        return Ok(ApiResponse<IEnumerable<ExpenseCategory>>.SuccessResponse(categories));
    }

    [HttpPost("categories")]
    public async Task<ActionResult<ApiResponse<ExpenseCategory>>> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = await _expenseService.CreateCategoryAsync(request.Name);
        return Ok(ApiResponse<ExpenseCategory>.SuccessResponse(category, "Category created successfully"));
    }

    [HttpDelete("categories/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteCategory(Guid id)
    {
        var success = await _expenseService.DeleteCategoryAsync(id);
        if (!success) return BadRequest(ApiResponse<string>.ErrorResponse("Cannot delete system category or category with active expenses"));
        return Ok(ApiResponse<string>.SuccessResponse("Category deleted"));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ManualExpense>>> Create([FromBody] CreateExpenseRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        
        var expense = new ManualExpense
        {
            CategoryId = request.CategoryId,
            Amount = request.Amount,
            Description = request.Description,
            ExpenseDate = request.ExpenseDate,
            ReceiptUrl = request.ReceiptUrl,
            CreatedBy = userId
        };

        var created = await _expenseService.CreateExpenseAsync(expense);
        return Ok(ApiResponse<ManualExpense>.SuccessResponse(created, "Expense logged successfully"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ManualExpense>>> Update(Guid id, [FromBody] CreateExpenseRequest request)
    {
        var expense = new ManualExpense
        {
            CategoryId = request.CategoryId,
            Amount = request.Amount,
            Description = request.Description,
            ExpenseDate = request.ExpenseDate,
            ReceiptUrl = request.ReceiptUrl
        };

        var updated = await _expenseService.UpdateExpenseAsync(id, expense);
        if (updated == null) return NotFound(ApiResponse<ManualExpense>.ErrorResponse("Expense not found"));
        return Ok(ApiResponse<ManualExpense>.SuccessResponse(updated, "Expense updated successfully"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> Delete(Guid id)
    {
        var success = await _expenseService.DeleteExpenseAsync(id);
        if (!success) return NotFound(ApiResponse<string>.ErrorResponse("Expense not found"));
        return Ok(ApiResponse<string>.SuccessResponse("Expense deleted successfully"));
    }

    [HttpPost("{id}/receipt")]
    public async Task<ActionResult<ApiResponse<string>>> UploadReceipt(Guid id, IFormFile file)
    {
        try 
        {
             var path = await _fileService.SaveFileAsync(file, "expense_receipts");
             await _expenseService.UpdateReceiptUrlAsync(id, path);
             return Ok(ApiResponse<string>.SuccessResponse(path, "Receipt uploaded successfully"));
        }
        catch (ArgumentException ex)
        {
             return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
        }
    }
}
