using Moq;
using Xunit;
using ChosenEnergy.API.Services;
using ChosenEnergy.API.Repositories;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _authService = new AuthService(_userRepositoryMock.Object);
    }

    [Fact]
    public async Task AuthenticateAsync_ValidCredentials_ReturnsUser()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User { Id = Guid.NewGuid(), Email = email, PasswordHash = passwordHash, Role = UserRole.Admin };

        _userRepositoryMock.Setup(x => x.GetByEmailOrUsernameAsync(email))
            .ReturnsAsync(user);

        // Act
        var result = await _authService.AuthenticateAsync(email, password);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(user.Id, result.Id);
    }

    [Fact]
    public async Task AuthenticateAsync_InvalidPassword_ReturnsNull()
    {
        // Arrange
        var email = "test@example.com";
        var password = "password123";
        var wrongPassword = "wrongpassword";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User { Id = Guid.NewGuid(), Email = email, PasswordHash = passwordHash };

        _userRepositoryMock.Setup(x => x.GetByEmailOrUsernameAsync(email))
            .ReturnsAsync(user);

        // Act
        var result = await _authService.AuthenticateAsync(email, wrongPassword);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task AuthenticateAsync_UserNotFound_ReturnsNull()
    {
        // Arrange
        var email = "nonexistent@example.com";
        _userRepositoryMock.Setup(x => x.GetByEmailOrUsernameAsync(email))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _authService.AuthenticateAsync(email, "password");

        // Assert
        Assert.Null(result);
    }
}
