using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ChosenEnergy.API.DTOs;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;
using System.Security.Claims;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IJwtService _jwtService;

    public AuthController(IAuthService authService, IJwtService jwtService)
    {
        _authService = authService;
        _jwtService = jwtService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        Console.WriteLine($"[AUTH] Login attempt for: {request.Email}");
        
        var user = await _authService.AuthenticateAsync(request.Email, request.Password);
        
        if (user == null)
        {
            Console.WriteLine($"[AUTH] Authentication failed for: {request.Email}");
            return Unauthorized(ApiResponse<LoginResponse>.ErrorResponse("Invalid email or password"));
        }

        if (!user.IsActive)
        {
            Console.WriteLine($"[AUTH] Account deactivated for: {request.Email}");
            return Unauthorized(ApiResponse<LoginResponse>.ErrorResponse("Your account has been deactivated"));
        }

        Console.WriteLine($"[AUTH] Authentication successful for: {user.Email} (Role: {user.Role})");
        
        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        
        var response = new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            ThemePreference = user.ThemePreference
        };

        return Ok(ApiResponse<LoginResponse>.SuccessResponse(response, "Login successful"));
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _authService.GetUserByEmailAsync(request.Email);
        if (existingUser != null)
            return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Email already exists"));

        if (!Enum.TryParse<UserRole>(request.Role, out var role))
            return BadRequest(ApiResponse<LoginResponse>.ErrorResponse("Invalid role"));

        var user = await _authService.CreateUserAsync(request.Email, request.Email, request.Password, request.FullName, role);
        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        
        var response = new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            ThemePreference = user.ThemePreference
        };

        return Ok(ApiResponse<LoginResponse>.SuccessResponse(response, "Registration successful"));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<RefreshTokenResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var principal = _jwtService.GetPrincipalFromExpiredToken(request.Token);
        if (principal == null)
            return BadRequest(ApiResponse<RefreshTokenResponse>.ErrorResponse("Invalid token"));

        var email = principal.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email))
            return BadRequest(ApiResponse<RefreshTokenResponse>.ErrorResponse("Invalid token claims"));

        var user = await _authService.GetUserByEmailAsync(email);
        if (user == null)
            return BadRequest(ApiResponse<RefreshTokenResponse>.ErrorResponse("User not found"));

        var newToken = _jwtService.GenerateToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken();

        var response = new RefreshTokenResponse
        {
            Token = newToken,
            RefreshToken = newRefreshToken
        };

        return Ok(ApiResponse<RefreshTokenResponse>.SuccessResponse(response, "Token refreshed successfully"));
    }

    [HttpPost("validate")]
    [Authorize]
    public ActionResult<ApiResponse<object>> ValidateToken()
    {
        // If we reach here, the token is valid (middleware validated it)
        return Ok(ApiResponse<object>.SuccessResponse(new { valid = true }, "Token is valid"));
    }

    [HttpPut("theme")]
    [Authorize]
    public async Task<IActionResult> UpdateTheme([FromBody] ThemeUpdateRequest request)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email))
            return Unauthorized(ApiResponse<object>.ErrorResponse("Invalid token claims"));

        var user = await _authService.GetUserByEmailAsync(email);
        if (user == null)
            return Unauthorized(ApiResponse<object>.ErrorResponse("User not found"));

        var success = await _authService.UpdateThemeAsync(user.Id, request.ThemePreference);
        if (!success)
            return StatusCode(500, ApiResponse<object>.ErrorResponse("Failed to update theme preference"));

        return Ok(ApiResponse<object>.SuccessResponse(new { theme = request.ThemePreference }, "Theme preference updated"));
    }
}
