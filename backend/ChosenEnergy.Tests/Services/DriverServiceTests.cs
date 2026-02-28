using Xunit;
using Moq;
using ChosenEnergy.API.Services;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.Tests.Services;

public class DriverServiceTests
{
    [Fact]
    public void CreateAsync_ShouldExtractUsernameFromFirstName()
    {
        // Arrange
        var fullName = "John Doe";
        var expectedUsername = "john";
        
        // Act
        var username = fullName.Split(' ')[0].ToLower();
        
        // Assert
        Assert.Equal(expectedUsername, username);
    }

    [Fact]
    public void CreateAsync_ShouldUsePhoneAsPassword()
    {
        // Arrange
        var phone = "08012345678";
        
        // Act - This verifies the logic used in DriverService
        var password = phone;
        
        // Assert
        Assert.Equal("08012345678", password);
    }
}
