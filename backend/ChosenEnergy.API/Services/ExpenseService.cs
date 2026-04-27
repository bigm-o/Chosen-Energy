using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using ChosenEnergy.API.Models.DTOs;
using Dapper;

namespace ChosenEnergy.API.Services;

public class ExpenseService : IExpenseService
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public ExpenseService(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<IEnumerable<UnifiedExpenseDTO>> GetAllExpensesAsync()
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        
        var sql = @"
            -- Manual Expenses
            SELECT 
                e.id as Id, 
                e.description as Description, 
                c.name as Category, 
                e.amount as Amount, 
                e.expense_date as Date, 
                'Manual' as Source, 
                'Settled'::TEXT as Status,
                e.receipt_url as ReceiptUrl
            FROM manual_expenses e
            JOIN expense_categories c ON e.category_id = c.id
            
            UNION ALL
            
            -- Fuel Purchases (Approved)
            SELECT 
                p.id as Id, 
                'Fuel purchase: ' || d.name as Description, 
                'Fueling' as Category, 
                p.total_cost as Amount, 
                p.purchase_date as Date, 
                'Fuel' as Source, 
                p.status::TEXT as Status,
                p.receipt_url as ReceiptUrl
            FROM purchases p
            JOIN depots d ON p.depot_id = d.id
            WHERE p.status::TEXT = 'Approved'
            
            UNION ALL
            
            -- Maintenance Logs (Completed)
            SELECT 
                m.id as Id, 
                m.type::TEXT || ': ' || COALESCE(m.description, 'Regular Maintenance') as Description, 
                'Maintenance' as Category, 
                m.cost as Amount, 
                COALESCE(m.completed_date, m.scheduled_date) as Date, 
                'Maintenance' as Source, 
                m.status::TEXT as Status,
                NULL as ReceiptUrl
            FROM maintenance_logs m
            WHERE m.status::TEXT = 'Completed'
            
            ORDER BY Date DESC";

        return await connection.QueryAsync<UnifiedExpenseDTO>(sql);
    }

    public async Task<ExpenseSummaryDTO> GetSummaryAsync()
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        
        var sql = @"
            WITH AllFinances AS (
                SELECT amount, 'Overhead' as src FROM manual_expenses
                UNION ALL
                SELECT total_cost, 'Fuel' FROM purchases WHERE status::TEXT = 'Approved'
                UNION ALL
                SELECT cost, 'Maintenance' FROM maintenance_logs WHERE status::TEXT = 'Completed'
            )
            SELECT 
                COALESCE(SUM(CASE WHEN src = 'Fuel' THEN amount ELSE 0 END), 0) as FuelCost,
                COALESCE(SUM(CASE WHEN src = 'Maintenance' THEN amount ELSE 0 END), 0) as MaintenanceCost,
                COALESCE(SUM(CASE WHEN src = 'Overhead' THEN amount ELSE 0 END), 0) as OverheadCost,
                0 as OtherCost
            FROM AllFinances";

        return await connection.QuerySingleAsync<ExpenseSummaryDTO>(sql);
    }

    public async Task<IEnumerable<ExpenseCategory>> GetCategoriesAsync()
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        return await connection.QueryAsync<ExpenseCategory>("SELECT * FROM expense_categories ORDER BY name");
    }

    public async Task<ExpenseCategory> CreateCategoryAsync(string name)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var id = Guid.NewGuid();
        await connection.ExecuteAsync(
            "INSERT INTO expense_categories (id, name, is_system) VALUES (@id, @name, false)",
            new { id, name });
        return new ExpenseCategory { Id = id, Name = name, IsSystem = false };
    }

    public async Task<ManualExpense> CreateExpenseAsync(ManualExpense expense)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        expense.Id = Guid.NewGuid();
        expense.CreatedAt = DateTime.UtcNow;
        expense.UpdatedAt = DateTime.UtcNow;

        var sql = @"
            INSERT INTO manual_expenses (id, category_id, amount, description, expense_date, receipt_url, created_by, created_at, updated_at)
            VALUES (@Id, @CategoryId, @Amount, @Description, @ExpenseDate, @ReceiptUrl, @CreatedBy, @CreatedAt, @UpdatedAt)";
        
        await connection.ExecuteAsync(sql, expense);
        return expense;
    }

    public async Task<ManualExpense?> UpdateExpenseAsync(Guid id, ManualExpense expense)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        expense.UpdatedAt = DateTime.UtcNow;
        
        var sql = @"
            UPDATE manual_expenses 
            SET category_id = @CategoryId, 
                amount = @Amount, 
                description = @Description, 
                expense_date = @ExpenseDate,
                receipt_url = @ReceiptUrl,
                updated_at = @UpdatedAt
            WHERE id = @id;
            SELECT * FROM manual_expenses WHERE id = @id;";

        return await connection.QuerySingleOrDefaultAsync<ManualExpense>(sql, new { 
            id, 
            expense.CategoryId, 
            expense.Amount, 
            expense.Description, 
            expense.ExpenseDate, 
            expense.ReceiptUrl,
            expense.UpdatedAt 
        });
    }

    public async Task<bool> DeleteExpenseAsync(Guid id)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync("DELETE FROM manual_expenses WHERE id = @id", new { id });
        return affected > 0;
    }

    public async Task<bool> UpdateReceiptUrlAsync(Guid id, string receiptUrl)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync(
            "UPDATE manual_expenses SET receipt_url = @receiptUrl, updated_at = @now WHERE id = @id",
            new { id, receiptUrl, now = DateTime.UtcNow });
        return affected > 0;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        using var connection = _dbConnectionFactory.CreateConnection();
        // Don't delete system categories or categories with existing expenses
        var isSystem = await connection.ExecuteScalarAsync<bool>("SELECT is_system FROM expense_categories WHERE id = @id", new { id });
        if (isSystem) return false;

        var hasExpenses = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM manual_expenses WHERE category_id = @id", new { id }) > 0;
        if (hasExpenses) return false;

        var affected = await connection.ExecuteAsync("DELETE FROM expense_categories WHERE id = @id", new { id });
        return affected > 0;
    }
}
