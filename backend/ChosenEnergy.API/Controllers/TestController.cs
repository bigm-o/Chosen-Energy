using Microsoft.AspNetCore.Mvc;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IDriverService _driverService;
    private readonly IUserService _userService;

    public TestController(IAuthService authService, IDriverService driverService, IUserService userService)
    {
        _authService = authService;
        _driverService = driverService;
        _userService = userService;
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

    [HttpGet("all-drivers-access")]
    public async Task<IActionResult> GetAllDriversAccess()
    {
        var drivers = await _driverService.GetAllAsync();
        var driversWithAccess = new List<object>();

        foreach(var d in drivers)
        {
            if (d.UserId.HasValue)
            {
                var u = await _userService.GetByIdAsync(d.UserId.Value);
                if (u != null)
                {
                    driversWithAccess.Add(new {
                        FullName = d.FullName,
                        Email = u.Email,
                        Username = u.Username,
                        DefaultPassword = d.Phone,
                        IsAppActive = u.IsActive
                    });
                }
            }
        }
        return Ok(driversWithAccess);
    }
}
