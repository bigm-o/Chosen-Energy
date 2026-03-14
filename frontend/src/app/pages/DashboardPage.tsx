import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    TrendingUp, TrendingDown, AlertCircle, Fuel, Truck, Users,
    CheckCircle, Clock, DollarSign, Activity, Package, UserCheck,
    BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Link } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

interface DashboardData {
    stats: {
        totalRevenue: number;
        totalVolume: number;
        activeTrucks: number;
        pendingApprovals: number;
        monthlyRevenueGrowth: number;
        totalPurchasesCost: number;
        grossProfit: number;
        inwardLoadVolume: number;
        transloadVolume: number;
        activeDrivers: number;
        totalCustomers: number;
    };
    revenueChart: { date: string; revenue: number }[];
    volumeChart: { date: string; supplyVolume: number; inwardVolume: number }[];
    topCustomers: { name: string; revenue: number; volume: number }[];
    depotPerformance: { depotName: string; volume: number }[];
    truckStatusDistribution: { status: string; count: number }[];
    operationsChart: { date: string; supplies: number; purchases: number; transloads: number }[];
    recentActivity: { action: string; description: string; user: string; timestamp: string }[];
    pendingItems: { id: string; type: string; reference: string; description: string; status: string; createdAt: string }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#EF4444'];

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

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!data) return <div className="p-6 text-center text-red-600 dark:text-red-400">Failed to load dashboard data.</div>;

    const {
        stats, revenueChart, volumeChart, operationsChart,
        topCustomers, depotPerformance, truckStatusDistribution, pendingItems
    } = data;

    const formatCurrency = (val: number) => `₦${(val / 1000000).toFixed(2)}M`;
    const formatVol = (val: number) => `${val.toLocaleString()} L`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{getGreeting()}, {user?.fullName?.split(' ')[0] || 'Executive'}! 👋</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Here is the comprehensive overview of your operations today.</p>
            </div>

            {/* Main KPIs List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.totalRevenue)}</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${stats.monthlyRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stats.monthlyRevenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {stats.monthlyRevenueGrowth.toFixed(1)}% vs last month
                            </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gross Profit</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.grossProfit)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Revenue minus Purchases</p>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-lg"><Activity className="w-5 h-5 text-emerald-600" /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Volume Sold</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatVol(stats.totalVolume)}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total Approved Supplies</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg"><Fuel className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Inward Load</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatVol(stats.inwardLoadVolume)}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Total Approved Receipts</p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-lg"><Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                    </div>
                </div>
            </div>

            {/* Secondary KPIs Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Approvals</p>
                    <p className="text-xl font-bold text-orange-600 flex items-center gap-2">
                        {stats.pendingApprovals} <AlertCircle className="w-4 h-4" />
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Trucks</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {stats.activeTrucks} <Truck className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Drivers</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {stats.activeDrivers} <UserCheck className="w-4 h-4 text-green-500" />
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Customers</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {stats.totalCustomers} <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transloaded Volume</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {formatVol(stats.transloadVolume)} <Activity className="w-4 h-4 text-pink-500" />
                    </p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div id="revenue-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                            Revenue Trend (Last 7 Days)
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChart}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${val / 1000000}M`} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderColor: '#374151' }} itemStyle={{ color: '#fff' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Volume Flow */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Inward vs Outward Volume
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={volumeChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip formatter={(value: number) => `${value.toLocaleString()} L`} contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderColor: '#374151' }} itemStyle={{ color: '#fff' }} />
                                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                                <Bar dataKey="inwardVolume" name="Inward (Received)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="supplyVolume" name="Outward (Supplied)" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Operations Chart */}
                <div id="ops-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                            Daily Operations Activity (Transactions)
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={operationsChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderColor: '#374151' }} itemStyle={{ color: '#fff' }} />
                                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                                <Area type="monotone" dataKey="supplies" name="Supplies" stackId="1" stroke="#10b981" fill="#10b981" />
                                <Area type="monotone" dataKey="purchases" name="Purchases" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                                <Area type="monotone" dataKey="transloads" name="Transloads" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Truck Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                            Fleet Status Status
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={truckStatusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="status"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {truckStatusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderColor: '#374151' }} itemStyle={{ color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Customers */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Customers (Revenue)</h3>
                    <div className="space-y-4">
                        {topCustomers.map((cust, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{cust.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{cust.volume.toLocaleString()} L</p>
                                </div>
                                <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">₦{(cust.revenue / 1000000).toFixed(1)}M</span>
                            </div>
                        ))}
                        {topCustomers.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No customer data available.</p>}
                    </div>
                </div>

                {/* Depot Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Depot Intake</h3>
                    <div className="space-y-4">
                        {depotPerformance.map((depot, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{depot.depotName}</p>
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm">{depot.volume.toLocaleString()} L</span>
                            </div>
                        ))}
                        {depotPerformance.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No depot data available.</p>}
                    </div>
                </div>

                {/* Pending Items */}
                <div id="pending-items" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            Pending Actions
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {pendingItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <CheckCircle className="w-8 h-8 mb-2 text-gray-200" />
                                <p className="text-sm">No pending actions.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingItems.map((item) => (
                                    <div key={item.id} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.type}</span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.reference}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{item.status}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
