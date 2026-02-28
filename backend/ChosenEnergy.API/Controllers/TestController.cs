using Microsoft.AspNetCore.Mvc;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly IAuthService _authService;

    public TestController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet("check-user/{email}")]
    public async Task<IActionResult> CheckUser(string email)
    {
        var user = await _authService.GetUserByEmailAsync(email);
        if (user == null)
            return NotFound(new { message = "User not found" });
        
        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            role = user.Role.ToString(),
            isActive = user.IsActive,
            hasPassword = !string.IsNullOrEmpty(user.PasswordHash)
        });
    }
}
