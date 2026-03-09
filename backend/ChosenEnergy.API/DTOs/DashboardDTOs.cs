namespace ChosenEnergy.API.DTOs;

public class DashboardStats
{
    public decimal TotalRevenue { get; set; }

    public decimal TotalVolume { get; set; }
    public int ActiveTrucks { get; set; }
    public int PendingApprovals { get; set; }
    public decimal MonthlyRevenueGrowth { get; set; } // vs last month

    // New additions
    public decimal TotalPurchasesCost { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal InwardLoadVolume { get; set; }
    public decimal TransloadVolume { get; set; }
    public int ActiveDrivers { get; set; }
    public int TotalCustomers { get; set; }
}

public class RevenueChartData
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public class VolumeChartData
{
    public string Date { get; set; } = string.Empty;
    public decimal SupplyVolume { get; set; }
    public decimal InwardVolume { get; set; }
}

public class TopCustomerDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Volume { get; set; }
}

public class DepotPerformanceDto
{
    public string DepotName { get; set; } = string.Empty;
    public decimal Volume { get; set; }
}

public class TruckStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class OperationsChartData
{
    public string Date { get; set; } = string.Empty;
    public int Supplies { get; set; }
    public int Purchases { get; set; }
    public int Transloads { get; set; }
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
    
    // New Charts & Analytics
    public IEnumerable<VolumeChartData> VolumeChart { get; set; } = new List<VolumeChartData>();
    public IEnumerable<TopCustomerDto> TopCustomers { get; set; } = new List<TopCustomerDto>();
    public IEnumerable<DepotPerformanceDto> DepotPerformance { get; set; } = new List<DepotPerformanceDto>();
    public IEnumerable<TruckStatusDto> TruckStatusDistribution { get; set; } = new List<TruckStatusDto>();
    public IEnumerable<OperationsChartData> OperationsChart { get; set; } = new List<OperationsChartData>();

    public IEnumerable<RecentActivityDto> RecentActivity { get; set; } = new List<RecentActivityDto>();
    public IEnumerable<PendingItemDto> PendingItems { get; set; } = new List<PendingItemDto>();
}
