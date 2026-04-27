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

    public async Task<bool> UpdatePermissionsAsync(Guid id, List<string> permissions)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(permissions);
        return await _userRepository.UpdatePermissionsAsync(id, json);
    }

    public async Task<bool> ResetPasswordAsync(Guid id, string newPassword, bool requiresPasswordChange)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        return await _userRepository.UpdatePasswordAsync(id, passwordHash, requiresPasswordChange);
    }

    public async Task<bool> UpdateLastLoginAsync(Guid id)
    {
        return await _userRepository.UpdateLastLoginAsync(id);
    }
}
