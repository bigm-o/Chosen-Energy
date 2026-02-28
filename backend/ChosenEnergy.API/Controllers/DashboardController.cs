using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using ChosenEnergy.API.Data;
using ChosenEnergy.API.DTOs;
using ChosenEnergy.API.Services;

namespace ChosenEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAuditService _auditService;

    public DashboardController(IDbConnectionFactory connectionFactory, IAuditService auditService)
    {
        _connectionFactory = connectionFactory;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboardData()
    {
        using var connection = _connectionFactory.CreateConnection();
        var response = new DashboardResponse();

        // 1. Stats
        // 1. Stats
        var sqlStats = @"
            SELECT
                (SELECT COALESCE(SUM(total_amount), 0) FROM supplies WHERE status = 'Approved') as TotalRevenue,
                (SELECT COALESCE(SUM(quantity), 0) FROM supplies WHERE status = 'Approved') as TotalVolume,
                (SELECT COUNT(*) FROM trucks WHERE status = 'Active') as ActiveTrucks,
                (SELECT COUNT(*) FROM purchases WHERE status = 'Pending') + (SELECT COUNT(*) FROM supplies WHERE status = 'Pending') as PendingApprovals
        ";
        var stats = await connection.QueryFirstAsync<DashboardStats>(sqlStats);

        // Monthly Growth
        var thisMonth = await connection.ExecuteScalarAsync<decimal>("SELECT COALESCE(SUM(total_amount), 0) FROM supplies WHERE status = 'Approved' AND supply_date >= date_trunc('month', CURRENT_DATE)");
        var lastMonth = await connection.ExecuteScalarAsync<decimal>("SELECT COALESCE(SUM(total_amount), 0) FROM supplies WHERE status = 'Approved' AND supply_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND supply_date < date_trunc('month', CURRENT_DATE)");
        
        if (lastMonth > 0)
            stats.MonthlyRevenueGrowth = ((thisMonth - lastMonth) / lastMonth) * 100;
        else
            stats.MonthlyRevenueGrowth = thisMonth > 0 ? 100 : 0;

        response.Stats = stats;

        // 2. Revenue Chart (Last 7 Days)
        var sqlChart = @"
            SELECT 
                TO_CHAR(supply_date, 'YYYY-MM-DD') as Date,
                SUM(total_amount) as Revenue
            FROM supplies
            WHERE status = 'Approved' AND supply_date >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY date(supply_date)
            ORDER BY date(supply_date)";
        
        var chartData = await connection.QueryAsync<RevenueChartData>(sqlChart);
        
        // Fill missing days with 0
        var fullChart = new List<RevenueChartData>();
        for (int i = 6; i >= 0; i--)
        {
            var date = DateTime.Now.AddDays(-i).ToString("yyyy-MM-dd");
            var existing = chartData.FirstOrDefault(c => c.Date == date);
            fullChart.Add(new RevenueChartData 
            { 
                Date = DateTime.Now.AddDays(-i).ToString("MMM dd"), 
                Revenue = existing?.Revenue ?? 0 
            });
        }
        response.RevenueChart = fullChart;

        // 3. Recent Activity (Logs)
        var logs = await _auditService.GetRecentLogsAsync(5);
        response.RecentActivity = logs.Select(l => new RecentActivityDto
        {
            Action = l.Action ?? "Unknown",
            Description = $"{l.Action} {l.EntityType}",
            User = l.UserName ?? "System",
            Timestamp = l.Timestamp
        });

        // 4. Pending Items (Purchases & Supplies)
        var sqlPending = @"
            SELECT id as Id, 'Purchase' as Type, 'Depot: ' || (SELECT name FROM depots WHERE id = depot_id) as Reference, quantity || ' L' as Description, status::text as Status, created_at as CreatedAt FROM purchases WHERE status = 'Pending'
            UNION ALL
            SELECT id as Id, 'Supply' as Type, 'Customer: ' || (SELECT company_name FROM customers WHERE id = customer_id) as Reference, quantity || ' L' as Description, status::text as Status, created_at as CreatedAt FROM supplies WHERE status = 'Pending'
            UNION ALL
            SELECT id as Id, 'Maintenance' as Type, 'Truck: ' || registration_number as Reference, 'Overdue since ' || TO_CHAR(next_maintenance_date, 'YYYY-MM-DD') as Description, 'Overdue' as Status, next_maintenance_date as CreatedAt FROM trucks WHERE next_maintenance_date < CURRENT_DATE
            ORDER BY CreatedAt DESC
            LIMIT 10";
        
        response.PendingItems = await connection.QueryAsync<PendingItemDto>(sqlPending);

        return Ok(new { success = true, data = response });
    }
}
