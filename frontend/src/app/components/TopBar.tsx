import { Bell, Search, User, LogOut, Menu, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/utils/api';
import { Link } from 'react-router-dom';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl: string;
  createdAt: string;
}

interface TopBarProps {
  userRole: string;
  userName: string;
  onLogout: () => void;
  onMenuClick: () => void;
}

export function TopBar({ userRole, userName, onLogout, onMenuClick }: TopBarProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-4 flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
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
                            <span className="text-sm font-bold text-gray-900 line-clamp-1">{notification.title}</span>
                            {!notification.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5" />}
                          </div>
                          <span className="text-xs text-gray-600 line-clamp-2">{notification.message}</span>
                          <span className="text-[10px] text-gray-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-sm font-medium text-gray-900">{userName}</div>
            <div className="text-xs text-gray-500">{userRole}</div>
          </div>
          <button
            onClick={onLogout}
            className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
