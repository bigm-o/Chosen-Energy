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
import { SystemSettingsPage } from '@/app/pages/SystemSettingsPage';
import { InwardLoadsPage } from '@/app/pages/InwardLoadsPage';
import { SettingsPage } from '@/app/pages/SettingsPage';
import { CommunicationCenterPage } from '@/app/pages/CommunicationCenterPage';
import { Layout } from '@/app/components/Layout';

import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

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

  return (
    <Layout
      currentPage={currentPage}
      setCurrentPage={handlePageChange}
      userRole={user?.role || 'Admin'}
      userName={user?.fullName || 'User'}
      onLogout={logout}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/purchasing" element={<PurchasingPage />} />
        <Route path="/supply" element={<SupplyPage />} />
        <Route path="/transloading" element={<TransloadingPage />} />
        <Route path="/daily-logs" element={<AdminDailyLogsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/trucks" element={<TrucksPage />} />
        <Route path="/depots" element={<DepotsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/driver-onboarding" element={<DriverOnboardingPage />} />
        <Route path="/communication" element={<CommunicationCenterPage />} />
        <Route path="/inward-loads" element={<InwardLoadsPage />} />
        <Route path="/global-settings" element={<SettingsPage />} />
        <Route path="/system" element={<SystemSettingsPage />} />
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
