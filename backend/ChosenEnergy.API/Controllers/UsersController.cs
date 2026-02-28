using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ChosenEnergy.API.DTOs;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,MD")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        var response = users.Select(u => new UserResponse
        {
            Id = u.Id,
            Email = u.Email,
            Username = u.Username,
            FullName = u.FullName,
            Role = u.Role.ToString(),
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt
        });
        
        return Ok(new { success = true, data = response });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });
        
        return Ok(new { success = true, data = new UserResponse
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        }});
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        try
        {
            var user = await _userService.CreateUserAsync(request.Email, request.Username, request.Password, request.FullName, request.Role);
            return Ok(new { success = true, data = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            }, message = "User created successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var userToUpdate = new User
            {
                Id = id,
                FullName = request.FullName,
                Role = request.Role,
                IsActive = request.IsActive
            };

            var updated = await _userService.UpdateAsync(id, userToUpdate);
            
            return Ok(new { success = true, data = new UserResponse
            {
                Id = updated.Id,
                Email = updated.Email,
                Username = updated.Username,
                FullName = updated.FullName,
                Role = updated.Role.ToString(),
                IsActive = updated.IsActive,
                CreatedAt = updated.CreatedAt
            }, message = "User updated successfully" });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, message = "User not found" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")] // Only Admin can delete users
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var deleted = await _userService.DeleteAsync(id);
            if (!deleted)
                return NotFound(new { success = false, message = "User not found" });
            
            return Ok(new { success = true, message = "User deactivated successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
