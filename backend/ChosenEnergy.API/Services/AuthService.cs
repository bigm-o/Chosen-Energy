using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Repositories;

namespace ChosenEnergy.API.Services;

public interface IAuthService
{
    Task<User?> AuthenticateAsync(string emailOrUsername, string password);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User> CreateUserAsync(string email, string username, string password, string fullName, UserRole role);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;

    public AuthService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User?> AuthenticateAsync(string emailOrUsername, string password)
    {
        Console.WriteLine($"[AuthService] Looking up user: {emailOrUsername}");
        var user = await _userRepository.GetByEmailOrUsernameAsync(emailOrUsername);
        
        if (user == null)
        {
            Console.WriteLine($"[AuthService] User not found: {emailOrUsername}");
            return null;
        }

        Console.WriteLine($"[AuthService] User found: {user.Email}, verifying password...");
        var isValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        Console.WriteLine($"[AuthService] Password verification result: {isValid}");
        
        return isValid ? user : null;
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _userRepository.GetByEmailAsync(email);
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
}
