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
        try {
            const resp = await apiRequest(`/api/inwardloads/${id}/approve`, { method: 'POST' });
            if (resp.ok) {
                toast.success("Load approved");
                fetchLoads();
            }
        } catch (err) { }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Disbursements</h1>
                    <p className="text-gray-500 mt-1">Assign fuel directly from company/depots to trucks</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-sm">
                    <Plus className="w-4 h-4" /> Record New Disbursement
                </button>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by truck, driver or depot..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 bg-blue-50/30 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">
                        Tip: Bulk disbursements can be approved as a single batch on the <a href="/approvals" className="underline hover:text-blue-900 transition-colors">Approvals Page</a>
                    </p>
                </div>
                {loading ? (
                    <div className="py-20 flex flex-col items-center text-gray-300 gap-4"><Loader2 className="animate-spin" /><p className="text-xs font-bold uppercase tracking-widest">Fetching Disbursements...</p></div>
                ) : loads.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        <ArrowDownCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm">No disbursements recorded yet.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Source</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loads
                                .filter(l =>
                                    l.truckRegNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    l.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (l.depotName || 'Direct Company Load').toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">{l.truckRegNumber}</span>
                                                <span className="text-xs text-gray-400 font-semibold">{l.driverName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-xs font-semibold text-gray-700">{l.depotName || 'Direct Company Load'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-gray-900">{l.quantity.toLocaleString()} L</td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-semibold">{new Date(l.loadDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {l.status === 'Pending' && (
                                                <button onClick={() => handleApprove(l.id)} className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-100 hover:bg-green-100">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={showAddModal} onClose={() => !formLoading && setShowAddModal(false)} title="Record Company Disbursement" size="lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Assignment Mode Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setAssignmentMode('Single')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${assignmentMode === 'Single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Single Truck
                        </button>
                        <button
                            type="button"
                            onClick={() => setAssignmentMode('Bulk')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${assignmentMode === 'Bulk' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Bulk Assignment
                        </button>
                    </div>

                    {assignmentMode === 'Single' ? (
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Target Truck</label>
                            <div
                                className={`flex items-center gap-3 p-3 bg-gray-50 border rounded-xl cursor-pointer transition-all ${showTruckDropdown ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-100'}`}
                                onClick={() => setShowTruckDropdown(!showTruckDropdown)}
                            >
                                <TruckIcon className="w-4 h-4 text-gray-400" />
                                <span className={`text-xs font-bold flex-1 ${formData.truckId ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {trucks.find(t => t.id === formData.truckId) ?
                                        `${trucks.find(t => t.id === formData.truckId)?.driverName} (${trucks.find(t => t.id === formData.truckId)?.registrationNumber})`
                                        : 'Search driver name or truck...'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTruckDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {showTruckDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 border-b border-gray-50">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search driver or registration..."
                                            value={truckSearchTerm}
                                            onChange={(e) => setTruckSearchTerm(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            className="w-full p-2 bg-gray-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-0"
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
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{t.driverName || 'No Driver Assigned'}</span>
                                                    <span className="text-xs font-black text-gray-900">{t.registrationNumber}</span>
                                                </div>
                                                {formData.truckId === t.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Bulk Filters & Search */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Quick filter fleet (search name or truck)..."
                                        value={bulkSearchTerm}
                                        onChange={e => setBulkSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                                    >
                                        Deselect Filtered
                                    </button>
                                    <div className="w-[1px] h-4 bg-slate-200 my-auto mx-1" />
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTruckIds(trucks.filter(t => t.assignedDriverId && t.truckType === 'Large').map(t => t.id))}
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-blue-300 transition-colors"
                                    >
                                        All Large
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTruckIds(trucks.filter(t => t.assignedDriverId && t.truckType === 'Small').map(t => t.id))}
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-blue-300 transition-colors"
                                    >
                                        All Small
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 p-2">
                                <div className="max-h-64 overflow-y-auto pr-1">
                                    <div className="grid grid-cols-2 gap-2">
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
                                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${isSelected ? 'bg-white border-blue-500 ring-2 ring-blue-50' : 'bg-gray-50 border-gray-100 grayscale-[0.5] hover:grayscale-0'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-[10px] font-black text-blue-600 uppercase truncate">{t.driverName}</span>
                                                            <span className="text-xs font-black text-slate-900">{t.registrationNumber}</span>
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
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                    {selectedTruckIds.length} trucks selected
                                </p>
                                <button type="button" onClick={() => setSelectedTruckIds([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">
                                    Reset Selections
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Volume per truck (Litres)</label>
                            <input required type="number" step="0.01" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Common Remarks</label>
                            <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} placeholder="e.g. Batch loading from main yard" />
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
