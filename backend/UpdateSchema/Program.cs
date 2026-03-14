using System;
using System.Data;
using System.Threading.Tasks;
using Npgsql;
using Dapper;

class Program
{
    static async Task Main()
    {
        var connectionString = "Host=aws-1-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.euymackmbjefkcwyzagq;Password=ChosenEnergy1!2@3#4$;SSL Mode=Require;Trust Server Certificate=true";
        using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        var sql = "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light';";
        try {
            await connection.ExecuteAsync(sql);
            Console.WriteLine("Added theme_preference to users table.");
        } catch(Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
        }
    }
}
