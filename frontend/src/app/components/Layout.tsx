import { ReactNode, useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { TopBar } from '@/app/components/TopBar';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  userRole: string;
  userName: string;
  onLogout: () => void;
}

export function Layout({ children, currentPage, setCurrentPage, userRole, userName, onLogout }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={(page) => {
          setCurrentPage(page);
          setMobileMenuOpen(false); // Close on selection on mobile
        }}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <TopBar
          userRole={userRole}
          userName={userName}
          onLogout={onLogout}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
