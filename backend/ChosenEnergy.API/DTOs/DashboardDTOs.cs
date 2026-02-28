namespace ChosenEnergy.API.DTOs;

public class DashboardStats
{
    public decimal TotalRevenue { get; set; }

    public decimal TotalVolume { get; set; }
    public int ActiveTrucks { get; set; }
    public int PendingApprovals { get; set; }
    public decimal MonthlyRevenueGrowth { get; set; } // vs last month
}

public class RevenueChartData
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public class RecentActivityDto
{
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class PendingItemDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty; // "Purchase" or "Supply"
    public string Reference { get; set; } = string.Empty; // "Depot Name" or "Customer Name"
    public string Description { get; set; } = string.Empty; // "15,000 L"
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class DashboardResponse
{
    public DashboardStats Stats { get; set; } = new();
    public IEnumerable<RevenueChartData> RevenueChart { get; set; } = new List<RevenueChartData>();
    public IEnumerable<RecentActivityDto> RecentActivity { get; set; } = new List<RecentActivityDto>();
    public IEnumerable<PendingItemDto> PendingItems { get; set; } = new List<PendingItemDto>();
}
