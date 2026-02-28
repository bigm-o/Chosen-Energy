using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using System.Security.Claims;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly IDbConnectionFactory _connectionFactory;

    public CustomersController(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                c.id as Id, 
                c.company_name as CompanyName, 
                c.contact_person as ContactPerson, 
                c.phone as Phone, 
                c.email as Email, 
                c.address as Address,
                c.created_at as CreatedAt,
                c.credit_limit as CreditLimit,
                (
                    COALESCE((SELECT SUM(s.total_amount) FROM supplies s WHERE s.customer_id = c.id AND s.status = 'Approved'), 0) 
                    - 
                    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.customer_id = c.id), 0)
                ) as CurrentBalance,
                COALESCE((SELECT SUM(s.quantity) FROM supplies s WHERE s.customer_id = c.id AND s.status = 'Approved'), 0) as TotalLitresBought
            FROM customers c 
            ORDER BY c.company_name";
        var customers = await connection.QueryAsync<Customer>(sql);
        return Ok(new { success = true, data = customers });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                c.id as Id, c.company_name as CompanyName, c.contact_person as ContactPerson, 
                c.phone as Phone, c.email as Email, c.address as Address, c.created_at as CreatedAt,
                c.credit_limit as CreditLimit,
                (
                    COALESCE((SELECT SUM(s.total_amount) FROM supplies s WHERE s.customer_id = c.id AND s.status = 'Approved'), 0) 
                    - 
                    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.customer_id = c.id), 0)
                ) as CurrentBalance
            FROM customers c WHERE c.id = @Id";
        var customer = await connection.QueryFirstOrDefaultAsync<Customer>(sql, new { Id = id });
        
        if (customer == null)
            return NotFound(new { success = false, message = "Customer not found" });
            
        return Ok(new { success = true, data = customer });
    }

    // ... (GetHistory remains same)

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            INSERT INTO customers (id, company_name, contact_person, phone, email, address, credit_limit, created_at, updated_at)
            VALUES (@Id, @CompanyName, @ContactPerson, @Phone, @Email, @Address, @CreditLimit, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id as Id, company_name as CompanyName, contact_person as ContactPerson, 
                      phone as Phone, email as Email, address as Address, credit_limit as CreditLimit, created_at as CreatedAt";
        
        var customer = await connection.QueryFirstAsync<Customer>(sql, new
        {
            Id = Guid.NewGuid(),
            request.CompanyName,
            request.ContactPerson,
            request.Phone,
            request.Email,
            request.Address,
            request.CreditLimit
        });
        
        return Ok(new { success = true, data = customer, message = "Customer created successfully" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = @"
            UPDATE customers 
            SET company_name = @CompanyName,
                contact_person = @ContactPerson,
                phone = @Phone,
                email = @Email,
                address = @Address,
                credit_limit = @CreditLimit,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id
            RETURNING id as Id, company_name as CompanyName, contact_person as ContactPerson, 
                      phone as Phone, email as Email, address as Address, credit_limit as CreditLimit, created_at as CreatedAt";
        
        var customer = await connection.QueryFirstOrDefaultAsync<Customer>(sql, new
        {
            Id = id,
            request.CompanyName,
            request.ContactPerson,
            request.Phone,
            request.Email,
            request.Address,
            request.CreditLimit
        });
        
        if (customer == null)
            return NotFound(new { success = false, message = "Customer not found" });
            
        return Ok(new { success = true, data = customer, message = "Customer updated successfully" });
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = "DELETE FROM customers WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = id });
        return Ok(new { success = true, message = "Customer deleted successfully" });
    }
}

public class CreateCustomerRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal CreditLimit { get; set; }
}

public class UpdateCustomerRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal CreditLimit { get; set; }
}

public class CustomerHistoryDto
{
    public Guid Id { get; set; }
    public string? SaleId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerLitre { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SupplyDate { get; set; }
    public string? TruckRegNumber { get; set; }
    public string? DriverName { get; set; }
}
