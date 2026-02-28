import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { FileText, Search, Filter, Eye, User, Calendar, Fuel, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { toast } from 'sonner';

interface DailyLogEntry {
    driverName: string;
    truckRegNumber: string;
    openingBalance: number;
    totalSupplies: number;
    closingBalance: number;
}

export function AdminDailyLogsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [date, setDate] = useState(new Date());
    const [logs, setLogs] = useState<DailyLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [date]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const response = await apiRequest(`/api/daily-logs/${dateStr}`);
            const data = await response.json();
            setLogs(data.data || []);
        } catch (err) {
            toast.error("Failed to load daily logs");
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.truckRegNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        logsToday: logs.length,
        totalLitres: logs.reduce((sum, l) => sum + l.totalSupplies, 0)
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Driver Daily Logs"
                subtitle="Review and audit daily operation logs submitted by the fleet"
            />

            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Logs ({date.toLocaleDateString()})</p>
                    <p className="text-2xl font-black text-gray-900">{stats.logsToday} Drivers</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Volume Dispatched</p>
                    <p className="text-2xl font-black text-blue-600">{stats.totalLitres.toLocaleString()} L</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by driver or truck..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <input
                    type="date"
                    value={date.toISOString().split('T')[0]}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Synchronizing Logs...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="bg-white rounded-2xl py-24 text-center border border-dashed border-gray-200">
                    <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No logs found</h3>
                    <p className="text-gray-500">Try selecting a different date or clearing your search.</p>
                </div>
            ) : (
                <>
                    {/* Mobile Cards (Visible on mobile only) */}
                    <div className="md:hidden space-y-4">
                        {filteredLogs.map((log, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {log.driverName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{log.driverName}</p>
                                            <p className="text-xs text-gray-500">{log.truckRegNumber}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-400 uppercase text-[10px]">Open</p>
                                        <p className="font-bold text-gray-900">{log.openingBalance.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-400 uppercase text-[10px]">Supply</p>
                                        <p className="font-bold text-blue-600">{log.totalSupplies.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-400 uppercase text-[10px]">Close</p>
                                        <p className="font-bold text-gray-900">{log.closingBalance.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Driver</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Truck</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Opening Balance</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Total Supplied</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Closing Balance</th>
                                    <th className="text-right py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLogs.map((log, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                    {log.driverName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">{log.driverName}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-semibold text-gray-600">{log.truckRegNumber}</td>
                                        <td className="py-4 px-6 text-sm font-bold text-gray-900">{log.openingBalance.toLocaleString()} L</td>
                                        <td className="py-4 px-6 text-sm font-bold text-blue-600">{log.totalSupplies.toLocaleString()} L</td>
                                        <td className="py-4 px-6 text-sm font-bold text-gray-900">{log.closingBalance.toLocaleString()} L</td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4 text-gray-400" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
