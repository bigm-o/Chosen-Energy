using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.DTOs;

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
}

public class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
}

public class UserResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> CustomPermissions { get; set; } = new();
    public bool RequiresPasswordChange { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class UpdatePermissionsRequest
{
    public List<string> Permissions { get; set; } = new();
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
    public bool RequiresPasswordChange { get; set; } = true;
}
