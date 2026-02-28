using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailOrUsernameAsync(string emailOrUsername);
    Task<User?> GetByEmailAsync(string email);
    Task<IEnumerable<User>> GetAllAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<User> CreateAsync(User user, string passwordHash);
    Task<User> UpdateAsync(User user);
    Task<bool> DeleteAsync(Guid id);
}
