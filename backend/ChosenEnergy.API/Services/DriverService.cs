using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Services;

public interface IDriverService
{
    Task<IEnumerable<Driver>> GetAllAsync();
    Task<Driver?> GetByIdAsync(Guid id);
    Task<Driver> CreateAsync(Driver driver);
    Task<Driver> UpdateAsync(Guid id, Driver driver);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> AssignTruckAsync(Guid driverId, Guid truckId);
    Task<bool> UpdateStatusAsync(Guid driverId, string status);
    Task<Driver?> GetByUserIdAsync(Guid userId);
    Task<bool> CreateUserAccountAsync(Guid driverId);
}

public class DriverService : IDriverService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuthService _authService;

    public DriverService(IDbConnectionFactory connectionFactory, IAuthService authService)
    {
        _connectionFactory = connectionFactory;
        _authService = authService;
    }

    public async Task<IEnumerable<Driver>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                d.id as Id,
                d.full_name as FullName,
                d.phone as Phone,
                d.license_number as LicenseNumber,
                d.status::text as Status,
                d.user_id as UserId,
                d.assigned_truck_id as AssignedTruckId,
                d.address as Address,
                d.license_expiry as LicenseExpiry,
                d.emergency_contact_name as EmergencyContactName,
                d.emergency_contact_phone as EmergencyContactPhone,
                d.guarantor_name as GuarantorName,
                d.guarantor_phone as GuarantorPhone,
                d.medical_certificate as MedicalCertificate,
                d.notes as Notes,
                d.created_at as CreatedAt,
                d.updated_at as UpdatedAt,
                t.registration_number as TruckRegistration,
                t.truck_type as TruckType,
                u.is_active as IsUserActive,
                COALESCE(u.email, 'N/A') as AppEmail,
                COALESCE(u.username, u.email, 'N/A') as AppUsername
            FROM drivers d
            LEFT JOIN trucks t ON d.assigned_truck_id = t.id
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.full_name";
        
        return await connection.QueryAsync<Driver>(sql);
    }

    public async Task<Driver?> GetByIdAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                d.id as Id,
                d.full_name as FullName,
                d.phone as Phone,
                d.license_number as LicenseNumber,
                d.status::text as Status,
                d.user_id as UserId,
                d.assigned_truck_id as AssignedTruckId,
                d.address as Address,
                d.license_expiry as LicenseExpiry,
                d.emergency_contact_name as EmergencyContactName,
                d.emergency_contact_phone as EmergencyContactPhone,
                d.guarantor_name as GuarantorName,
                d.guarantor_phone as GuarantorPhone,
                d.medical_certificate as MedicalCertificate,
                d.notes as Notes,
                d.created_at as CreatedAt,
                d.updated_at as UpdatedAt,
                t.registration_number as TruckRegistration,
                t.truck_type as TruckType,
                u.is_active as IsUserActive,
                COALESCE(u.email, 'N/A') as AppEmail,
                COALESCE(u.username, u.email, 'N/A') as AppUsername
            FROM drivers d
            LEFT JOIN trucks t ON d.assigned_truck_id = t.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = @Id";
        
        return await connection.QueryFirstOrDefaultAsync<Driver>(sql, new { Id = id });
    }

    public async Task<Driver> CreateAsync(Driver driver)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // Create user account for driver
        var firstName = driver.FullName.Split(' ')[0].ToLower();
        var email = $"{firstName}@driver.chosen.com";
        var username = firstName; // Username is just the firstname
        var password = driver.Phone; // Use phone as default password
        
        var createdUser = await _authService.CreateUserAsync(email, username, password, driver.FullName, UserRole.Driver);
        
        // Create driver record
        var sql = @"
            INSERT INTO drivers (full_name, phone, license_number, status, user_id, assigned_truck_id, address, license_expiry, emergency_contact_name, emergency_contact_phone, guarantor_name, guarantor_phone, medical_certificate, notes)
            VALUES (@FullName, @Phone, @LicenseNumber, @Status::driver_status, @UserId, @AssignedTruckId, @Address, @LicenseExpiry, @EmergencyContactName, @EmergencyContactPhone, @GuarantorName, @GuarantorPhone, @MedicalCertificate, @Notes)
            RETURNING 
                id as Id,
                full_name as FullName,
                phone as Phone,
                license_number as LicenseNumber,
                status::text as Status,
                user_id as UserId,
                assigned_truck_id as AssignedTruckId,
                address as Address,
                license_expiry as LicenseExpiry,
                emergency_contact_name as EmergencyContactName,
                emergency_contact_phone as EmergencyContactPhone,
                guarantor_name as GuarantorName,
                guarantor_phone as GuarantorPhone,
                medical_certificate as MedicalCertificate,
                notes as Notes,
                created_at as CreatedAt,
                updated_at as UpdatedAt";

        return await connection.QueryFirstAsync<Driver>(sql, new
        {
            driver.FullName,
            driver.Phone,
            driver.LicenseNumber,
            driver.Status,
            UserId = createdUser.Id,
            driver.AssignedTruckId,
            driver.Address,
            driver.LicenseExpiry,
            driver.EmergencyContactName,
            driver.EmergencyContactPhone,
            driver.GuarantorName,
            driver.GuarantorPhone,
            driver.MedicalCertificate,
            driver.Notes
        });
    }

    public async Task<Driver> UpdateAsync(Guid id, Driver driver)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            UPDATE drivers 
            SET full_name = @FullName,
                phone = @Phone,
                license_number = @LicenseNumber,
                status = @Status::driver_status,
                assigned_truck_id = @AssignedTruckId,
                address = @Address,
                license_expiry = @LicenseExpiry,
                emergency_contact_name = @EmergencyContactName,
                emergency_contact_phone = @EmergencyContactPhone,
                guarantor_name = @GuarantorName,
                guarantor_phone = @GuarantorPhone,
                medical_certificate = @MedicalCertificate,
                notes = @Notes,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id
            RETURNING 
                id as Id,
                full_name as FullName,
                phone as Phone,
                license_number as LicenseNumber,
                status::text as Status,
                user_id as UserId,
                assigned_truck_id as AssignedTruckId,
                address as Address,
                license_expiry as LicenseExpiry,
                emergency_contact_name as EmergencyContactName,
                emergency_contact_phone as EmergencyContactPhone,
                guarantor_name as GuarantorName,
                guarantor_phone as GuarantorPhone,
                medical_certificate as MedicalCertificate,
                notes as Notes,
                created_at as CreatedAt,
                updated_at as UpdatedAt";

        return await connection.QueryFirstAsync<Driver>(sql, new
        {
            Id = id,
            driver.FullName,
            driver.Phone,
            driver.LicenseNumber,
            driver.Status,
            driver.AssignedTruckId,
            driver.Address,
            driver.LicenseExpiry,
            driver.EmergencyContactName,
            driver.EmergencyContactPhone,
            driver.GuarantorName,
            driver.GuarantorPhone,
            driver.MedicalCertificate,
            driver.Notes
        });
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        
        try
        {
            // Get driver info including user_id
            var driver = await connection.QueryFirstOrDefaultAsync<Driver>(
                "SELECT id as Id, user_id as UserId FROM drivers WHERE id = @Id",
                new { Id = id },
                transaction);
            
            if (driver == null) return false;
            
            // Check if driver has any supplies
            var supplyCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM supplies WHERE driver_id = @DriverId",
                new { DriverId = id },
                transaction);
            
            if (supplyCount > 0)
            {
                // Soft delete: set status to Inactive
                await connection.ExecuteAsync(
                    "UPDATE drivers SET status = 'Inactive'::driver_status, updated_at = CURRENT_TIMESTAMP WHERE id = @Id",
                    new { Id = id },
                    transaction);
                transaction.Commit();
                return true;
            }
            
            // Hard delete: delete driver first, then user
            await connection.ExecuteAsync(
                "DELETE FROM drivers WHERE id = @Id",
                new { Id = id },
                transaction);
            
            if (driver.UserId != null)
            {
                await connection.ExecuteAsync(
                    "DELETE FROM users WHERE id = @UserId",
                    new { UserId = driver.UserId },
                    transaction);
            }
            
            transaction.Commit();
            return true;
        }
        catch
        {
            throw;
        }
    }

    public async Task<bool> AssignTruckAsync(Guid driverId, Guid truckId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();
        try
        {
            // 1. Clear previous assignments for this truck (if any)
            await connection.ExecuteAsync(
                "UPDATE drivers SET assigned_truck_id = NULL WHERE assigned_truck_id = @TruckId",
                new { TruckId = truckId }, transaction);
            
            await connection.ExecuteAsync(
                "UPDATE trucks SET assigned_driver_id = NULL WHERE assigned_driver_id IN (SELECT id FROM drivers WHERE assigned_truck_id = @TruckId)",
                new { TruckId = truckId }, transaction);

            // 2. Clear previous assignments for this driver
            await connection.ExecuteAsync(
                "UPDATE trucks SET assigned_driver_id = NULL WHERE assigned_driver_id = @DriverId",
                new { DriverId = driverId }, transaction);

            // 3. Set new assignments
            await connection.ExecuteAsync(
                "UPDATE drivers SET assigned_truck_id = @TruckId WHERE id = @DriverId",
                new { DriverId = driverId, TruckId = truckId }, transaction);
            
            await connection.ExecuteAsync(
                "UPDATE trucks SET assigned_driver_id = @DriverId WHERE id = @TruckId",
                new { DriverId = driverId, TruckId = truckId }, transaction);

            transaction.Commit();
            return true;
        }
        catch
        {
            transaction.Rollback();
            return false;
        }
    }

    public async Task<bool> UpdateStatusAsync(Guid driverId, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE drivers SET status = @Status::driver_status, updated_at = CURRENT_TIMESTAMP WHERE id = @Id";
        var result = await connection.ExecuteAsync(sql, new { Id = driverId, Status = status });
        return result > 0;
    }
    public async Task<Driver?> GetByUserIdAsync(Guid userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                d.id as Id,
                d.full_name as FullName,
                d.phone as Phone,
                d.license_number as LicenseNumber,
                d.status::text as Status,
                d.user_id as UserId,
                d.assigned_truck_id as AssignedTruckId,
                d.address as Address,
                d.license_expiry as LicenseExpiry,
                d.emergency_contact_name as EmergencyContactName,
                d.emergency_contact_phone as EmergencyContactPhone,
                d.guarantor_name as GuarantorName,
                d.guarantor_phone as GuarantorPhone,
                d.medical_certificate as MedicalCertificate,
                d.notes as Notes,
                d.created_at as CreatedAt,
                d.updated_at as UpdatedAt,
                t.registration_number as TruckRegistration,
                t.truck_type as TruckType
            FROM drivers d
            LEFT JOIN trucks t ON d.assigned_truck_id = t.id
            WHERE d.user_id = @UserId";
        
        return await connection.QueryFirstOrDefaultAsync<Driver>(sql, new { UserId = userId });
    }

    public async Task<bool> CreateUserAccountAsync(Guid driverId)
    {
        var driver = await GetByIdAsync(driverId);
        if (driver == null || driver.UserId != null) return false; // Already has an account or doesn't exist

        var firstName = driver.FullName.Split(' ')[0].ToLower();
        var email = $"{firstName}_{DateTime.Now.Ticks}@driver.chosen.com";
        var username = $"{firstName}_{DateTime.Now.Ticks}"; // Username is just the firstname + random
        var password = driver.Phone; // Use phone as default password
        
        var createdUser = await _authService.CreateUserAsync(email, username, password, driver.FullName, UserRole.Driver);

        using var connection = _connectionFactory.CreateConnection();
        var sql = "UPDATE drivers SET user_id = @UserId WHERE id = @Id";
        var result = await connection.ExecuteAsync(sql, new { UserId = createdUser.Id, Id = driverId });
        return result > 0;
    }
}
