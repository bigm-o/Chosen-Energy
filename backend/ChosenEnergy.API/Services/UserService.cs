using ChosenEnergy.API.Models;
using ChosenEnergy.API.Repositories;

namespace ChosenEnergy.API.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        return await _userRepository.GetAllAsync();
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _userRepository.GetByIdAsync(id);
    }

    public async Task<User> CreateUserAsync(string email, string username, string password, string fullName, UserRole role)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User
        {
            Email = email,
            Username = username,
            FullName = fullName,
            Role = role
        };

        return await _userRepository.CreateAsync(user, passwordHash);
    }

    public async Task<User> UpdateAsync(Guid id, User user)
    {
        var existingUser = await _userRepository.GetByIdAsync(id);
        if (existingUser == null) throw new KeyNotFoundException("User not found");

        // Only update fields that are provided
        existingUser.FullName = user.FullName;
        existingUser.Role = user.Role;
        existingUser.IsActive = user.IsActive;

        return await _userRepository.UpdateAsync(existingUser);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        return await _userRepository.DeleteAsync(id);
    }
}
