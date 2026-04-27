namespace ChosenEnergy.API.Models;

public class Driver
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string LicenseNumber { get; set; } = "";
    public string Status { get; set; } = "Active";
    public Guid? UserId { get; set; }
    public Guid? AssignedTruckId { get; set; }
    public string? Address { get; set; }
    public DateTime? LicenseExpiry { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? GuarantorName { get; set; }
    public string? GuarantorPhone { get; set; }
    public string? MedicalCertificate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public string? TruckRegistration { get; set; }
    public string? TruckType { get; set; }
    public bool? IsUserActive { get; set; }
    public string? AppEmail { get; set; }
    public string? AppUsername { get; set; }
}
