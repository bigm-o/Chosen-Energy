# ⛽ Chosen Energy Operations Portal

An enterprise-grade operations management system custom-built for **Chosen Energy** to streamline diesel distribution, tanker fleet management, and sales tracking.

## 🚀 Features

- **Fleet Management**: Track tanker status, maintenance, and assigned drivers.
- **Inventory Tracking**: Real-time monitoring of fuel volumes (Inward Loads & Transloading).
- **Sales & Supply**: Digital invoice management and automated revenue calculation.
- **Driver Portal**: Simplified daily logging for drivers with volume verification.
- **Admin Dashboard**: Comprehensive analytics on revenue, growth, and pending approvals.
- **Security**: Role-based access control (Admin, MD, Driver, GarageManager) with JWT authentication.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS v4 + Radix UI
- **Visualization**: Recharts

### Backend
- **Engine**: .NET 8 Web API
- **Data Access**: Dapper ORM
- **Database**: PostgreSQL
- **Auth**: JWT + BCrypt Password Hashing

## 📦 Project Structure

```text
Chosen App/
├── frontend/              # Modern React Dashboard & Driver Portal
├── backend/               # High-performance .NET 8 API
├── database/              # PostgreSQL schema & migrations
└── ...                    # Configuration and Documentation
```

## 📖 Quick Start

### Prerequisites
- Node.js 18+ & npm
- .NET 8 SDK
- PostgreSQL 14+

### 1. Database Setup
```bash
# Update connection string in backend/ChosenEnergy.API/appsettings.json
# Then the application will automatically run migrations on startup
```

### 2. Backend Initialization
```bash
cd backend/ChosenEnergy.API
dotnet restore
dotnet run
```
_API runs at http://localhost:5100_

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```
_Frontend runs at http://localhost:3100_

## 🛡️ Security Protocol
- All pricing updates require **MD (Managing Director)** approval.
- Dual-confirmation required for fuel transfers (Transloading) between tankers.
- Audit logs for all critical system actions.

## 👥 Credits
- **Project Manager**: Morayo Fanu
- **Client**: Chosen Energy

---
*Built with ❤️ for Chosen Energy.*
