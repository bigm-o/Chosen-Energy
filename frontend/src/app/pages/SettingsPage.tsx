import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/utils/api';
import { Settings, Save, AlertCircle, CheckCircle, Clock, ShieldCheck, DollarSign, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface SystemSetting {
    key: string;
    value: string;
    updatedAt: string;
    pendingValue?: string;
    status: string;
}

export function SettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const resp = await apiRequest('/api/settings');
            const data = await resp.json();
            if (data.success) setSettings(data.data);
        } catch (err) { }
        setLoading(false);
    };

    const handleUpdate = async (key: string, value: string) => {
        setUpdating(key);
        try {
            const resp = await apiRequest(`/api/settings/${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success("Price update submitted. Waiting for MD approval.");
                fetchSettings();
            }
        } catch (err) {
            toast.error("Failed to submit update");
        }
        setUpdating(null);
    };

    const handleApprove = async (key: string) => {
        try {
            const resp = await apiRequest(`/api/settings/${key}/approve`, { method: 'POST' });
            if (resp.ok) {
                toast.success("Setting approved and active!");
                fetchSettings();
            } else {
                const err = await resp.json();
                toast.error(err.message || "Approval failed");
            }
        } catch (err) { }
    };

    const isMD = user?.role === 'MD';

    if (loading) return <div className="py-20 flex flex-col items-center gap-4 text-gray-300 animate-pulse"><Loader2 className="animate-spin" /><p className="text-xs font-black uppercase">Loading Configuration...</p></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <Settings className="w-6 h-6 text-blue-600" /> System Configurations
                </h1>
                <p className="text-gray-500 mt-1 font-semibold">Manage global parameters and pricing rules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.map(s => (
                    <div key={s.key} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                                    {s.key === 'DieselSellingPrice' ? <DollarSign className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 tracking-tight">{s.key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global Parameter</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Current Value</label>
                                    <p className="text-3xl font-black text-gray-900 tracking-tighter">
                                        {s.key.includes('Price') ? `₦${parseFloat(s.value).toLocaleString()}` : s.value}
                                        <span className="text-xs text-gray-400 ml-2 font-bold uppercase tracking-widest">/ Litre</span>
                                    </p>
                                </div>

                                {s.status === 'Pending' && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                        <Clock className="w-4 h-4 text-amber-600 mt-1" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-900">Change Pending Approval</p>
                                            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Proposed Value: <span className="font-black">₦{parseFloat(s.pendingValue || '0').toLocaleString()}</span></p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-50 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Update Value</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                id={`input-${s.key}`}
                                                placeholder="New Value"
                                                className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                            <button
                                                onClick={() => {
                                                    const val = (document.getElementById(`input-${s.key}`) as HTMLInputElement).value;
                                                    if (val) handleUpdate(s.key, val);
                                                }}
                                                disabled={updating === s.key}
                                                className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {updating === s.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {isMD && s.status === 'Pending' && (
                                        <button
                                            onClick={() => handleApprove(s.key)}
                                            className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
                                        >
                                            <ShieldCheck className="w-4 h-4" /> Approve New Price
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Security Protocol</h4>
                    <p className="text-xs text-blue-700 font-semibold mt-1 leading-relaxed">
                        Pricing updates are stored as "Pending" until approved by the Managing Director (MD).
                        Once approved, the new price is applied system-wide to all new dispatch registrations.
                        This protects against unauthorized pricing adjustments.
                    </p>
                </div>
            </div>
        </div>
    );
}
