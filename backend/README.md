# Chosen Energy Operations Portal - Backend

.NET 8 Web API with Dapper ORM and PostgreSQL

## Setup

1. Install .NET 8 SDK
2. Install PostgreSQL
3. Update connection string in `appsettings.json`

## Run

```bash
cd ChosenEnergy.API
dotnet restore
dotnet run
```

Runs on http://localhost:5000

## Tech Stack

- .NET 8 Web API
- Dapper ORM
- PostgreSQL
- JWT Authentication
- BCrypt for password hashing
- Swagger/OpenAPI

## Project Structure

```
ChosenEnergy.API/
├── Controllers/       # API endpoints
├── Services/          # Business logic
├── Models/            # Domain models
├── DTOs/              # Data transfer objects
├── Data/              # Database access
├── Middleware/        # Custom middleware
└── Program.cs         # Application entry point
```
