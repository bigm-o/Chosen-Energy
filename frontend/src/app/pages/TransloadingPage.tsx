import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, Package, Truck, ArrowRightLeft, Eye, Filter, Search, Loader2, Info, CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown, FileText } from 'lucide-react';
import { apiRequest, getFileUrl } from '@/utils/api';
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
    createdByName: string;
    receivingDriverName: string;
    sourceDriverName: string;
    transloadType: string;
    slipUrl?: string;
}

interface TruckData {
    id: string;
    registrationNumber: string;
    capacity: number;
    driverName?: string;
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
        sourceTruckId: '',
        destinationTruckId: '',
        quantity: '',
        slipUrl: ''
    });
    const [truckSearchTerm, setTruckSearchTerm] = useState('');
    const [sourceSearchTerm, setSourceSearchTerm] = useState('');
    const [showTruckDropdown, setShowTruckDropdown] = useState(false);
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sourceBalance, setSourceBalance] = useState<number | null>(null);
    const [fetchingBalance, setFetchingBalance] = useState(false);
    const [selectedTransload, setSelectedTransload] = useState<Transload | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const isAdmin = user?.role === 'Admin' || user?.role === 'MD';
            const transPromise = isAdmin ? apiRequest('/api/transloads') : apiRequest('/api/transloads/my');
            const trucksPromise = apiRequest('/api/trucks');
            const mePromise = user?.role === 'Driver' ? apiRequest('/api/drivers/me') : null;

            const [transResponse, trucksResponse, meResponse] = await Promise.all([
                transPromise,
                trucksPromise,
                mePromise
            ]);
            
            const transData = await transResponse.json();
            const truckData = await trucksResponse.json();
            let meData: any = { data: null };
            
            if (meResponse && meResponse.ok) {
                meData = await meResponse.json();
            }

            setTransloads(transData.data || []);
            setTrucks(truckData.data || []);
            setMyDriver(meData.data);
            
            // If it's a driver, auto-set their source truck
            if (meData?.data?.assignedTruckId) {
                setFormData(prev => ({ ...prev, sourceTruckId: meData.data.assignedTruckId }));
            }
        } catch (err) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchBalance = async () => {
            if (!formData.sourceTruckId) {
                setSourceBalance(null);
                return;
            }
            setFetchingBalance(true);
            try {
                const response = await apiRequest(`/api/trucks/${formData.sourceTruckId}/balance`);
                if (!response.ok) {
                    console.error("Balance API returned error", response.status);
                    return;
                }
                const data = await response.json();
                if (data.success) {
                    setSourceBalance(data.balance);
                }
            } catch (err) {
                console.error("Failed to fetch balance", err);
            } finally {
                setFetchingBalance(false);
            }
        };
        fetchBalance();
    }, [formData.sourceTruckId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'transloads');

        try {
            const response = await apiRequest('/api/uploads', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, slipUrl: data.url }));
                toast.success("Slip uploaded successfully");
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("File upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleInitiateTransfer = async () => {
        if (!formData.sourceTruckId || !formData.destinationTruckId || !formData.quantity || !formData.slipUrl) {
            toast.error("Please fill all fields and upload the transload slip");
            return;
        }

        const qty = parseFloat(formData.quantity);
        if (sourceBalance !== null && qty > sourceBalance) {
            toast.error(`Transfer quantity exceeds available balance (${sourceBalance.toLocaleString()} L)`);
            return;
        }

        if (formData.destinationTruckId === formData.sourceTruckId) {
            toast.error("Source and destination trucks cannot be the same");
            return;
        }

        setSubmitting(true);
        try {
            const response = await apiRequest('/api/transloads', {
                method: 'POST',
                body: JSON.stringify({
                    sourceTruckId: formData.sourceTruckId,
                    destinationTruckId: formData.destinationTruckId,
                    quantity: parseFloat(formData.quantity),
                    slipUrl: formData.slipUrl
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setShowAddModal(false);
                setFormData({ 
                    sourceTruckId: myDriver?.assignedTruckId || '', 
                    destinationTruckId: '', 
                    quantity: '',
                    slipUrl: '' 
                });
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

    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransloads = transloads.filter(t => 
        t.sourceTruckReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.destinationTruckReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.transloadType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        active: filteredTransloads.filter(t => t.status === 'Pending').length,
        volume: filteredTransloads
            .filter(t => new Date(t.transferDate).toDateString() === new Date().toDateString())
            .reduce((sum, t) => sum + t.quantity, 0),
        total: filteredTransloads.length
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
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Filtered Records</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.total}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by source or destination truck..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4 text-gray-400">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-widest">Loading Records...</p>
                </div>
            ) : filteredTransloads.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-32 text-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowRightLeft className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Transfers Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        We couldn't find any trans-load records matching your current search criteria.
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
                        {filteredTransloads.map((t) => (
                            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <ArrowRightLeft className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-gray-100">
                                                {t.sourceDriverName || t.createdByName} <span className="text-gray-400 font-bold">({t.sourceTruckReg})</span>
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                                <span>To</span>
                                                <span className="text-blue-600 dark:text-blue-400">{t.receivingDriverName} ({t.destinationTruckReg})</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                        t.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                        t.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
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
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedTransload(t);
                                            setShowDetailModal(true);
                                        }}
                                        className="flex-1 py-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border border-gray-100 dark:border-gray-800"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Details
                                    </button>
                                    {!t.isConfirmedByReceiver && t.receivingDriverName === user?.fullName && (
                                        <button
                                            onClick={() => handleConfirmTransfer(t.id)}
                                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                                        </button>
                                    )}
                                </div>
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
                                {filteredTransloads.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.sourceDriverName || t.createdByName}</span>
                                                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter">{t.sourceTruckReg}</span>
                                                        <ArrowRightLeft className="w-3 h-3 text-gray-300" />
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.receivingDriverName}</span>
                                                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter">{t.destinationTruckReg}</span>
                                                    </div>
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTransload(t);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors border border-gray-100 dark:border-gray-800"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {!t.isConfirmedByReceiver && t.receivingDriverName === user?.fullName && (
                                                    <button
                                                        onClick={() => handleConfirmTransfer(t.id)}
                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 shadow-sm"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* Modern Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Log Fuel Trans-load" size="md">
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Source Tanker</label>
                            {user?.role === 'Driver' ? (
                                <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {myDriver?.assignedTruckRegNumber || 'No Truck Assigned'}
                                </div>
                            ) : (
                                <>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl cursor-pointer transition-all ${showSourceDropdown ? 'border-blue-500 ring-2 ring-blue-50/50' : 'border-gray-200 dark:border-gray-800'}`}
                                        onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                                    >
                                        <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <span className={`text-sm font-bold flex-1 ${formData.sourceTruckId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                            {trucks.find(t => t.id === formData.sourceTruckId) ?
                                                `${trucks.find(t => t.id === formData.sourceTruckId)?.driverName || 'No Driver'} (${trucks.find(t => t.id === formData.sourceTruckId)?.registrationNumber})`
                                                : 'Select Source'}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showSourceDropdown ? 'rotate-180' : ''}`} />
                                    </div>
                                    {showSourceDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-[70] overflow-hidden">
                                            <div className="p-2 border-b border-gray-50 dark:border-gray-700">
                                                <input
                                                    type="text"
                                                    placeholder="Search source..."
                                                    value={sourceSearchTerm}
                                                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-xs font-bold outline-none"
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {trucks
                                                    .filter(t => t.registrationNumber.toLowerCase().includes(sourceSearchTerm.toLowerCase()) || (t.driverName || '').toLowerCase().includes(sourceSearchTerm.toLowerCase()))
                                                    .map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, sourceTruckId: t.id });
                                                            setShowSourceDropdown(false);
                                                            setSourceSearchTerm('');
                                                        }}
                                                        className="w-full px-4 py-3 text-left border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 flex flex-col"
                                                    >
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.driverName || 'No Driver'}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t.registrationNumber}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Target Tanker</label>
                            <div
                                className={`flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl cursor-pointer transition-all ${showTruckDropdown ? 'border-blue-500 ring-2 ring-blue-50/50' : 'border-gray-200 dark:border-gray-800'}`}
                                onClick={() => setShowTruckDropdown(!showTruckDropdown)}
                            >
                                <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className={`text-sm font-bold flex-1 ${formData.destinationTruckId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                    {trucks.find(t => t.id === formData.destinationTruckId) ?
                                        `${trucks.find(t => t.id === formData.destinationTruckId)?.driverName || 'No Driver'} (${trucks.find(t => t.id === formData.destinationTruckId)?.registrationNumber})`
                                        : 'Select Target'}
                                </span>
                                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showTruckDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {showTruckDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-[60] overflow-hidden">
                                    <div className="p-2 border-b border-gray-50 dark:border-gray-700">
                                        <input
                                            type="text"
                                            placeholder="Search target..."
                                            value={truckSearchTerm}
                                            onChange={(e) => setTruckSearchTerm(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-xs font-bold outline-none"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {trucks
                                            .filter(t => t.id !== formData.sourceTruckId)
                                            .filter(t => t.registrationNumber.toLowerCase().includes(truckSearchTerm.toLowerCase()) || (t.driverName || '').toLowerCase().includes(truckSearchTerm.toLowerCase()))
                                            .map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, destinationTruckId: t.id });
                                                    setShowTruckDropdown(false);
                                                    setTruckSearchTerm('');
                                                }}
                                                className="w-full px-4 py-3 text-left border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 flex flex-col"
                                            >
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.driverName || 'No Driver'}</span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t.registrationNumber}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Volume to Transfer (L)</label>
                            {sourceBalance !== null && (
                                <span className={`text-[10px] font-bold ${parseFloat(formData.quantity) > sourceBalance ? 'text-red-500' : 'text-blue-500'}`}>
                                    Available: {sourceBalance.toLocaleString()} L
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                max={sourceBalance || undefined}
                                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl outline-none focus:ring-2 transition-all text-sm font-bold text-gray-900 dark:text-gray-100 ${
                                    sourceBalance !== null && parseFloat(formData.quantity) > sourceBalance 
                                    ? 'border-red-500 focus:ring-red-500' 
                                    : 'border-gray-200 dark:border-gray-800 focus:ring-blue-500'
                                }`} 
                                placeholder="Enter liters..." 
                            />
                            {fetchingBalance && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>
                        {sourceBalance !== null && parseFloat(formData.quantity) > sourceBalance && (
                            <p className="mt-1 text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Quantity exceeds available tanker cargo
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Transload Slip / Proof</label>
                        <div className="relative group">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${formData.slipUrl ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800 hover:border-blue-400'}`}>
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                ) : formData.slipUrl ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        <span className="text-xs font-bold text-green-600">Slip Uploaded Successfully</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-xs font-bold text-gray-500">Tap to upload transload slip</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold leading-relaxed">
                            A transload slip is mandatory for verification. The receiving driver must confirm this transfer via their own dashboard before management can finalize approval.
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

            {/* Detail Modal */}
            <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Trans-load Details" size="md">
                {selectedTransload && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Source Tanker</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedTransload.sourceTruckReg}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{selectedTransload.sourceDriverName || 'No Driver Assigned'}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Destination Tanker</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedTransload.destinationTruckReg}</p>
                                <p className="text-[10px] text-gray-400 font-bold">{selectedTransload.receivingDriverName}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Initiated By</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedTransload.createdByName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Date</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{new Date(selectedTransload.transferDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Transfer Volume</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{selectedTransload.quantity.toLocaleString()} <span className="text-sm font-bold text-gray-400">Litres</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Status</p>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                    selectedTransload.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                    selectedTransload.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {selectedTransload.status}
                                </span>
                            </div>
                        </div>

                        {selectedTransload.slipUrl && (
                            <div>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Transload Slip / Proof</p>
                                <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <img 
                                        src={getFileUrl(selectedTransload.slipUrl)} 
                                        alt="Transload Slip" 
                                        className="w-full h-auto max-h-96 object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-2">
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className="flex-1 py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-all text-sm"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
