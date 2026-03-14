import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, Package, Truck, ArrowRightLeft, Eye, Filter, Search, Loader2, Info, CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface Transload {
    id: string;
    sourceTruckId: string;
    sourceTruckReg: string;
    destinationTruckId: string;
    destinationTruckReg: string;
    quantity: number;
    transferDate: string;
    status: string;
    isConfirmedByReceiver: boolean;
    transloadType: string;
    createdByName: string;
    receivingDriverName: string;
}

interface TruckData {
    id: string;
    registrationNumber: string;
    capacity: number;
}

export function TransloadingPage() {
    const { user } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [transloads, setTransloads] = useState<Transload[]>([]);
    const [trucks, setTrucks] = useState<TruckData[]>([]);
    const [myDriver, setMyDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        destinationTruckId: '',
        quantity: ''
    });
    const [truckSearchTerm, setTruckSearchTerm] = useState('');
    const [showTruckDropdown, setShowTruckDropdown] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const transPromise = apiRequest('/api/transloads/my');
            const trucksPromise = apiRequest('/api/trucks');
            const mePromise = user?.role === 'Driver' ? apiRequest('/api/drivers/me') : null;

            const [transResponse, trucksResponse, meResponse] = await Promise.all([
                transPromise,
                trucksPromise,
                mePromise
            ]);
            
            const transData = await transResponse.json();
            const truckData = await trucksResponse.json();
            let meData = { data: null };
            
            if (meResponse && meResponse.ok) {
                meData = await meResponse.json();
            }

            setTransloads(transData.data || []);
            setTrucks(truckData.data || []);
            setMyDriver(meData.data);
        } catch (err) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleInitiateTransfer = async () => {
        if (!formData.destinationTruckId || !formData.quantity) {
            toast.error("Please fill all fields");
            return;
        }

        if (formData.destinationTruckId === myDriver?.assignedTruckId) {
            toast.error("Source and destination trucks cannot be the same");
            return;
        }

        setSubmitting(true);
        try {
            const response = await apiRequest('/api/transloads', {
                method: 'POST',
                body: JSON.stringify({
                    sourceTruckId: myDriver.assignedTruckId,
                    destinationTruckId: formData.destinationTruckId,
                    quantity: parseFloat(formData.quantity)
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setShowAddModal(false);
                setFormData({ destinationTruckId: '', quantity: '' });
                fetchData();
            } else {
                toast.error(data.message);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to initiate transfer");
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmTransfer = async (id: string) => {
        try {
            const response = await apiRequest(`/api/transloads/${id}/confirm`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchData();
            } else {
                toast.error(data.message);
            }
        } catch (err: any) {
            toast.error(err.message || "Confirmation failed");
        }
    };

    const stats = {
        active: transloads.filter(t => t.status === 'Pending').length,
        volume: transloads
            .filter(t => new Date(t.transferDate).toDateString() === new Date().toDateString())
            .reduce((sum, t) => sum + t.quantity, 0)
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Trans-loading"
                subtitle="Manage fuel transfers between fleet tankers"
                action={{
                    label: 'New Transfer',
                    onClick: () => setShowAddModal(true),
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Overview Stats */}
            <div id="overview-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Active Transfers</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.active}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Vol (Today)</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.volume.toLocaleString()} L</p>
                </div>
            </div>

            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4 text-gray-400">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-widest">Loading Records...</p>
                </div>
            ) : transloads.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-32 text-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowRightLeft className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Trans-loading Module</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        This records transfers of stock between tankers. Features include volume verification and dual-driver confirmation.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-6 px-6 py-2.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-blue-500/20"
                    >
                        Create First Transfer Entry
                    </button>
                </div>
            ) : (
                <div id="active-transloads" className="space-y-4">
                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {transloads.map((t) => (
                            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <ArrowRightLeft className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t.sourceTruckReg} → {t.destinationTruckReg}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{new Date(t.transferDate).toLocaleDateString()} • {t.transloadType}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                        t.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                        t.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {t.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Quantity</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-gray-100">{t.quantity.toLocaleString()} L</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Confirmation</p>
                                        <p className={`text-xs font-bold ${t.isConfirmedByReceiver ? 'text-green-600' : 'text-amber-600'}`}>
                                            {t.isConfirmedByReceiver ? 'Confirmed' : 'Pending Receipt'}
                                        </p>
                                    </div>
                                </div>
                                {!t.isConfirmedByReceiver && t.receivingDriverName === user?.fullName && (
                                    <button
                                        onClick={() => handleConfirmTransfer(t.id)}
                                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Confirm Reciept
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Transfer Details</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Quantity</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {transloads.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.sourceTruckReg} → {t.destinationTruckReg}</p>
                                                    <p className="text-[10px] text-gray-500 font-semibold">{new Date(t.transferDate).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t.quantity.toLocaleString()} L</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{t.transloadType}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                    t.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                    t.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {t.status}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {t.isConfirmedByReceiver ? 
                                                        <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                                                        <Clock className="w-3 h-3 text-amber-500" />
                                                    }
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                        {t.isConfirmedByReceiver ? 'Confirmed' : 'Pending Receipt'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!t.isConfirmedByReceiver && t.receivingDriverName === user?.fullName && (
                                                <button
                                                    onClick={() => handleConfirmTransfer(t.id)}
                                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 shadow-sm"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* Modern Modal Placeholder */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Log Fuel Trans-load" size="md">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Source Truck</label>
                            <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-500 dark:text-gray-400">
                                {myDriver?.assignedTruckRegNumber || 'Loading...'}
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Target Truck</label>
                            <div
                                className={`flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg cursor-pointer transition-all ${showTruckDropdown ? 'border-blue-500 ring-2 ring-blue-50/50' : 'border-gray-200 dark:border-gray-700'}`}
                                onClick={() => setShowTruckDropdown(!showTruckDropdown)}
                            >
                                <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className={`text-sm font-bold flex-1 ${formData.destinationTruckId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                    {trucks.find(t => t.id === formData.destinationTruckId) ?
                                        trucks.find(t => t.id === formData.destinationTruckId)?.registrationNumber
                                        : 'Select Tanker'}
                                </span>
                                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showTruckDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {showTruckDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 border-b border-gray-50 dark:border-gray-700">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search tanker..."
                                                value={truckSearchTerm}
                                                onChange={(e) => setTruckSearchTerm(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-xs font-bold outline-none focus:ring-0 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {trucks
                                            .filter(t => t.id !== myDriver?.assignedTruckId)
                                            .filter(t => t.registrationNumber.toLowerCase().includes(truckSearchTerm.toLowerCase()))
                                            .map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, destinationTruckId: t.id });
                                                    setShowTruckDropdown(false);
                                                    setTruckSearchTerm('');
                                                }}
                                                className="w-full px-4 py-3 text-left border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-between"
                                            >
                                                <span className="text-sm font-black text-gray-900 dark:text-gray-100">{t.registrationNumber}</span>
                                                {formData.destinationTruckId === t.id && <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 rotate-45" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Volume to Transfer (L)</label>
                        <input 
                            type="number" 
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-900 dark:text-gray-100" 
                            placeholder="0" 
                        />
                    </div>
                    <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-500 font-bold leading-relaxed">
                            Note: The receiving driver will be required to confirm this transfer before it is sent for management approval.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={() => setShowAddModal(false)} 
                            className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleInitiateTransfer}
                            disabled={submitting}
                            className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Initiating...
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className="w-4 h-4" />
                                    Initiate Transfer
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
