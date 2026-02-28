import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { Plus, Download, Filter, Search, Loader2, ArrowDownCircle, MapPin, Truck, User, Info, CheckCircle, XCircle } from 'lucide-react';
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
        depotId: '',
        quantity: '',
        remarks: ''
    });

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
            const [t, d] = await Promise.all([
                apiRequest('/api/trucks'),
                apiRequest('/api/depots')
            ]);
            const trks = await t.json();
            const dpts = await d.json();
            setTrucks(trks.data || []);
            setDepots(dpts.data || []);
        } catch (err) { }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const truck = trucks.find(t => t.id === formData.truckId);
        if (!truck?.assignedDriverId) {
            toast.error("Selected truck must have an assigned driver");
            return;
        }

        setFormLoading(true);
        try {
            const resp = await apiRequest('/api/inwardloads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    truckId: formData.truckId,
                    driverId: truck.assignedDriverId,
                    depotId: formData.depotId,
                    quantity: parseFloat(formData.quantity),
                    remarks: formData.remarks
                })
            });

            if (resp.ok) {
                toast.success("Inward load recorded!");
                setShowAddModal(false);
                fetchLoads();
            }
        } catch (err) { }
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
                    <h1 className="text-2xl font-bold text-gray-900">Inward Loads</h1>
                    <p className="text-gray-500 mt-1">Assign fuel directly from company/depots to trucks</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-sm">
                    <Plus className="w-4 h-4" /> Record New Load
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center text-gray-300 gap-4"><Loader2 className="animate-spin" /><p className="text-xs font-bold uppercase tracking-widest">Fetching Loads...</p></div>
                ) : loads.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        <ArrowDownCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm">No inward loads recorded yet.</p>
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
                            {loads.map(l => (
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

            <Modal isOpen={showAddModal} onClose={() => !formLoading && setShowAddModal(false)} title="Record Company Load">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Truck</label>
                            <select required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" value={formData.truckId} onChange={e => setFormData({ ...formData, truckId: e.target.value })}>
                                <option value="">Select Truck</option>
                                {trucks.map(t => <option key={t.id} value={t.id}>{t.registrationNumber}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Depot</label>
                            <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" value={formData.depotId} onChange={e => setFormData({ ...formData, depotId: e.target.value })}>
                                <option value="">Company Direct</option>
                                {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Volume (Litres)</label>
                        <input required type="number" step="0.01" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-black" placeholder="0.00" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks</label>
                        <textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium" rows={3} value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} placeholder="e.g. Loading permit #123" />
                    </div>
                    <button disabled={formLoading} type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                        {formLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Record Load Assignment'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
