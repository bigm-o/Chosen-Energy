using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly IFileService _fileService;

    public UploadsController(IFileService fileService)
    {
        _fileService = fileService;
    }

    [HttpPost]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string type = "general")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "No file uploaded" });
        }

        try
        {
            // The file service handles physical pathing and returns a relative URL like /uploads/type/filename
            var url = await _fileService.SaveFileAsync(file, type);
            return Ok(new { success = true, url });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
