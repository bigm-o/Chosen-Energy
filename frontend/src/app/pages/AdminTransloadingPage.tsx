import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/utils/api';
import { CheckCircle, XCircle, ArrowLeftRight, Clock, User, Truck, Filter, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Transload {
    id: string;
    sourceTruckReg: string;
    destinationTruckReg: string;
    quantity: number;
    transferDate: string;
    status: string;
    isConfirmedByReceiver: boolean;
    transloadType: string;
    createdByName: string;
    receivingDriverName: string;
}

export function AdminTransloadingPage() {
    const [transloads, setTransloads] = useState<Transload[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchTransloads();
    }, []);

    const fetchTransloads = async () => {
        setLoading(true);
        try {
            const resp = await apiRequest('/api/transloads');
            const data = await resp.json();
            if (data.success) {
                setTransloads(data.data);
            }
        } catch (err) {
            toast.error("Failed to load transloading records");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const resp = await apiRequest(`/api/transloads/${id}/approve`, { method: 'POST' });
            if (resp.ok) {
                toast.success("Transload approved!");
                fetchTransloads();
            } else {
                const err = await resp.json();
                toast.error(err.message || "Approval failed");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt("Enter rejection reason:");
        if (reason === null) return;

        try {
            const resp = await apiRequest(`/api/transloads/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            if (resp.ok) {
                toast.success("Transload rejected");
                fetchTransloads();
            }
        } catch (err) {
            toast.error("Rejection failed");
        }
    };

    const filtered = transloads.filter(t => {
        if (filter === 'All') return true;
        return t.status === filter;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transloading Management</h1>
                    <p className="text-gray-500 mt-1">Review and approve diesel transfers between trucks</p>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-gray-300">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest">Loading Records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No transloading records found matching filter</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Transfer ID</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Operation</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Volume</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Date/Time</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Confirmation</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-gray-400">#{t.id.substring(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900">{t.sourceTruckReg}</span>
                                                    <span className="text-[10px] text-gray-400 font-semibold">{t.createdByName}</span>
                                                </div>
                                                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900">{t.destinationTruckReg}</span>
                                                    <span className="text-[10px] text-gray-400 font-semibold">{t.receivingDriverName}</span>
                                                </div>
                                                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500">{t.transloadType}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{t.quantity.toLocaleString()} L</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold">{new Date(t.transferDate).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-gray-400 uppercase">{new Date(t.transferDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.isConfirmedByReceiver ? (
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase">Confirmed by Receiver</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">Awaiting Receiver</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${t.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                t.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.status === 'Pending' && t.isConfirmedByReceiver && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(t.id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-100">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleReject(t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-100">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
