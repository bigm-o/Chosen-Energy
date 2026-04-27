namespace ChosenEnergy.API.Models;

public enum UserRole
{
    MD,
    Admin,
    GarageManager,
    Driver
}

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string ThemePreference { get; set; } = "light";
    
    // User Management properties
    public string? CustomPermissionsRaw { get; set; }
    
    public List<string> CustomPermissions 
    { 
        get => string.IsNullOrEmpty(CustomPermissionsRaw) ? new List<string>() : System.Text.Json.JsonSerializer.Deserialize<List<string>>(CustomPermissionsRaw) ?? new List<string>();
        set => CustomPermissionsRaw = System.Text.Json.JsonSerializer.Serialize(value);
    }
    public bool RequiresPasswordChange { get; set; }
    public DateTime? LastLoginAt { get; set; }
}
