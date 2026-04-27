using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Models.DTOs;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,MD")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Invoice>>>> GetAll()
    {
        var invoices = await _invoiceService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<Invoice>>.SuccessResponse(invoices));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<InvoiceSummaryDTO>>> GetSummary()
    {
        var summary = await _invoiceService.GetSummaryAsync();
        return Ok(ApiResponse<InvoiceSummaryDTO>.SuccessResponse(summary));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Invoice>>> GetById(Guid id)
    {
        var invoice = await _invoiceService.GetByIdAsync(id);
        if (invoice == null) return NotFound(ApiResponse<Invoice>.ErrorResponse("Invoice not found"));
        return Ok(ApiResponse<Invoice>.SuccessResponse(invoice));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Invoice>>> Create([FromBody] CreateInvoiceRequest request)
    {
        try
        {
            var invoice = await _invoiceService.CreateFromSupplyAsync(request.SupplyId, request.DueDate);
            return Ok(ApiResponse<Invoice>.SuccessResponse(invoice, "Invoice generated successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<Invoice>.ErrorResponse(ex.Message));
        }
    }

    [HttpPatch("{id}/pay")]
    public async Task<ActionResult<ApiResponse<string>>> MarkAsPaid(Guid id, [FromBody] MarkAsPaidRequest request)
    {
        var success = await _invoiceService.MarkAsPaidAsync(id, request.Amount);
        if (!success) return NotFound(ApiResponse<string>.ErrorResponse("Invoice not found or update failed"));
        return Ok(ApiResponse<string>.SuccessResponse("Payment recorded successfully"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> Delete(Guid id)
    {
        var success = await _invoiceService.DeleteAsync(id);
        if (!success) return NotFound(ApiResponse<string>.ErrorResponse("Invoice not found"));
        return Ok(ApiResponse<string>.SuccessResponse("Invoice deleted"));
    }
}
