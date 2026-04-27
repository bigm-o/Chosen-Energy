using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Models.DTOs;
using Dapper;

namespace ChosenEnergy.API.Services;

public class InvoiceService : IInvoiceService
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public InvoiceService(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<IEnumerable<Invoice>> GetAllAsync()
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var sql = @"
            SELECT i.*, c.company_name as CustomerName, s.sale_id as SupplySaleId
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN supplies s ON i.supply_id = s.id
            ORDER BY i.created_at DESC";
        return await connection.QueryAsync<Invoice>(sql);
    }

    public async Task<Invoice?> GetByIdAsync(Guid id)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var sql = @"
            SELECT i.*, c.company_name as CustomerName, s.sale_id as SupplySaleId
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN supplies s ON i.supply_id = s.id
            WHERE i.id = @id";
        return await connection.QuerySingleOrDefaultAsync<Invoice>(sql, new { id });
    }

    public async Task<InvoiceSummaryDTO> GetSummaryAsync()
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var sql = @"
            SELECT 
                COALESCE(SUM(amount_due - amount_paid), 0) as TotalOutstanding,
                COALESCE(SUM(CASE WHEN updated_at >= date_trunc('month', current_date) AND status = 'Paid' THEN amount_paid ELSE 0 END), 0) as PaidThisMonth,
                COUNT(CASE WHEN status != 'Paid' THEN 1 END) as PendingInvoicesCount,
                COUNT(CASE WHEN due_date < current_date AND status != 'Paid' THEN 1 END) as OverdueInvoicesCount
            FROM invoices";
        return await connection.QuerySingleAsync<InvoiceSummaryDTO>(sql);
    }

    public async Task<Invoice> CreateFromSupplyAsync(Guid supplyId, DateTime dueDate)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        
        // Get supply details
        var supply = await connection.QuerySingleOrDefaultAsync<Supply>(
            "SELECT * FROM supplies WHERE id = @supplyId", new { supplyId });
        
        if (supply == null) throw new Exception("Supply record not found");

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            SupplyId = supplyId,
            CustomerId = supply.CustomerId,
            InvoiceNumber = $"INV-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}",
            AmountDue = supply.TotalAmount,
            AmountPaid = 0,
            DueDate = dueDate,
            Status = "Unpaid",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var sql = @"
            INSERT INTO invoices (id, supply_id, customer_id, invoice_number, amount_due, amount_paid, due_date, status, created_at, updated_at)
            VALUES (@Id, @SupplyId, @CustomerId, @InvoiceNumber, @AmountDue, @AmountPaid, @DueDate, @Status, @CreatedAt, @UpdatedAt)";
        
        await connection.ExecuteAsync(sql, invoice);
        
        // Link invoice back to supply if needed, although we have supply_id in invoices
        
        return invoice;
    }

    public async Task<bool> MarkAsPaidAsync(Guid id, decimal amount)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        
        var invoice = await GetByIdAsync(id);
        if (invoice == null) return false;

        var newAmountPaid = invoice.AmountPaid + amount;
        var status = newAmountPaid >= invoice.AmountDue ? "Paid" : "PartiallyPaid";

        var sql = @"
            UPDATE invoices 
            SET amount_paid = @newAmountPaid, 
                status = @status, 
                updated_at = @now 
            WHERE id = @id";
        
        var affected = await connection.ExecuteAsync(sql, new { id, newAmountPaid, status, now = DateTime.UtcNow });
        
        if (affected > 0)
        {
            // Log payment in payments table
            var paymentSql = @"
                INSERT INTO payments (id, customer_id, amount, payment_date, reference, notes, created_at)
                VALUES (gen_random_uuid(), @CustomerId, @amount, @now, @Reference, @Notes, @now)";
            
            await connection.ExecuteAsync(paymentSql, new { 
                invoice.CustomerId, 
                amount, 
                now = DateTime.UtcNow, 
                Reference = $"INV:{invoice.InvoiceNumber}",
                Notes = $"Payment for invoice {invoice.InvoiceNumber}"
            });
        }

        return affected > 0;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync("DELETE FROM invoices WHERE id = @id", new { id });
        return affected > 0;
    }
}
