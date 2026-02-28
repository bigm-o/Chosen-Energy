import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, AlertCircle, Fuel, Truck, Users, CheckCircle, Clock } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Link } from 'react-router-dom';

interface DashboardData {
    stats: {
        totalRevenue: number;
        totalVolume: number;
        activeTrucks: number;
        pendingApprovals: number;
        monthlyRevenueGrowth: number;
    };
    revenueChart: { date: string; revenue: number }[];
    recentActivity: { action: string; description: string; user: string; timestamp: string }[];
    pendingItems: { id: string; type: string; reference: string; description: string; status: string; createdAt: string }[];
}

export function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiRequest('/api/dashboard');
            const result = await response.json();
            if (response.ok) {
                setData(result.data);
            }
        } catch (err) {
            console.error('Error fetching dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading dashboard...</div>;
    if (!data) return <div className="p-6 text-center text-red-600">Failed to load dashboard data.</div>;

    const { stats, revenueChart, pendingItems } = data;

    // Calculate chart max for scaling
    const maxRevenue = Math.max(...revenueChart.map(d => d.revenue), 1000);

    return (
        <div className="space-y-6">
            {/* Greeting Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{getGreeting()}, {user?.fullName?.split(' ')[0] || 'User'}! 👋</h1>
                <p className="text-gray-600 mt-1">Here's what's happening with your operations today</p>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Volume */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Volume (Approved)</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalVolume.toLocaleString()} L</p>
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Updated just now
                            </p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Fuel className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Revenue (Approved)</p>
                            <p className="text-2xl font-bold text-gray-900">₦{(stats.totalRevenue / 1000000).toFixed(2)}M</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${stats.monthlyRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stats.monthlyRevenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {stats.monthlyRevenueGrowth.toFixed(1)}% vs last month
                            </p>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* Active Trucks */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Active Trucks</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.activeTrucks}</p>
                            <p className="text-xs text-gray-500 mt-1">Operational Fleet</p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-lg">
                            <Truck className="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>
                </div>

                {/* Pending Approvals */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Pending Approvals</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Requires attention
                            </p>
                        </div>
                        <div className="bg-orange-50 p-2 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Items Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Revenue Trend (Last 7 Days)</h3>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 border-b border-gray-100 pb-2">
                        {revenueChart.map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div
                                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all duration-300 relative group-hover:scale-105"
                                    style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                        ₦{item.revenue.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 font-medium">{item.date.split('-')[2]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Items List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Pending Actions</h3>
                        <Link to={user?.role === 'Admin' || user?.role === 'MD' ? "/purchasing" : "#"} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</Link>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {pendingItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                <CheckCircle className="w-12 h-12 mb-3 text-gray-200" />
                                <p>All caught up! No pending actions.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${item.type === 'Purchase' ? 'bg-blue-100 text-blue-600' : item.type === 'Maintenance' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.type === 'Purchase' ? <Fuel className="w-4 h-4" /> : item.type === 'Maintenance' ? <AlertCircle className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900 text-sm">{item.type} Request</span>
                                                    <span className="text-xs text-gray-400">• {new Date(item.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{item.reference} • {item.description}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={item.type === 'Purchase' ? '/purchasing' : item.type === 'Maintenance' ? '/trucks' : '/supply'}
                                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                                        >
                                            Review
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                    <strong>Dashboard Status:</strong> Total Revenue and Volume metrics now reflect real Approved Supply data. Active Trucks count is live. Charts show real revenue data for the last 7 days.
                </p>
            </div>
        </div>
    );
}
