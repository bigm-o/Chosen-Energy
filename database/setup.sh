#!/bin/bash

# Chosen Energy Database Setup Script

echo "🚀 Setting up Chosen Energy Database..."

# Database configuration
DB_NAME="chosen_energy_db"
DB_USER=$(whoami)

echo "📦 Creating database: $DB_NAME (user: $DB_USER)"
psql -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"

echo "📝 Running migrations..."
psql -d $DB_NAME -f migrations/001_initial_schema.sql

echo "✅ Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend connection string in: backend/ChosenEnergy.API/appsettings.json"
echo "   Use: Host=localhost;Port=5432;Database=chosen_energy_db;Username=$DB_USER"
echo "2. Run backend: cd backend/ChosenEnergy.API && dotnet run"
echo "3. Run frontend: cd frontend && npm install && npm run dev"
echo ""
echo "🔐 Default admin credentials:"
echo "   Email: admin@chosenenergy.com"
echo "   Password: Admin@123"
