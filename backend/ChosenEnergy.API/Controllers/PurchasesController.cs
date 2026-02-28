using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text;
using ChosenEnergy.API.DTOs;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchasesController : ControllerBase
{
    private readonly IPurchaseService _purchaseService;
    private readonly IFileService _fileService;

    public PurchasesController(IPurchaseService purchaseService, IFileService fileService)
    {
        _purchaseService = purchaseService;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseResponse>>>> GetAll([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        IEnumerable<Purchase> purchases;
        
        if (startDate.HasValue && endDate.HasValue)
        {
            purchases = await _purchaseService.GetByDateRangeAsync(startDate.Value, endDate.Value);
        }
        else
        {
            purchases = await _purchaseService.GetAllAsync();
        }

        var response = purchases.Select(p => new PurchaseResponse
        {
            Id = p.Id,
            DepotId = p.DepotId,
            DepotName = p.DepotName,
            Quantity = p.Quantity,
            CostPerLitre = p.CostPerLitre,
            TotalCost = p.TotalCost,
            PurchaseDate = p.PurchaseDate,
            ReceiptUrl = p.ReceiptUrl,
            Status = p.Status,
            CreatedByName = p.CreatedByName,
            ApprovedByName = p.ApprovedByName,
            EditedByName = p.EditedByName,
            HasPendingEdit = p.HasPendingEdit,
            RejectionReason = p.RejectionReason,
            EditReason = p.EditReason,
            CreatedAt = p.CreatedAt,
            PurchaseId = p.PurchaseId
        });

        return Ok(ApiResponse<IEnumerable<PurchaseResponse>>.SuccessResponse(response));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        IEnumerable<Purchase> purchases;
        
        if (startDate.HasValue && endDate.HasValue)
        {
            purchases = await _purchaseService.GetByDateRangeAsync(startDate.Value, endDate.Value);
        }
        else
        {
            purchases = await _purchaseService.GetAllAsync();
        }

        var csv = new StringBuilder();
        csv.AppendLine("Purchase Date,Depot,Quantity (L),Cost per Litre,Total Cost,Status,Created By,Approved By,Created At");

        foreach (var p in purchases)
        {
            csv.AppendLine($"{p.PurchaseDate:yyyy-MM-dd},{p.DepotName},{p.Quantity},{p.CostPerLitre},{p.TotalCost},{p.Status},{p.CreatedByName},{p.ApprovedByName},{p.CreatedAt:yyyy-MM-dd HH:mm}");
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"purchases_{DateTime.Now:yyyyMMdd}.csv");
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> GetById(Guid id)
    {
        var purchase = await _purchaseService.GetByIdAsync(id);
        if (purchase == null)
            return NotFound(ApiResponse<PurchaseResponse>.ErrorResponse("Purchase not found"));

        var response = new PurchaseResponse
        {
            Id = purchase.Id,
            DepotId = purchase.DepotId,
            DepotName = purchase.DepotName,
            Quantity = purchase.Quantity,
            CostPerLitre = purchase.CostPerLitre,
            TotalCost = purchase.TotalCost,
            PurchaseDate = purchase.PurchaseDate,
            ReceiptUrl = purchase.ReceiptUrl,
            Status = purchase.Status,
            CreatedByName = purchase.CreatedByName,
            ApprovedByName = purchase.ApprovedByName,
            EditedByName = purchase.EditedByName,
            HasPendingEdit = purchase.HasPendingEdit,
            OriginalValues = purchase.OriginalValues,
            RejectionReason = purchase.RejectionReason,
            EditReason = purchase.EditReason,
            CreatedAt = purchase.CreatedAt,
            PurchaseId = purchase.PurchaseId
        };

        return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> Create([FromBody] CreatePurchaseRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value!;
        
        var purchase = new Purchase
        {
            DepotId = request.DepotId,
            Quantity = request.Quantity,
            CostPerLitre = request.CostPerLitre,
            TotalCost = request.Quantity * request.CostPerLitre,
            PurchaseDate = request.PurchaseDate,
            ReceiptUrl = request.ReceiptUrl
        };

        var created = await _purchaseService.CreateAsync(purchase, userId, userRole);
        var response = new PurchaseResponse
        {
            Id = created.Id,
            Quantity = created.Quantity,
            CostPerLitre = created.CostPerLitre,
            TotalCost = created.TotalCost,
            PurchaseDate = created.PurchaseDate,
            Status = created.Status,
            CreatedAt = created.CreatedAt,
            PurchaseId = created.PurchaseId
        };

        return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response, "Purchase created successfully"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> Update(Guid id, [FromBody] UpdatePurchaseRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value!;

        var purchase = new Purchase
        {
            DepotId = request.DepotId,
            Quantity = request.Quantity,
            CostPerLitre = request.CostPerLitre,
            TotalCost = request.Quantity * request.CostPerLitre,
            PurchaseDate = request.PurchaseDate
        };

        var updated = await _purchaseService.UpdateAsync(id, purchase, userId, userRole, request.EditReason);
        var response = new PurchaseResponse
        {
            Id = updated.Id,
            Quantity = updated.Quantity,
            CostPerLitre = updated.CostPerLitre,
            TotalCost = updated.TotalCost,
            PurchaseDate = updated.PurchaseDate,
            Status = updated.Status,
            HasPendingEdit = updated.HasPendingEdit
        };

        return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response, "Purchase updated successfully"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id)
    {
        var result = await _purchaseService.DeleteAsync(id);
        if (!result)
            return NotFound(ApiResponse<bool>.ErrorResponse("Purchase not found"));

        return Ok(ApiResponse<bool>.SuccessResponse(true, "Purchase deleted successfully"));
    }

    [HttpGet("pending")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseResponse>>>> GetPending()
    {
        var purchases = await _purchaseService.GetPendingAsync();
        var response = purchases.Select(p => new PurchaseResponse
        {
            Id = p.Id,
            DepotName = p.DepotName,
            Quantity = p.Quantity,
            CostPerLitre = p.CostPerLitre,
            TotalCost = p.TotalCost,
            PurchaseDate = p.PurchaseDate,
            Status = p.Status,
            HasPendingEdit = p.HasPendingEdit,
            CreatedByName = p.CreatedByName,
            CreatedAt = p.CreatedAt,
            PurchaseId = p.PurchaseId
        });

        return Ok(ApiResponse<IEnumerable<PurchaseResponse>>.SuccessResponse(response));
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> Approve(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value!;
        var purchase = await _purchaseService.ApproveAsync(id, userId, userRole);
        
        var response = new PurchaseResponse
        {
            Id = purchase.Id,
            Status = purchase.Status
        };

        return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response, "Purchase approved successfully"));
    }

    [HttpPost("{id}/approve-edit")]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> ApproveEdit(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value!;
        
        try
        {
            var purchase = await _purchaseService.ApproveEditAsync(id, userId, userRole);
            
            var response = new PurchaseResponse
            {
                Id = purchase.Id,
                Status = purchase.Status,
                HasPendingEdit = false
            };

            return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response, "Edit approved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<PurchaseResponse>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id}/reject-edit")]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> RejectEdit(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        
        try
        {
            var purchase = await _purchaseService.RejectEditAsync(id, userId);
            
            var response = new PurchaseResponse
            {
                Id = purchase.Id,
                Status = purchase.Status,
                HasPendingEdit = false
            };

            return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response, "Edit rejected, original values restored"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<PurchaseResponse>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult<ApiResponse<PurchaseResponse>>> Reject(Guid id, [FromBody] ApprovePurchaseRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var purchase = await _purchaseService.RejectAsync(id, userId, request.Reason ?? "");
        
        var response = new PurchaseResponse
        {
            Id = purchase.Id,
            Status = purchase.Status,
            RejectionReason = purchase.RejectionReason
        };

        return Ok(ApiResponse<PurchaseResponse>.SuccessResponse(response, "Purchase rejected"));
    }

    [HttpPost("{id}/receipt")]
    public async Task<ActionResult<ApiResponse<string>>> UploadReceipt(Guid id, IFormFile file)
    {
        try 
        {
             var path = await _fileService.SaveFileAsync(file, "receipts");
             await _purchaseService.UpdateReceiptUrlAsync(id, path);
             return Ok(ApiResponse<string>.SuccessResponse(path, "Receipt uploaded successfully"));
        }
        catch (ArgumentException ex)
        {
             return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
        }
    }
}
