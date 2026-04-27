import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  CheckCircle,
  Fuel,
  Package,
  Wrench,
  MapPin,
  UserPlus,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  X,

} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  userRole: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ currentPage, setCurrentPage, userRole, collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['operations', 'fleet', 'finance']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const menuStructure = [
    {
      section: 'MAIN',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          roles: ['MD', 'Admin', 'GarageManager'],
        },

      ],
    },
    {
      section: 'OPERATIONS',
      sectionId: 'operations',
      expandable: true,
      items: [
        {
          id: 'purchasing',
          label: 'Purchasing',
          icon: ShoppingCart,
          roles: ['MD', 'Admin'],
        },
        {
          id: 'supply',
          label: 'Sales & Supply',
          icon: Fuel,
          roles: ['MD', 'Admin'],
        },
        {
          id: 'transloading',
          label: 'Trans-loading',
          icon: Package,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
        {
          id: 'daily-logs',
          label: 'Daily Logs',
          icon: FileText,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
      ],
    },
    {
      section: null,
      items: [
        {
          id: 'approvals',
          label: 'Approvals',
          icon: CheckCircle,
          roles: ['MD', 'Admin'],
        },
        {
          id: 'inward-loads',
          label: 'Disbursements',
          icon: Fuel,
          roles: ['MD', 'Admin'],
        },
      ],
    },
    {
      section: 'FLEET MANAGEMENT',
      sectionId: 'fleet',
      expandable: true,
      items: [
        {
          id: 'trucks',
          label: 'Truck Management',
          icon: Truck,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
        {
          id: 'drivers',
          label: 'Driver Management',
          icon: Users,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
        {
          id: 'driver-onboarding',
          label: 'Driver Onboarding',
          icon: UserPlus,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
        {
          id: 'maintenance',
          label: 'Truck Maintenance',
          icon: Wrench,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
        {
          id: 'diesel-usage',
          label: 'Diesel Usage',
          icon: Fuel,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
      ],
    },
    {
      section: null,
      items: [
        {
          id: 'customers',
          label: 'Customers',
          icon: Users,
          roles: ['MD', 'Admin'],
        },
        {
          id: 'depots',
          label: 'Depots',
          icon: MapPin,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
      ],
    },
    {
      section: 'FINANCE & DOCUMENTS',
      sectionId: 'finance',
      expandable: true,
      items: [
        {
          id: 'invoices',
          label: 'Invoices',
          icon: FileText,
          roles: ['MD', 'Admin'],
        },
        {
          id: 'expenses',
          label: 'Expenses',
          icon: DollarSign,
          roles: ['MD', 'Admin'],
        },
      ],
    },
    {
      section: null,
      items: [
        {
          id: 'communication',
          label: 'Communication',
          icon: MessageSquare,
          roles: ['MD', 'Admin', 'GarageManager'],
        },
        {
          id: 'user-management',
          label: 'User Management',
          icon: Settings,
          roles: ['Admin', 'MD'],
        },
        {
          id: 'global-settings',
          label: 'Fixed Diesel Price',
          icon: DollarSign,
          roles: ['MD', 'Admin'],
        },
      ],
    },
  ];

  return (
    <div className={`
      bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300
      md:relative md:h-screen z-50
      ${mobileOpen ? 'fixed inset-0 w-full' : 'hidden md:flex'}
      ${collapsed ? 'md:w-16' : 'md:w-64'}
    `}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-800 flex items-center justify-between">
        {(!collapsed || mobileOpen) && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
              CE
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">Chosen Energy</span>
          </div>
        )}

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:block p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        {menuStructure.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            {group.section && !collapsed && (
              <div className="px-4 mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {group.section}
                </span>
                {group.expandable && (
                  <button
                    onClick={() => toggleSection(group.sectionId!)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${expandedSections.includes(group.sectionId!) ? '' : '-rotate-90'
                        }`}
                    />
                  </button>
                )}
              </div>
            )}

            {(!group.expandable || expandedSections.includes(group.sectionId || '')) &&
              group.items
                .filter((item) => item.roles.includes(userRole))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-800'
                        } ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? item.label : ''}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </button>
                  );
                })}
          </div>
        ))}
      </div>
    </div>
  );
}
