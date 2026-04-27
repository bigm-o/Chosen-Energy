import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { Plus, Download, Filter, Search, Loader2, ArrowDownCircle, MapPin, Truck as TruckIcon, User, Info, CheckCircle, XCircle, ChevronDown, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface InwardLoad {
    id: string;
    truckRegNumber: string;
    driverName: string;
    depotName: string;
    quantity: number;
    loadDate: string;
    status: string;
    remarks: string;
}

interface Truck {
    id: string;
    registrationNumber: string;
    assignedDriverId: string;
    driverName?: string;
    truckType?: string;
}

interface Depot {
    id: string;
    name: string;
}

export function InwardLoadsPage() {
    const [loads, setLoads] = useState<InwardLoad[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [depots, setDepots] = useState<Depot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        truckId: '',
        quantity: '',
        remarks: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [truckSearchTerm, setTruckSearchTerm] = useState('');
    const [bulkSearchTerm, setBulkSearchTerm] = useState('');
    const [showTruckDropdown, setShowTruckDropdown] = useState(false);
    const [assignmentMode, setAssignmentMode] = useState<'Single' | 'Bulk'>('Single');
    const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);

    useEffect(() => {
        fetchLoads();
        fetchSupportData();
    }, []);

    const fetchLoads = async () => {
        setLoading(true);
        try {
            const resp = await apiRequest('/api/inwardloads');
            const data = await resp.json();
            if (data.success) setLoads(data.data);
        } catch (err) { }
        setLoading(false);
    };

    const fetchSupportData = async () => {
        try {
            const t = await apiRequest('/api/trucks');
            const trks = await t.json();
            setTrucks(trks.data || []);
        } catch (err) { }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (assignmentMode === 'Bulk' && selectedTruckIds.length === 0) {
            toast.error("Please select at least one truck");
            return;
        }

        if (assignmentMode === 'Single' && !formData.truckId) {
            toast.error("Please select a target truck");
            return;
        }

        setFormLoading(true);
        try {
            let resp;
            if (assignmentMode === 'Single') {
                const truck = trucks.find(t => t.id === formData.truckId);
                resp = await apiRequest('/api/inwardloads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        truckId: formData.truckId,
                        driverId: truck?.assignedDriverId,
                        depotId: null,
                        quantity: parseFloat(formData.quantity),
                        remarks: formData.remarks
                    })
                });
            } else {
                const bulkItems = selectedTruckIds.map(id => {
                    const t = trucks.find(trk => trk.id === id);
                    return { truckId: id, driverId: t?.assignedDriverId };
                });

                resp = await apiRequest('/api/inwardloads/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: bulkItems,
                        quantity: parseFloat(formData.quantity),
                        remarks: formData.remarks
                    })
                });
            }

            if (resp.ok) {
                toast.success(assignmentMode === 'Single' ? "Disbursement recorded!" : "Bulk disbursements recorded!");
                setShowAddModal(false);
                setFormData({ truckId: '', quantity: '', remarks: '' });
                setSelectedTruckIds([]);
                fetchLoads();
            } else {
                const err = await resp.json();
                toast.error(err.message || "Failed to record load");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
        setFormLoading(false);
    };

    const handleApprove = async (id: string) => {
        setIsSubmitting(true);
        try {
            const resp = await apiRequest(`/api/inwardloads/${id}/approve`, { method: 'POST' });
            if (resp.ok) {
                toast.success("Load approved");
                fetchLoads();
            } else {
                const err = await resp.json();
                toast.error(err.message || "Failed to approve load");
            }
        } catch (err) {
            toast.error("Connection error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredLoads = loads.filter(l =>
        l.truckRegNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.depotName || 'Direct Company Load').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalVolume: filteredLoads.reduce((acc, l) => acc + l.quantity, 0),
        pending: filteredLoads.filter(l => l.status === 'Pending').length,
        count: filteredLoads.length
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Disbursements</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Assign fuel directly from company/depots to trucks</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-sm">
                    <Plus className="w-4 h-4" /> Record New Disbursement
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Volume (Filtered)</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.totalVolume.toLocaleString()} L</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Pending Approval</p>
                    <p className="text-2xl font-black text-orange-500">{stats.pending}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Records</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.count}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by truck, driver or depot..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 bg-blue-50/30 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">
                        Tip: Bulk disbursements can be approved as a single batch on the <a href="/approvals" className="underline hover:text-blue-900 transition-colors">Approvals Page</a>
                    </p>
                </div>
                {loading ? (
                    <div className="py-20 flex flex-col items-center text-gray-300 gap-4"><Loader2 className="animate-spin" /><p className="text-xs font-bold uppercase tracking-widest">Fetching Disbursements...</p></div>
                ) : loads.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 dark:text-gray-500">
                        <ArrowDownCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm">No disbursements recorded yet.</p>
                    </div>
                ) : (
                    <>
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredLoads.map(l => (
                                <div key={l.id} className="p-4 bg-white dark:bg-gray-800 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{l.truckRegNumber}</p>
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{l.driverName}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {l.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 p-1 px-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                            <MapPin className="w-3 h-3 text-blue-400" />
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{l.depotName || 'Direct Company Load'}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-gray-900 dark:text-gray-100">{l.quantity.toLocaleString()} L</p>
                                            <p className="text-[10px] text-gray-400 font-bold">{new Date(l.loadDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {l.status === 'Pending' && (
                                        <button 
                                            onClick={() => handleApprove(l.id)} 
                                            disabled={isSubmitting}
                                            className="w-full py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl border border-green-100 hover:bg-green-100 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                            {isSubmitting ? "Approving..." : "Approve Disbursement"}
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>

                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Source</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-700 dark:text-gray-200">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredLoads.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{l.truckRegNumber}</span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">{l.driverName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{l.depotName || 'Direct Company Load'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-gray-900 dark:text-gray-100">{l.quantity.toLocaleString()} L</td>
                                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">{new Date(l.loadDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {l.status === 'Pending' && (
                                                <button 
                                                    onClick={() => handleApprove(l.id)} 
                                                    disabled={isSubmitting}
                                                    className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg border border-green-100 hover:bg-green-100 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    </>
                )}
            </div>

            <Modal isOpen={showAddModal} onClose={() => !formLoading && setShowAddModal(false)} title="Record Company Disbursement" size="lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Assignment Mode Toggle */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setAssignmentMode('Single')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${assignmentMode === 'Single' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Single Truck
                        </button>
                        <button
                            type="button"
                            onClick={() => setAssignmentMode('Bulk')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${assignmentMode === 'Bulk' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Bulk Assignment
                        </button>
                    </div>

                    {assignmentMode === 'Single' ? (
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Target Truck</label>
                            <div
                                className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 border rounded-xl cursor-pointer transition-all ${showTruckDropdown ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-100'}`}
                                onClick={() => setShowTruckDropdown(!showTruckDropdown)}
                            >
                                <TruckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className={`text-xs font-bold flex-1 ${formData.truckId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                    {trucks.find(t => t.id === formData.truckId) ?
                                        `${trucks.find(t => t.id === formData.truckId)?.driverName} (${trucks.find(t => t.id === formData.truckId)?.registrationNumber})`
                                        : 'Search driver name or truck...'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTruckDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {showTruckDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 border-b border-gray-50">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search driver or registration..."
                                            value={truckSearchTerm}
                                            onChange={(e) => setTruckSearchTerm(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            className="w-full p-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-xs font-bold outline-none focus:ring-0 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {trucks.filter(t =>
                                            t.registrationNumber.toLowerCase().includes(truckSearchTerm.toLowerCase()) ||
                                            (t.driverName && t.driverName.toLowerCase().includes(truckSearchTerm.toLowerCase()))
                                        ).map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, truckId: t.id });
                                                    setShowTruckDropdown(false);
                                                }}
                                                className="w-full p-4 text-left border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">{t.driverName || 'No Driver Assigned'}</span>
                                                    <span className="text-xs font-black text-gray-900 dark:text-gray-100">{t.registrationNumber}</span>
                                                </div>
                                                {formData.truckId === t.id && <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Bulk Filters & Search */}
                            <div className="bg-slate-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Quick filter fleet (search name or truck)..."
                                        value={bulkSearchTerm}
                                        onChange={e => setBulkSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const filtered = trucks.filter(t =>
                                                t.assignedDriverId && (
                                                    t.registrationNumber.toLowerCase().includes(bulkSearchTerm.toLowerCase()) ||
                                                    (t.driverName && t.driverName.toLowerCase().includes(bulkSearchTerm.toLowerCase()))
                                                )
                                            ).map(t => t.id);
                                            setSelectedTruckIds(prev => Array.from(new Set([...prev, ...filtered])));
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                                    >
                                        Select Filtered
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const filteredIds = trucks.filter(t =>
                                                t.assignedDriverId && (
                                                    t.registrationNumber.toLowerCase().includes(bulkSearchTerm.toLowerCase()) ||
                                                    (t.driverName && t.driverName.toLowerCase().includes(bulkSearchTerm.toLowerCase()))
                                                )
                                            ).map(t => t.id);
                                            setSelectedTruckIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                        }}
                                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                                    >
                                        Deselect Filtered
                                    </button>
                                    <div className="w-[1px] h-4 bg-slate-200 my-auto mx-1" />
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTruckIds(trucks.filter(t => t.assignedDriverId && t.truckType === 'Large').map(t => t.id))}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-blue-300 transition-colors"
                                    >
                                        All Large
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTruckIds(trucks.filter(t => t.assignedDriverId && t.truckType === 'Small').map(t => t.id))}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-blue-300 transition-colors"
                                    >
                                        All Small
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-2">
                                <div className="max-h-64 overflow-y-auto pr-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {trucks
                                            .filter(t => t.assignedDriverId)
                                            .filter(t =>
                                                t.registrationNumber.toLowerCase().includes(bulkSearchTerm.toLowerCase()) ||
                                                (t.driverName && t.driverName.toLowerCase().includes(bulkSearchTerm.toLowerCase()))
                                            )
                                            .map(t => {
                                                const isSelected = selectedTruckIds.includes(t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) setSelectedTruckIds(selectedTruckIds.filter(id => id !== t.id));
                                                            else setSelectedTruckIds([...selectedTruckIds, t.id]);
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${isSelected ? 'bg-white dark:bg-gray-800 border-blue-500 ring-2 ring-blue-50' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 grayscale-[0.5] hover:grayscale-0'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300'}`}>
                                                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase truncate">{t.driverName}</span>
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">{t.registrationNumber}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                    {trucks.filter(t => t.assignedDriverId).filter(t =>
                                        t.registrationNumber.toLowerCase().includes(bulkSearchTerm.toLowerCase()) ||
                                        (t.driverName && t.driverName.toLowerCase().includes(bulkSearchTerm.toLowerCase()))
                                    ).length === 0 && (
                                            <div className="py-8 text-center text-slate-400">
                                                <p className="text-xs font-bold uppercase tracking-widest italic">No matching trucks found</p>
                                            </div>
                                        )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                    {selectedTruckIds.length} trucks selected
                                </p>
                                <button type="button" onClick={() => setSelectedTruckIds([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">
                                    Reset Selections
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Volume per truck (Litres)</label>
                            <input required type="number" step="0.01" className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white" placeholder="0.00" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Common Remarks</label>
                            <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white" rows={2} value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} placeholder="e.g. Batch loading from main yard" />
                        </div>
                    </div>

                    <button disabled={formLoading || (assignmentMode === 'Bulk' && selectedTruckIds.length === 0)} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale">
                        {formLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                            <>
                                <ArrowDownCircle className="w-5 h-5" />
                                {assignmentMode === 'Single' ? 'Record Single Disbursement' : `Record Bulk Disbursement to ${selectedTruckIds.length} Trucks`}
                            </>
                        )}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
