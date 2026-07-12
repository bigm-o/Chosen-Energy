import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/app/pages/LoginPage';
import { DashboardPage } from '@/app/pages/DashboardPage';

import { PurchasingPage } from '@/app/pages/PurchasingPage';
import { SupplyPage } from '@/app/pages/SupplyPage';
import { DriversPage } from '@/app/pages/DriversPage';
import { CustomersPage } from '@/app/pages/CustomersPage';
import { TrucksPage } from '@/app/pages/TrucksPage';
import { DepotsPage } from '@/app/pages/DepotsPage';
import { DriverDailyLogPage } from '@/app/pages/DriverDailyLogPage';
import { ApprovalsPage } from '@/app/pages/ApprovalsPage';
import { TransloadingPage } from '@/app/pages/TransloadingPage';
import { AdminDailyLogsPage } from '@/app/pages/AdminDailyLogsPage';
import { MaintenancePage } from '@/app/pages/MaintenancePage';
import { InvoicesPage } from '@/app/pages/InvoicesPage';
import { ExpensesPage } from '@/app/pages/ExpensesPage';
import { DriverOnboardingPage } from '@/app/pages/DriverOnboardingPage';
import { InwardLoadsPage } from '@/app/pages/InwardLoadsPage';
import { SystemSettingsPage } from '@/app/pages/SystemSettingsPage';
import { DieselUsagePage } from '@/app/pages/DieselUsagePage';
import { SettingsPage } from '@/app/pages/SettingsPage';
import { CommunicationCenterPage } from '@/app/pages/CommunicationCenterPage';
import { UserManagementPage } from '@/app/pages/UserManagementPage';
import { Layout } from '@/app/components/Layout';

import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { hasPermission } from '@/utils/permissions';

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract page ID from path (e.g. "/dashboard" -> "dashboard")
  const currentPage = location.pathname.substring(1) || 'dashboard';

  const handlePageChange = (page: string) => {
    navigate(`/${page}`);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Driver role gets dedicated single-page interface
  if (user?.role === 'Driver') {
    return <DriverDailyLogPage />;
  }

  const PermissionGuard = ({ id, children }: { id: string, children: React.ReactNode }) => {
    if (hasPermission(user, id)) return <>{children}</>;
    return <Navigate to="/dashboard" replace />;
  };

  return (
    <Layout
      currentPage={currentPage}
      setCurrentPage={handlePageChange}
      userRole={user?.role || 'Admin'}
      userName={user?.fullName || 'User'}
      onLogout={logout}
      customPermissions={user?.customPermissions}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PermissionGuard id="view_dashboard"><DashboardPage /></PermissionGuard>} />

        <Route path="/purchasing" element={<PermissionGuard id="view_purchasing"><PurchasingPage /></PermissionGuard>} />
        <Route path="/supply" element={<PermissionGuard id="view_supply"><SupplyPage /></PermissionGuard>} />
        <Route path="/transloading" element={<PermissionGuard id="view_transloading"><TransloadingPage /></PermissionGuard>} />
        <Route path="/daily-logs" element={<PermissionGuard id="view_daily_logs"><AdminDailyLogsPage /></PermissionGuard>} />
        <Route path="/approvals" element={<PermissionGuard id="view_approvals"><ApprovalsPage /></PermissionGuard>} />
        <Route path="/drivers" element={<PermissionGuard id="view_drivers"><DriversPage /></PermissionGuard>} />
        <Route path="/customers" element={<PermissionGuard id="view_customers"><CustomersPage /></PermissionGuard>} />
        <Route path="/trucks" element={<PermissionGuard id="view_trucks"><TrucksPage /></PermissionGuard>} />
        <Route path="/maintenance" element={<PermissionGuard id="view_maintenance"><MaintenancePage /></PermissionGuard>} />
        <Route path="/diesel-usage" element={<PermissionGuard id="view_diesel_usage"><DieselUsagePage /></PermissionGuard>} />
        <Route path="/depots" element={<PermissionGuard id="view_depots"><DepotsPage /></PermissionGuard>} />
        <Route path="/invoices" element={<PermissionGuard id="view_invoices"><InvoicesPage /></PermissionGuard>} />
        <Route path="/expenses" element={<PermissionGuard id="view_expenses"><ExpensesPage /></PermissionGuard>} />
        <Route path="/driver-onboarding" element={<PermissionGuard id="view_driver_onboarding"><DriverOnboardingPage /></PermissionGuard>} />
        <Route path="/communication" element={<PermissionGuard id="view_communication"><CommunicationCenterPage /></PermissionGuard>} />
        <Route path="/inward-loads" element={<PermissionGuard id="view_inward_loads"><InwardLoadsPage /></PermissionGuard>} />
        <Route path="/global-settings" element={<PermissionGuard id="view_settings"><SettingsPage /></PermissionGuard>} />
        <Route path="/system" element={<PermissionGuard id="view_user_management"><SystemSettingsPage /></PermissionGuard>} />
        <Route path="/user-management" element={<PermissionGuard id="view_user_management"><UserManagementPage /></PermissionGuard>} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3000}
      />
    </AuthProvider>
  );
}
