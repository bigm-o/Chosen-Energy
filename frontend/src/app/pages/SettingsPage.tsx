import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/utils/api';
import { Settings, Save, AlertCircle, CheckCircle, Clock, ShieldCheck, DollarSign, Loader2, Info, Users, Trash2, Plus, Search, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

interface SystemSetting {
    key: string;
    value: string;
    updatedAt: string;
    pendingValue?: string;
    status: string;
}

interface CustomerFuelPrice {
    customerId: string;
    companyName: string;
    pricePerLitre: number;
}

interface Customer {
    id: string;
    companyName: string;
}

export function SettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    // Customer specific pricing state
    const [customerPrices, setCustomerPrices] = useState<CustomerFuelPrice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [submittingPrice, setSubmittingPrice] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchCustomerPrices();
        fetchCustomers();
    }, []);

    const fetchSettings = async () => {
        try {
            const resp = await apiRequest('/api/settings');
            const data = await resp.json();
            if (data.success) setSettings(data.data);
        } catch (err) { }
    };

    const fetchCustomerPrices = async () => {
        try {
            const resp = await apiRequest('/api/settings/customer-prices');
            const data = await resp.json();
            if (data.success) setCustomerPrices(data.data);
        } catch (err) { }
        setLoading(false);
    };

    const fetchCustomers = async () => {
        try {
            const resp = await apiRequest('/api/customers');
            const data = await resp.json();
            if (data.success) setCustomers(data.data);
        } catch (err) { }
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
                toast.success("Fixed price updated successfully");
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

    const handleSetCustomerPrice = async () => {
        if (!selectedCustomer || !newPrice) return;
        setSubmittingPrice(true);
        try {
            const resp = await apiRequest('/api/settings/customer-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: selectedCustomer, price: parseFloat(newPrice) })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success("Customer price updated");
                setSelectedCustomer('');
                setNewPrice('');
                fetchCustomerPrices();
            }
        } catch (err) {
            toast.error("Failed to update customer price");
        }
        setSubmittingPrice(false);
    };

    const handleRemoveCustomerPrice = async (customerId: string) => {
        setIsDeleting(customerId);
        try {
            const resp = await apiRequest(`/api/settings/customer-prices/${customerId}`, { method: 'DELETE' });
            if (resp.ok) {
                toast.success("Specific rate removed");
                fetchCustomerPrices();
                setDeleteConfirmId(null);
            }
        } catch (err) {
            toast.error("Failed to remove specific rate");
        }
        setIsDeleting(null);
    };

    const isMD = user?.role === 'MD';

    if (loading) return <div className="py-20 flex flex-col items-center gap-4 text-gray-300 animate-pulse"><Loader2 className="animate-spin" /><p className="text-xs font-black uppercase">Loading Configuration...</p></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-20">
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" /> System Configurations
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 font-semibold">Manage global parameters and pricing rules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.map(s => (
                    <div key={s.key} className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                                    {s.key === 'DieselSellingPrice' ? <DollarSign className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 tracking-tight">{s.key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Global Parameter</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Current Value</label>
                                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">
                                        {s.key.includes('Price') ? `₦${parseFloat(s.value).toLocaleString()}` : s.value}
                                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 font-bold uppercase tracking-widest">/ Litre</span>
                                    </p>
                                </div>


                                <div className="pt-6 border-t border-gray-50 dark:border-gray-700/50 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-3">Update Value</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                id={`input-${s.key}`}
                                                placeholder="New Value"
                                                className="flex-1 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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

                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Customer Specific Pricing Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight">Customer Specific Rates</h3>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Overrides global price for selected customers</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Component */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Select Customer</label>
                                <select 
                                    className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-gray-100"
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="">Choose Customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.companyName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Specific Rate (₦)</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 1150"
                                    className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleSetCustomerPrice}
                                disabled={submittingPrice || !selectedCustomer || !newPrice}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                {submittingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Save Specific Rate
                            </button>
                        </div>
                    </div>

                    {/* List Component */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-3xl overflow-hidden border border-gray-50 dark:border-gray-800">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fixed Rate</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {customerPrices.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center">
                                                <Search className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                                <p className="text-xs font-bold text-gray-400">No specific rates defined yet.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        customerPrices.map(cp => (
                                            <tr key={cp.customerId} className="group hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-black text-gray-900 dark:text-gray-100">{cp.companyName}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">₦{cp.pricePerLitre.toLocaleString()}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setDeleteConfirmId(cp.customerId)}
                                                        disabled={isDeleting === cp.customerId}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Security Protocol</h4>
                    <p className="text-xs text-blue-700 font-semibold mt-1 leading-relaxed">
                        Pricing updates for both global and specific customer rates are now applied immediately.
                        Updating the global diesel price will affect all customers who do not have a 
                        custom rate assigned to them.
                    </p>
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full animate-bounce">
                                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        
                        <div className="text-center space-y-3 mb-8">
                            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Confirm Removal?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold leading-relaxed px-4">
                                This customer will no longer have a specific rate and will revert to the global diesel price. This action cannot be undone.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="py-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRemoveCustomerPrice(deleteConfirmId)}
                                disabled={isDeleting === deleteConfirmId}
                                className="py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 dark:shadow-none flex items-center justify-center gap-2 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting === deleteConfirmId ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Remove Rate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
