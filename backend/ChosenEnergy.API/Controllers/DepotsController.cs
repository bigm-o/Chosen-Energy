using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using Npgsql;
using System.Security.Claims;
using ChosenEnergy.API.Models;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepotsController : ControllerBase
{
    private readonly string _connectionString;

    public DepotsController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        using var connection = new NpgsqlConnection(_connectionString);
        var sql = @"
            SELECT 
                id as Id, 
                name as Name, 
                location as Location, 
                contact_info as ContactInfo,
                current_stock as CurrentStock,
                purchase_price as PurchasePrice,
                created_at as CreatedAt
            FROM depots 
            ORDER BY name";
        var depots = await connection.QueryAsync<Depot>(sql);
        return Ok(new { success = true, data = depots });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        var sql = @"
            SELECT 
                id as Id, 
                name as Name, 
                location as Location, 
                contact_info as ContactInfo,
                current_stock as CurrentStock,
                purchase_price as PurchasePrice,
                created_at as CreatedAt
            FROM depots 
            WHERE id = @Id";
        var depot = await connection.QueryFirstOrDefaultAsync<Depot>(sql, new { Id = id });
        
        if (depot == null)
            return NotFound(new { success = false, message = "Depot not found" });
            
        return Ok(new { success = true, data = depot });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDepotRequest request)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        
        var sql = @"
            INSERT INTO depots (id, name, location, contact_info, current_stock, purchase_price, created_at)
            VALUES (@Id, @Name, @Location, @ContactInfo, @CurrentStock, @PurchasePrice, CURRENT_TIMESTAMP)
            RETURNING id as Id, name as Name, location as Location, contact_info as ContactInfo,
                      current_stock as CurrentStock, purchase_price as PurchasePrice, created_at as CreatedAt";
        
        var depot = await connection.QueryFirstAsync<Depot>(sql, new
        {
            Id = Guid.NewGuid(),
            request.Name,
            request.Location,
            request.ContactInfo,
            CurrentStock = 0,
            request.PurchasePrice
        });
        
        return Ok(new { success = true, data = depot, message = "Depot created successfully" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDepotRequest request)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        
        var sql = @"
            UPDATE depots 
            SET name = @Name,
                location = @Location,
                contact_info = @ContactInfo,
                purchase_price = @PurchasePrice
            WHERE id = @Id
            RETURNING id as Id, name as Name, location as Location, contact_info as ContactInfo,
                      current_stock as CurrentStock, purchase_price as PurchasePrice, created_at as CreatedAt";
        
        var depot = await connection.QueryFirstOrDefaultAsync<Depot>(sql, new
        {
            Id = id,
            request.Name,
            request.Location,
            request.ContactInfo,
            request.PurchasePrice
        });
        
        if (depot == null)
            return NotFound(new { success = false, message = "Depot not found" });
            
        return Ok(new { success = true, data = depot, message = "Depot updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        
        var sql = "DELETE FROM depots WHERE id = @Id";
        var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
        
        if (rowsAffected == 0)
            return NotFound(new { success = false, message = "Depot not found" });
            
        return Ok(new { success = true, message = "Depot deleted successfully" });
    }
}

public class CreateDepotRequest
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? ContactInfo { get; set; }
    public decimal PurchasePrice { get; set; }
}

public class UpdateDepotRequest
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? ContactInfo { get; set; }
    public decimal PurchasePrice { get; set; }
}
