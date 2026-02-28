using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Services;

public interface IMaintenanceService
{
    Task<IEnumerable<MaintenanceLog>> GetAllAsync();
    Task<IEnumerable<MaintenanceLog>> GetByTruckIdAsync(Guid truckId);
    Task<MaintenanceLog> CreateAsync(MaintenanceLog log);
    Task<MaintenanceLog> UpdateStatusAsync(Guid id, MaintenanceStatus status);
    Task<bool> DeleteAsync(Guid id);
}
