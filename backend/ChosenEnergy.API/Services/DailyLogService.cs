using ChosenEnergy.API.Data;
using ChosenEnergy.API.Models;
using Dapper;

namespace ChosenEnergy.API.Services;

public interface IDailyLogService
{
    Task<dynamic> GetDriverDailyLogAsync(Guid userId, DateTime date);
    Task<IEnumerable<dynamic>> GetAdminDailyLogsAsync(DateTime date);
}

public class DailyLogService : IDailyLogService
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DailyLogService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<dynamic> GetDriverDailyLogAsync(Guid userId, DateTime date)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        // 1. Get Driver and their assigned truck
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

        Guid driverId = driverInfo.driverid;
        Guid truckId = driverInfo.truckid;

        // 2. Calculate Rollover (Balance from all previous days)
        var startOfToday = date.Date;

        var rolloverSql = @"
            SELECT (
                COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status = 'Approved' AND load_date < @Today), 0) +
                COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status = 'Approved' AND is_confirmed_by_receiver = TRUE AND transfer_date < @Today), 0) -
                COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status = 'Approved' AND is_confirmed_by_receiver = TRUE AND transfer_date < @Today), 0) -
                COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status = 'Approved' AND supply_date < @Today), 0)
            )";
        
        decimal rollover = await connection.ExecuteScalarAsync<decimal?>(rolloverSql, new { TruckId = truckId, Today = startOfToday }) ?? 0;

        // 3. Today's Activities
        var endOfToday = startOfToday.AddDays(1).AddTicks(-1);

        // Sales (Supplies) - Explicitly add isconfirmed as true for non-transload entries
        var suppliesSql = @"
            SELECT id, 'Sale' as type, c.company_name as title, quantity as quantity, total_amount as value, status::text as status, supply_date as date, invoice_url as invoiceurl, TRUE as isconfirmed
            FROM supplies s JOIN customers c ON s.customer_id = c.id
            WHERE s.truck_id = @TruckId AND s.supply_date BETWEEN @Start AND @End";
        
        // Transloads (Outgoing)
        var transloadsOutSql = @"
            SELECT t.id, 'Transload (Out)' as type, 'To ' || dt.registration_number as title, quantity as quantity, 0 as value, status::text as status, transfer_date as date, NULL as invoiceurl, COALESCE(is_confirmed_by_receiver, FALSE) as isconfirmed
            FROM transloading t JOIN trucks dt ON t.destination_truck_id = dt.id
            WHERE t.source_truck_id = @TruckId AND t.transfer_date BETWEEN @Start AND @End";
 
        // Transloads (Incoming)
        var transloadsInSql = @"
            SELECT t.id, 'Transload (In)' as type, 'From ' || st.registration_number as title, quantity as quantity, 0 as value, status::text as status, transfer_date as date, NULL as invoiceurl, COALESCE(is_confirmed_by_receiver, FALSE) as isconfirmed
            FROM transloading t JOIN trucks st ON t.source_truck_id = st.id
            WHERE t.destination_truck_id = @TruckId AND t.transfer_date BETWEEN @Start AND @End";

        // Inward Loads
        var inwardLoadsSql = @"
            SELECT id, 'Company Load' as type, 'Ref: ' || COALESCE(remarks, 'Direct') as title, quantity as quantity, 0 as value, status::text as status, load_date as date, NULL as invoiceurl, TRUE as isconfirmed
            FROM inward_loads
            WHERE truck_id = @TruckId AND load_date BETWEEN @Start AND @End";

        var paramsObj = new { TruckId = truckId, Start = startOfToday, End = endOfToday };

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
        var logs = allCombined.Select(x => new {
            Id = x.id,
            Type = x.type,
            Title = x.title,
            Quantity = Convert.ToDecimal(x.quantity),
            Value = Convert.ToDecimal(x.value),
            Status = x.status,
            Date = x.date,
            InvoiceUrl = x.invoiceurl,
            IsConfirmed = (bool)x.isconfirmed
        }).ToList();

        // Calculate today's metrics safely
        decimal todayIn = inward.Where(x => x.status == "Approved").Sum(x => Convert.ToDecimal(x.quantity)) + 
                          transIn.Where(x => x.status == "Approved" && x.isconfirmed == true).Sum(x => Convert.ToDecimal(x.quantity));
        
        decimal todayOut = sales.Where(x => x.status == "Approved").Sum(x => Convert.ToDecimal(x.quantity)) + 
                           transOut.Where(x => x.status == "Approved" && x.isconfirmed == true).Sum(x => Convert.ToDecimal(x.quantity));

        decimal closingBalance = rollover + todayIn - todayOut;

        // Pending Transloads to Confirm (Receiving side ONLY)
        var pendingToConfirm = await connection.QueryAsync<dynamic>(@"
            SELECT t.id as Id, 'Confirm Receive' as Type, 'From ' || st.registration_number as Title, quantity as Quantity, transfer_date as Date
            FROM transloading t JOIN trucks st ON t.source_truck_id = st.id
            WHERE t.receiving_driver_id = @DriverId AND t.is_confirmed_by_receiver = FALSE AND t.status = 'Pending'::approval_status", 
            new { DriverId = driverId });

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
            TotalSupplies = sales.Where(x => x.status == "Approved").Sum(x => Convert.ToDecimal(x.quantity)),
            ClosingBalance = closingBalance,
            AvailableLoad = closingBalance,
            Logs = finalLogs.OrderByDescending(x => x.Date).ToList(),
            PendingConfirmations = pendingToConfirm
        };
    }

    public async Task<IEnumerable<dynamic>> GetAdminDailyLogsAsync(DateTime date)
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
                    COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status = 'Approved' AND load_date < @Date), 0) +
                    COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status = 'Approved' AND is_confirmed_by_receiver = TRUE AND transfer_date < @Date), 0) -
                    COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status = 'Approved' AND is_confirmed_by_receiver = TRUE AND transfer_date < @Date), 0) -
                    COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status = 'Approved' AND supply_date < @Date), 0)
                )", new { TruckId = trk.truckid, Date = startOfDay }) ?? 0;

            var todayIn = await connection.ExecuteScalarAsync<decimal?>(@"
                SELECT (
                    COALESCE((SELECT SUM(quantity) FROM inward_loads WHERE truck_id = @TruckId AND status = 'Approved' AND load_date BETWEEN @Start AND @End), 0) +
                    COALESCE((SELECT SUM(quantity) FROM transloading WHERE destination_truck_id = @TruckId AND status = 'Approved' AND is_confirmed_by_receiver = TRUE AND transfer_date BETWEEN @Start AND @End), 0)
                )", new { TruckId = trk.truckid, Start = startOfDay, End = endOfDay }) ?? 0;

             var todayOut = await connection.ExecuteScalarAsync<decimal?>(@"
                SELECT (
                    COALESCE((SELECT SUM(quantity) FROM supplies WHERE truck_id = @TruckId AND status = 'Approved' AND supply_date BETWEEN @Start AND @End), 0) +
                    COALESCE((SELECT SUM(quantity) FROM transloading WHERE source_truck_id = @TruckId AND status = 'Approved' AND is_confirmed_by_receiver = TRUE AND transfer_date BETWEEN @Start AND @End), 0)
                )", new { TruckId = trk.truckid, Start = startOfDay, End = endOfDay }) ?? 0;

            results.Add(new {
                DriverName = (string)trk.drivername,
                TruckRegNumber = (string)trk.truckreg,
                OpeningBalance = rollover,
                TotalIn = todayIn,
                TotalOut = todayOut,
                ClosingBalance = rollover + todayIn - todayOut
            });
        }

        return results;
    }
}
