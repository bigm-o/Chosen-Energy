using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ChosenEnergy.API.Middleware;

public class JwtValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;
    private readonly ILogger<JwtValidationMiddleware> _logger;

    public JwtValidationMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<JwtValidationMiddleware> logger)
    {
        _next = next;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var token = ExtractTokenFromHeader(context);
        
        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_configuration["JwtSettings:Secret"]!);
                
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = _configuration["JwtSettings:Issuer"],
                    ValidAudience = _configuration["JwtSettings:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ClockSkew = TimeSpan.Zero // Remove default 5-minute tolerance
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
                
                // Check if token is expired
                var jwtToken = validatedToken as JwtSecurityToken;
                if (jwtToken?.ValidTo < DateTime.UtcNow)
                {
                    _logger.LogWarning("Token has expired for request to {Path}", context.Request.Path);
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Token has expired");
                    return;
                }
            }
            catch (SecurityTokenExpiredException)
            {
                _logger.LogWarning("Expired token provided for request to {Path}", context.Request.Path);
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Token has expired");
                return;
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning("Invalid token provided for request to {Path}: {Error}", context.Request.Path, ex.Message);
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Invalid token");
                return;
            }
        }

        await _next(context);
    }

    private static string? ExtractTokenFromHeader(HttpContext context)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (authHeader != null && authHeader.StartsWith("Bearer "))
        {
            return authHeader["Bearer ".Length..];
        }
        return null;
    }
}