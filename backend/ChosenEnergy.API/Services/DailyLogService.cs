using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface IDailyLogService
{
    Task<dynamic> GetDriverDailyLogAsync(Guid userId, DateTime date);
    Task<IEnumerable<dynamic>> GetAdminDailyLogsAsync(DateTime date);
    Task<dynamic> GetDetailedLogByTruckAsync(Guid truckId, DateTime date);
    Task<decimal> GetTruckBalanceAsync(Guid truckId, DateTime asOfDate);
}

public class DailyLogService : IDailyLogService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ILogger<DailyLogService> _logger;

    public DailyLogService(IDbConnectionFactory connectionFactory, ILogger<DailyLogService> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<dynamic> GetDriverDailyLogAsync(Guid userId, DateTime date)
    {
        try 
        {
            using var connection = _connectionFactory.CreateConnection();
            
            var driverSql = @"
                SELECT 
                    d.id as driverid,
                    t.id as truckid,
                    t.capacity as capacity,
                    t.registration_number as truckreg
                FROM drivers d
                JOIN trucks t ON d.assigned_truck_id = t.id
                WHERE d.user_id = @UserId";
                
            var driverInfo = await connection.QueryFirstOrDefaultAsync<dynamic>(driverSql, new { UserId = userId });
            
            if (driverInfo == null) return null;

            return await GetDetailedLogByTruckInternalAsync((Guid)driverInfo.truckid, (Guid)driverInfo.driverid, date);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching driver daily log for user {UserId} on {Date}", userId, date);
            throw;
        }
    }

    public async Task<dynamic> GetDetailedLogByTruckAsync(Guid truckId, DateTime date)
    {
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var driverSql = "SELECT id FROM drivers WHERE assigned_truck_id = @TruckId";
            var driverId = await connection.QueryFirstOrDefaultAsync<Guid?>(driverSql, new { TruckId = truckId });
            
            return await GetDetailedLogByTruckInternalAsync(truckId, driverId ?? Guid.Empty, date);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching detailed log for truck {TruckId} on {Date}", truckId, date);
            throw;
        }
    }

    private async Task<dynamic> GetDetailedLogByTruckInternalAsync(Guid truckId, Guid driverId, DateTime date)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // 2. Calculate Rollover (Balance from all previous days)
        var startOfToday = date.Date;

        var rolloverSql = @"
            SELECT (
                COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND load_date::date < @Today), 0) +
                COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status != 'Rejected'::approval_status AND is_confirmed_by_receiver = TRUE AND transfer_date::date < @Today), 0) -
                COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status != 'Rejected'::approval_status AND transfer_date::date < @Today), 0) -
                COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND supply_date::date < @Today), 0)
            )";
        
        decimal rollover = await connection.ExecuteScalarAsync<decimal?>(rolloverSql, new { TruckId = truckId, Today = startOfToday.Date }) ?? 0;

        // 3. Today's Activities
        var endOfToday = startOfToday.AddDays(1).AddTicks(-1);

        // Sales (Supplies) - Explicitly add isconfirmed as true for non-transload entries
        var suppliesSql = @"
            SELECT s.id, 'Sale' as type, c.company_name as title, s.quantity as quantity, s.total_amount as value, s.status::text as status, s.supply_date as date, s.invoice_url as invoiceurl, TRUE as isconfirmed
            FROM supplies s JOIN customers c ON s.customer_id = c.id
            WHERE s.truck_id = @TruckId AND s.supply_date BETWEEN @Start AND @End";
        
        // Transloads (Outgoing)
        var transloadsOutSql = @"
            SELECT t.id, 'Transload (Out)' as type, 'To ' || dt.registration_number as title, t.quantity as quantity, 0 as value, t.status::text as status, t.transfer_date as date, NULL as invoiceurl, COALESCE(t.is_confirmed_by_receiver, FALSE) as isconfirmed
            FROM transloading t JOIN trucks dt ON t.destination_truck_id = dt.id
            WHERE t.source_truck_id = @TruckId AND t.transfer_date BETWEEN @Start AND @End";
    
        // Transloads (Incoming)
        var transloadsInSql = @"
            SELECT t.id, 'Transload (In)' as type, 'From ' || st.registration_number as title, t.quantity as quantity, 0 as value, t.status::text as status, t.transfer_date as date, NULL as invoiceurl, COALESCE(t.is_confirmed_by_receiver, FALSE) as isconfirmed
            FROM transloading t JOIN trucks st ON t.source_truck_id = st.id
            WHERE t.destination_truck_id = @TruckId AND t.transfer_date BETWEEN @Start AND @End";

        // Inward Loads
        var inwardLoadsSql = @"
            SELECT il.id, 'Company Load' as type, 'Ref: ' || COALESCE(il.remarks, 'Direct') as title, il.quantity as quantity, 0 as value, il.status::text as status, il.load_date as date, NULL as invoiceurl, TRUE as isconfirmed
            FROM inward_loads il
            WHERE il.truck_id = @TruckId AND il.load_date::date = @Today";

        var paramsObj = new { TruckId = truckId, Start = startOfToday, End = endOfToday, Today = startOfToday.Date };

        var sales = (await connection.QueryAsync<dynamic>(suppliesSql, paramsObj)).ToList();
        var transOut = (await connection.QueryAsync<dynamic>(transloadsOutSql, paramsObj)).ToList();
        var transIn = (await connection.QueryAsync<dynamic>(transloadsInSql, paramsObj)).ToList();
        var inward = (await connection.QueryAsync<dynamic>(inwardLoadsSql, paramsObj)).ToList();

        // Combine all logs for display
        var allCombined = sales
            .Concat(transOut)
            .Concat(transIn)
            .Concat(inward)
            .OrderByDescending(x => x.date)
            .ToList();

        // Map to expected frontend casing
        var logs = allCombined.Select(x => {
            var row = (IDictionary<string, object>)x;
            string statusValue = row.ContainsKey("status") ? row["status"]?.ToString() ?? "Pending" : "Pending";
            return new {
                Id = row.ContainsKey("id") ? (Guid)row["id"] : Guid.Empty,
                Type = row.ContainsKey("type") ? row["type"]?.ToString() ?? "Unknown" : "Unknown",
                Title = row.ContainsKey("title") ? row["title"]?.ToString() ?? "N/A" : "N/A",
                Quantity = row.ContainsKey("quantity") ? Convert.ToDecimal(row["quantity"] ?? 0) : 0m,
                Value = row.ContainsKey("value") ? Convert.ToDecimal(row["value"] ?? 0) : 0m,
                Status = statusValue,
                Date = row.ContainsKey("date") ? Convert.ToDateTime(row["date"]) : DateTime.MinValue,
                InvoiceUrl = row.ContainsKey("invoiceurl") ? row["invoiceurl"]?.ToString() : null,
                IsConfirmed = row.ContainsKey("isconfirmed") && Convert.ToBoolean(row["isconfirmed"] ?? false)
            };
        }).ToList();

        // Calculate today's metrics safely
        decimal todayIn = logs.Where(x => (x.Type.Contains("In") || x.Type.Contains("Load")) && x.Status != "Rejected")
                                .Sum(x => (decimal)x.Quantity);

        decimal todayOut = logs.Where(x => (x.Type == "Sale" || x.Type.Contains("Out")) && x.Status != "Rejected")
                                .Sum(x => (decimal)x.Quantity);

        decimal closingBalance = rollover + todayIn - todayOut;

        // Pending Transloads to Confirm (Receiving side ONLY)
        var pendingToConfirm = driverId != Guid.Empty ? await connection.QueryAsync<dynamic>(@"
            SELECT t.id as Id, 'Confirm Receive' as Type, 'From ' || st.registration_number as Title, quantity as Quantity, transfer_date as Date
            FROM transloading t JOIN trucks st ON t.source_truck_id = st.id
            WHERE t.receiving_driver_id = @DriverId AND t.is_confirmed_by_receiver = FALSE AND t.status = 'Pending'::approval_status", 
            new { DriverId = driverId }) : new List<dynamic>();

        var finalLogs = new List<dynamic>();
        if (rollover > 0)
        {
            finalLogs.Add(new
            {
                Id = Guid.Empty,
                Type = "Incoming (Rollover)",
                Title = "Rollover Load",
                Quantity = rollover,
                Value = 0m,
                Status = "Approved",
                Date = startOfToday,
                IsConfirmed = true
            });
        }
        
        finalLogs.AddRange(logs);

        return new
        {
            Date = startOfToday,
            Rollover = rollover,
            OpeningBalance = rollover,
            TotalInToday = todayIn,
            TotalOutToday = todayOut,
            ClosingBalance = closingBalance,
            AvailableLoad = closingBalance,
            Logs = finalLogs.OrderByDescending(x => x.Date).ToList(),
            PendingConfirmations = pendingToConfirm
        };
    }

    public async Task<IEnumerable<dynamic>> GetAdminDailyLogsAsync(DateTime date)
    {
        try 
        {
            using var connection = _connectionFactory.CreateConnection();
            var startOfDay = date.Date;
            var endOfDay = startOfDay.AddDays(1).AddTicks(-1);

            var trucks = await connection.QueryAsync<dynamic>(@"
                SELECT d.full_name as drivername, t.id as truckid, t.registration_number as truckreg, t.capacity 
                FROM drivers d 
                JOIN trucks t ON d.assigned_truck_id = t.id");
            
            var results = new List<dynamic>();
            foreach(var trk in trucks) {
                var rollover = await connection.ExecuteScalarAsync<decimal?>(@"
                    SELECT (
                        COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND load_date::date < @Date), 0) +
                        COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status != 'Rejected'::approval_status AND is_confirmed_by_receiver = TRUE AND transfer_date::date < @Date), 0) -
                        COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status != 'Rejected'::approval_status AND transfer_date::date < @Date), 0) -
                        COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND supply_date::date < @Date), 0)
                    )", new { TruckId = trk.truckid, Date = startOfDay.Date }) ?? 0;

                var todayIn = await connection.ExecuteScalarAsync<decimal?>(@"
                    SELECT (
                        COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND load_date::date = @Date), 0) +
                        COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status != 'Rejected'::approval_status AND is_confirmed_by_receiver = TRUE AND transfer_date::date = @Date), 0)
                    )", new { TruckId = trk.truckid, Date = startOfDay.Date }) ?? 0;

                 var todayOut = await connection.ExecuteScalarAsync<decimal?>(@"
                    SELECT (
                        COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND supply_date::date = @Date), 0) +
                        COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status != 'Rejected'::approval_status AND transfer_date::date = @Date), 0)
                    )", new { TruckId = trk.truckid, Date = startOfDay.Date }) ?? 0;

                results.Add(new {
                    TruckId = (Guid)trk.truckid,
                    DriverName = (string)trk.drivername,
                    TruckRegNumber = (string)trk.truckreg,
                    OpeningBalance = rollover,
                    TotalIn = todayIn,
                    TotalSupplies = todayOut,
                    ClosingBalance = rollover + todayIn - todayOut
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching admin daily logs for {Date}", date);
            throw;
        }
    }
    public async Task<decimal> GetTruckBalanceAsync(Guid truckId, DateTime asOfDate)
    {
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT (
                    COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND load_date::date <= @AsOf), 0) +
                    COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status != 'Rejected'::approval_status AND is_confirmed_by_receiver = TRUE AND transfer_date::date <= @AsOf), 0) -
                    COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status != 'Rejected'::approval_status AND transfer_date::date <= @AsOf), 0) -
                    COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status != 'Rejected'::approval_status AND supply_date::date <= @AsOf), 0)
                )";
            
            return await connection.ExecuteScalarAsync<decimal?>(sql, new { TruckId = truckId, AsOf = asOfDate }) ?? 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating truck balance for {TruckId}", truckId);
            return 0;
        }
    }
}
