import { Bell, Search, User, LogOut, Menu, Check, Sun, Moon, LayoutDashboard, Truck, ClipboardList, ShoppingCart, Users, MapPin, CheckCircle, Fuel, Package, TrendingUp, HelpCircle, ArrowRightLeft, Activity, Clock, AlertCircle, CreditCard, Star, DollarSign } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl: string;
  createdAt: string;
}

interface SearchableItem {
  title: string;
  description: string;
  category: 'Page' | 'Feature' | 'Analytics' | 'Section';
  path: string;
  anchor?: string;
  icon: any;
  keywords: string[];
}

const SEARCH_ITEMS: SearchableItem[] = [
  // --- Pages ---
  { title: 'Dashboard', description: 'Overview of operations and main stats', category: 'Page', path: '/', icon: LayoutDashboard, keywords: ['home', 'main', 'overview', 'stats'] },
  { title: 'Transloading', description: 'Manage truck loading and activities', category: 'Page', path: '/transloading', icon: ArrowRightLeft, keywords: ['loading', 'trucks', 'activity', 'operations'] },
  { title: 'Admin Daily Logs', description: 'Review and audit driver daily logs', category: 'Page', path: '/admin-daily-logs', icon: ClipboardList, keywords: ['logs', 'driver', 'audit', 'daily'] },
  { title: 'Purchasing', description: 'Manage fuel purchases and inward loads', category: 'Page', path: '/purchasing', icon: ShoppingCart, keywords: ['buy', 'fuel', 'inward', 'purchase'] },
  { title: 'Sales & Supply', description: 'Track customer supplies and sales', category: 'Page', path: '/sales', icon: Package, keywords: ['sell', 'sales', 'supply', 'customer'] },
  { title: 'Driver Management', description: 'Manage driver profiles and assignments', category: 'Page', path: '/drivers', icon: Users, keywords: ['staff', 'drivers', 'assign', 'team'] },
  { title: 'Truck Management', description: 'Manage fleet inventory and status', category: 'Page', path: '/trucks', icon: Truck, keywords: ['fleet', 'trucks', 'vehicles', 'inventory'] },
  { title: 'Customers', description: 'Client records and history', category: 'Page', path: '/customers', icon: User, keywords: ['clients', 'buyers', 'crm', 'history'] },
  { title: 'Depot Management', description: 'Storage locations and stock monitoring', category: 'Page', path: '/depots', icon: MapPin, keywords: ['storage', 'inventory', 'warehouse', 'stock'] },
  { title: 'Approvals', description: 'Review pending requests and actions', category: 'Page', path: '/approvals', icon: CheckCircle, keywords: ['confirm', 'review', 'pending', 'authorize'] },

  // --- Dashboard Sections ---
  { title: 'Revenue Analytics', description: 'Detailed chart of revenue trends', category: 'Analytics', path: '/', anchor: 'revenue-chart', icon: TrendingUp, keywords: ['money', 'income', 'chart', 'profit'] },
  { title: 'Operations Trend', description: 'Daily count of supplies and purchases', category: 'Analytics', path: '/', anchor: 'ops-chart', icon: Activity, keywords: ['trend', 'activity', 'daily', 'stats'] },
  { title: 'Pending Items', description: 'Tasks requiring your immediate attention', category: 'Section', path: '/', anchor: 'pending-items', icon: AlertCircle, keywords: ['todo', 'tasks', 'waiting', 'approvals'] },

  // --- Transloading Sections ---
  { title: 'Active Transloads', description: 'Currently running truck-to-truck transfers', category: 'Section', path: '/transloading', anchor: 'active-transloads', icon: ArrowRightLeft, keywords: ['running', 'current', 'transfer'] },
  { title: 'Transload History', description: 'Past transloading records', category: 'Section', path: '/transloading', anchor: 'active-transloads', icon: ClipboardList, keywords: ['past', 'history', 'old'] },

  // --- Purchasing & Supply Sections ---
  { title: 'Audit Logs (Daily)', description: 'Daily driver reports and trip logs', category: 'Section', path: '/admin-daily-logs', anchor: 'audit-logs', icon: Search, keywords: ['reports', 'audit', 'daily'] },
  { title: 'Supply History', description: 'Past supplies to customers', category: 'Section', path: '/sales', anchor: 'supply-history', icon: Package, keywords: ['past sales', 'supply records'] },

  // --- Management —-
  { title: 'License Tracking', description: 'Expiry dates and driver documents', category: 'Feature', path: '/drivers', anchor: 'license-tracking', icon: CreditCard, keywords: ['expiry', 'license', 'docs', 'renew'] },
  { title: 'Driver Ratings', description: 'Performance and feedback metrics', category: 'Feature', path: '/drivers', anchor: 'driver-ratings', icon: Star, keywords: ['performance', 'star', 'feedback'] },
  { title: 'Truck Maintenance', description: 'Scheduled services and repair logs', category: 'Feature', path: '/maintenance', anchor: 'log-maintenance', icon: Fuel, keywords: ['repair', 'service', 'trucks'] },
  { title: 'Customer Balances', description: 'Outstanding payments and credit', category: 'Feature', path: '/customers', anchor: 'customer-balances', icon: DollarSign, keywords: ['debt', 'credit', 'money', 'payment'] },

  // --- Actions ---
  { title: 'Add New Driver', description: 'Register a new driver to the system', category: 'Feature', path: '/driver-onboarding', icon: Users, keywords: ['create', 'new', 'driver', 'staff'] },
  { title: 'Add New Truck', description: 'Register a new vehicle to the fleet', category: 'Feature', path: '/trucks', icon: Truck, keywords: ['new truck', 'add vehicle'] },
  { title: 'Log New Maintenance', description: 'Record truck maintenance activity', category: 'Feature', path: '/maintenance', anchor: 'log-maintenance', icon: Fuel, keywords: ['repair', 'service', 'trucks', 'maintenance'] },
  { title: 'Export Reports', description: 'Download data in CSV format', category: 'Feature', path: '/purchasing', anchor: 'export-purchases', icon: Package, keywords: ['download', 'excel', 'csv', 'report'] },
];

interface TopBarProps {
  userRole: string;
  userName: string;
  onLogout: () => void;
  onMenuClick: () => void;
}

export function TopBar({ userRole, userName, onLogout, onMenuClick }: TopBarProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, updateTheme } = useAuth();
  const navigate = useNavigate();

  const isDarkMode = user?.themePreference === 'dark';

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredSearch = searchQuery.trim() === '' ? [] : SEARCH_ITEMS.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (e) { console.error('Error fetching notifications:', e); }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const handleSearchSelect = (item: SearchableItem) => {
    navigate(item.path);
    if (item.anchor) {
      setTimeout(() => {
        const element = document.getElementById(item.anchor!);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-4');
          setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-4'), 2000);
        }
      }, 500);
    }
    setSearchQuery('');
    setShowSearchSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredSearch.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        handleSearchSelect(filteredSearch[selectedIndex]);
      } else if (filteredSearch.length > 0) {
        handleSearchSelect(filteredSearch[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSearchSuggestions(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, searchRef]);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-4 transition-colors sticky top-0 z-40">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      <div className="flex items-center gap-4 flex-1">
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search pages, features, guides..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-900 transition-all font-medium"
          />

          {/* Search Suggestions */}
          {showSearchSuggestions && filteredSearch.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredSearch.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSearchSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-100 dark:ring-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        selectedIndex === index ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold truncate ${selectedIndex === index ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {item.title}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-2 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Universal Search</p>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-white dark:bg-gray-800 border dark:border-gray-700 px-1.5 py-0.5 rounded shadow-sm">
                    <span className="font-sans">⏎</span> Select
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-white dark:bg-gray-800 border dark:border-gray-700 px-1.5 py-0.5 rounded shadow-sm">
                    <span className="font-sans">↕</span> Navigate
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => updateTheme(isDarkMode ? 'light' : 'dark')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-gray-300" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
            )}
          </button>

          {showDropdown && (
            <div className="fixed sm:absolute top-16 sm:top-full right-4 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold uppercase tracking-wider">
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Bell className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!notification.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      >
                        <Link
                          to={notification.actionUrl || '#'}
                          onClick={() => {
                            if (!notification.isRead) markAsRead(notification.id);
                            setShowDropdown(false);
                          }}
                          className="flex flex-col gap-1"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{notification.title}</span>
                            {!notification.isRead && <span className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{notification.message}</span>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-2 tracking-tight">{new Date(notification.createdAt).toLocaleDateString()}</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-3 sm:border-l dark:border-gray-800">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none order-2 sm:order-1">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-left hidden lg:block order-2">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none mb-1">{userName}</div>
            <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">{userRole}</div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:text-gray-500 rounded-lg transition-all order-3"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
