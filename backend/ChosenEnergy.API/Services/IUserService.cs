using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Services;

public interface IUserService
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<User> UpdateAsync(Guid id, User user);
    Task<bool> DeleteAsync(Guid id);
    Task<User> CreateUserAsync(string email, string username, string password, string fullName, UserRole role);
    Task<bool> UpdatePermissionsAsync(Guid id, List<string> permissions);
    Task<bool> ResetPasswordAsync(Guid id, string newPassword, bool requiresPasswordChange);
    Task<bool> UpdateLastLoginAsync(Guid id);
}
