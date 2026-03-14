import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { FileText, Search, Filter, Eye, User, Calendar, Fuel, Loader2, AlertCircle, ArrowRightLeft, Package, MapPin, CheckCircle, XCircle, Info } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface DailyLogEntry {
    truckId: string;
    driverName: string;
    truckRegNumber: string;
    openingBalance: number;
    totalIn: number;
    totalSupplies: number;
    closingBalance: number;
}

interface DetailedLog {
    id: string;
    type: string;
    title: string;
    quantity: number;
    status: string;
    date: string;
}

export function AdminDailyLogsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [date, setDate] = useState(new Date());
    const [logs, setLogs] = useState<DailyLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<DailyLogEntry | null>(null);
    const [detailedData, setDetailedData] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

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

    const fetchDetailedLogs = async (log: DailyLogEntry) => {
        setSelectedLog(log);
        setDetailLoading(true);
        setShowModal(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const tId = log.truckId || (log as any).TruckId;
            
            if (!tId || tId === 'undefined') {
                toast.error("Invalid truck ID. Cannot load details.");
                setDetailLoading(false);
                return;
            }

            const response = await apiRequest(`/api/daily-logs/truck/${tId}/${dateStr}`);
            const data = await response.json();
            if (data.success) {
                setDetailedData(data.data);
            }
        } catch (err) {
            toast.error("Failed to load detailed logs");
        } finally {
            setDetailLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.truckRegNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        logsToday: logs.length,
        totalLitres: logs.reduce((sum, l) => sum + (l.totalSupplies || 0), 0)
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Driver Daily Logs"
                subtitle="Review and audit daily operation logs submitted by the fleet"
            />

            {/* Summary Row */}
            <div id="daily-summary" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Active Logs ({date.toLocaleDateString()})</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.logsToday} Drivers</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Volume Dispatched</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{(stats.totalLitres || 0).toLocaleString()} L</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by driver or truck..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
                <input
                    type="date"
                    value={date.toISOString().split('T')[0]}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Synchronizing Logs...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl py-24 text-center border border-dashed border-gray-200 dark:border-gray-700">
                    <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No logs found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try selecting a different date or clearing your search.</p>
                </div>
            ) : (
                <>
                    {/* Mobile Cards (Visible on mobile only) */}
                    <div className="md:hidden space-y-4">
                        {filteredLogs.map((log, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {(log.driverName || '??').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{log.driverName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{log.truckRegNumber}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Open</p>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{(log.openingBalance || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Supply</p>
                                        <p className="font-bold text-blue-600 dark:text-blue-400">{(log.totalSupplies || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Close</p>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{(log.closingBalance || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => fetchDetailedLogs(log)}
                                    className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center gap-2"
                                >
                                    <Eye className="w-3.5 h-3.5" /> View All Activities
                                </button>
                            </div>
                        ))}
                    </div>

                    <div id="audit-logs" className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Driver</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Truck</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Opening Balance</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Total Supplied</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Closing Balance</th>
                                    <th className="text-right py-4 px-6 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {filteredLogs.map((log, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                    {(log.driverName || '??').substring(0, 2).toUpperCase()}
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{log.driverName}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">{log.truckRegNumber}</td>
                                        <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-gray-100">{(log.openingBalance || 0).toLocaleString()} L</td>
                                        <td className="py-4 px-6 text-sm font-bold text-blue-600 dark:text-blue-400">{(log.totalSupplies || 0).toLocaleString()} L</td>
                                        <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-gray-100">{(log.closingBalance || 0).toLocaleString()} L</td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => fetchDetailedLogs(log)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                                                title="View Daily Activity"
                                            >
                                                <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`Daily Activity: ${selectedLog?.truckRegNumber}`}
                size="lg"
            >
                <div className="space-y-6">
                    {detailLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                             <Loader2 className="w-8 h-8 animate-spin" />
                             <p className="text-xs font-bold uppercase tracking-widest">Fetching Details...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Opening</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-gray-100">{(detailedData?.openingBalance || 0).toLocaleString()} L</p>
                                </div>
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Today In</p>
                                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">+{(detailedData?.totalInToday || 0).toLocaleString()} L</p>
                                </div>
                                <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100/50 dark:border-orange-900/30">
                                    <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">Today Out</p>
                                    <p className="text-sm font-black text-orange-600 dark:text-orange-400">-{(detailedData?.totalOutToday || 0).toLocaleString()} L</p>
                                </div>
                                <div className="bg-gray-900 dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Closing</p>
                                    <p className="text-sm font-black text-white">{(detailedData?.closingBalance || 0).toLocaleString()} L</p>
                                </div>
                            </div>

                            {/* Detailed Log Table */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                                <div className="max-h-[50vh] overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900 sticky top-0 border-b border-gray-100 dark:border-gray-800 z-10">
                                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Operation</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 text-right">Qty</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
                                            {detailedData?.logs?.map((entry: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {entry.type === 'Sale' ? <Package className="w-3.5 h-3.5 text-blue-400" /> :
                                                             entry.type.includes('Transload') ? <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" /> :
                                                             <Fuel className="w-3.5 h-3.5 text-green-400" />}
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-gray-100">{entry.title}</p>
                                                                <p className="text-[10px] text-gray-400 uppercase font-semibold">{entry.type}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`font-black ${entry.type === 'Sale' || entry.type.includes('(Out)') ? 'text-red-500' : 'text-green-500'}`}>
                                                            {entry.type === 'Sale' || entry.type.includes('(Out)') ? '-' : '+'}{(entry.quantity || 0).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            entry.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                            entry.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {entry.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!detailedData?.logs || detailedData.logs.length === 0) && (
                                                <tr>
                                                    <td colSpan={3} className="py-10 text-center text-gray-400 italic">No detailed activities recorded for this date</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
