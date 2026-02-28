# Database Setup

## PostgreSQL Installation

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Windows
Download from https://www.postgresql.org/download/windows/

### Linux
```bash
sudo apt-get install postgresql postgresql-contrib
```

## Create Database

```bash
psql -U postgres
```

```sql
CREATE DATABASE chosen_energy_db;
\c chosen_energy_db
```

## Run Migrations

Execute SQL files in order:
```bash
psql -U postgres -d chosen_energy_db -f migrations/001_initial_schema.sql
```

## Connection String

Update in `backend/ChosenEnergy.API/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=chosen_energy_db;Username=postgres;Password=your_password"
}
```

## Backup Strategy

```bash
# Backup
pg_dump -U postgres chosen_energy_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres chosen_energy_db < backup_20260120.sql
```
