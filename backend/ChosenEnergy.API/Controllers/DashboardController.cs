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
        var sqlStats = @"
            SELECT
                (SELECT COALESCE(SUM(total_amount), 0) FROM supplies WHERE status = 'Approved') as TotalRevenue,
                (SELECT COALESCE(SUM(quantity), 0) FROM supplies WHERE status = 'Approved') as TotalVolume,
                (SELECT COUNT(*) FROM trucks WHERE status = 'Active') as ActiveTrucks,
                (SELECT COUNT(*) FROM purchases WHERE status = 'Pending') + 
                (SELECT COUNT(*) FROM supplies WHERE status = 'Pending') + 
                (SELECT COUNT(*) FROM transloading WHERE status = 'Pending'::approval_status) + 
                (SELECT COUNT(*) FROM inward_loads WHERE status = 'Pending') as PendingApprovals,
                (SELECT COALESCE(SUM(total_cost), 0) FROM purchases WHERE status = 'Approved') as TotalPurchasesCost,
                (SELECT COALESCE(SUM(quantity), 0) FROM inward_loads WHERE status = 'Approved') as InwardLoadVolume,
                (SELECT COALESCE(SUM(quantity), 0) FROM transloading WHERE status = 'Approved'::approval_status) as TransloadVolume,
                (SELECT COUNT(*) FROM drivers WHERE status = 'Active') as ActiveDrivers,
                (SELECT COUNT(*) FROM customers) as TotalCustomers
        ";
        var stats = await connection.QueryFirstAsync<DashboardStats>(sqlStats);
        stats.GrossProfit = stats.TotalRevenue - stats.TotalPurchasesCost;

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
        
        var chartData = (await connection.QueryAsync<RevenueChartData>(sqlChart)).ToList();
        var fullRevenueChart = new List<RevenueChartData>();
        for (int i = 6; i >= 0; i--)
        {
            var dateStr = DateTime.Now.AddDays(-i).ToString("yyyy-MM-dd");
            var existing = chartData.FirstOrDefault(c => c.Date == dateStr);
            fullRevenueChart.Add(new RevenueChartData 
            { 
                Date = DateTime.Now.AddDays(-i).ToString("MMM dd"), 
                Revenue = existing?.Revenue ?? 0 
            });
        }
        response.RevenueChart = fullRevenueChart;

        // 3. Volume Chart (Last 7 Days)
        var sqlVolumeChart = @"
            SELECT 
                TO_CHAR(d, 'YYYY-MM-DD') as Date,
                COALESCE((SELECT SUM(quantity) FROM supplies WHERE status = 'Approved' AND date(supply_date) = d), 0) as SupplyVolume,
                COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE status = 'Approved' AND date(load_date) = d), 0) as InwardVolume
            FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) as d
            ORDER BY d";
        var volumeData = (await connection.QueryAsync<VolumeChartData>(sqlVolumeChart)).ToList();
        foreach (var item in volumeData)
        {
            if(DateTime.TryParse(item.Date, out var d)) item.Date = d.ToString("MMM dd");
        }
        response.VolumeChart = volumeData;

        // 4. Operations Chart (Last 7 Days)
        var sqlOpsChart = @"
            SELECT 
                TO_CHAR(d, 'YYYY-MM-DD') as Date,
                (SELECT COUNT(*) FROM supplies WHERE status = 'Approved' AND date(supply_date) = d) as Supplies,
                (SELECT COUNT(*) FROM purchases WHERE status = 'Approved' AND date(purchase_date) = d) as Purchases,
                (SELECT COUNT(*) FROM transloading WHERE status = 'Approved'::approval_status AND date(transfer_date) = d) as Transloads
            FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) as d
            ORDER BY d";
        var opsData = (await connection.QueryAsync<OperationsChartData>(sqlOpsChart)).ToList();
        foreach (var item in opsData)
        {
            if(DateTime.TryParse(item.Date, out var d)) item.Date = d.ToString("MMM dd");
        }
        response.OperationsChart = opsData;

        // 5. Top Customers by Revenue/Volume
        var sqlTopCustomers = @"
            SELECT 
                c.company_name as Name,
                COALESCE(SUM(s.total_amount), 0) as Revenue,
                COALESCE(SUM(s.quantity), 0) as Volume
            FROM customers c
            JOIN supplies s ON c.id = s.customer_id
            WHERE s.status = 'Approved'
            GROUP BY c.company_name
            ORDER BY Revenue DESC
            LIMIT 5";
        response.TopCustomers = await connection.QueryAsync<TopCustomerDto>(sqlTopCustomers);

        // 6. Depot Performance
        var sqlDepotPerformance = @"
            SELECT 
                d.name as DepotName,
                COALESCE(SUM(p.quantity), 0) as Volume
            FROM depots d
            JOIN purchases p ON d.id = p.depot_id
            WHERE p.status = 'Approved'
            GROUP BY d.name
            ORDER BY Volume DESC
            LIMIT 5";
        response.DepotPerformance = await connection.QueryAsync<DepotPerformanceDto>(sqlDepotPerformance);

        // 7. Truck Status Distribution
        var sqlTruckStatus = @"
            SELECT status as Status, COUNT(*)::int as Count
            FROM trucks
            GROUP BY status";
        response.TruckStatusDistribution = await connection.QueryAsync<TruckStatusDto>(sqlTruckStatus);

        // 8. Recent Activity (Logs)
        var logs = await _auditService.GetRecentLogsAsync(8);
        response.RecentActivity = logs.Select(l => new RecentActivityDto
        {
            Action = l.Action ?? "Unknown",
            Description = $"{l.Action} {l.EntityType}",
            User = l.UserName ?? "System",
            Timestamp = l.Timestamp != null ? (DateTime)l.Timestamp : DateTime.UtcNow
        });

        var sqlPending = @"
            SELECT id as Id, 'Purchase' as Type, COALESCE('Depot: ' || (SELECT name FROM depots WHERE id = depot_id), '') as Reference, COALESCE(quantity::text, '') || ' L' as Description, status::text as Status, created_at as CreatedAt FROM purchases WHERE status = 'Pending'
            UNION ALL
            SELECT id as Id, 'Supply' as Type, COALESCE('Customer: ' || (SELECT company_name FROM customers WHERE id = customer_id), '') as Reference, COALESCE(quantity::text, '') || ' L' as Description, status::text as Status, created_at as CreatedAt FROM supplies WHERE status = 'Pending'
            UNION ALL
            SELECT id as Id, 'Inward Load' as Type, COALESCE('Truck: ' || (SELECT registration_number FROM trucks WHERE id = truck_id), '') as Reference, COALESCE(quantity::text, '') || ' L' as Description, status::text as Status, created_at as CreatedAt FROM inward_loads WHERE status = 'Pending'
            UNION ALL
            SELECT id as Id, 'Transload' as Type, 'Truck: ' || COALESCE((SELECT registration_number FROM trucks WHERE id = source_truck_id), '') as Reference, COALESCE(quantity::text, '') || ' L' as Description, status::text as Status, created_at as CreatedAt FROM transloading WHERE status = 'Pending'::approval_status
            UNION ALL
            SELECT id as Id, 'Maintenance' as Type, COALESCE('Truck: ' || registration_number, '') as Reference, 'Overdue since ' || COALESCE(TO_CHAR(next_maintenance_date, 'YYYY-MM-DD'), '') as Description, 'Overdue' as Status, COALESCE(next_maintenance_date, CURRENT_DATE) as CreatedAt FROM trucks WHERE next_maintenance_date < CURRENT_DATE
            ORDER BY CreatedAt DESC
            LIMIT 10";
        
        response.PendingItems = await connection.QueryAsync<PendingItemDto>(sqlPending);

        return Ok(new { success = true, data = response });
    }
}
