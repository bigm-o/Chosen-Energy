import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, Wrench, Truck, Eye, PenTool, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal } from '@/app/components/Modal';
import { apiRequest } from '@/utils/api';
import { toast } from 'sonner';

interface MaintenanceLog {
    id: string;
    truckId: string;
    truckRegNumber: string;
    type: string;
    description: string;
    cost: number;
    scheduledDate: string;
    completedDate: string | null;
    status: string;
    createdByName: string;
}

interface Truck {
    id: string;
    registrationNumber: string;
    status: string;
}

export function MaintenancePage() {
    const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        truckId: '',
        type: 'Preventive',
        cost: '',
        description: '',
        scheduledDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsRes, trucksRes] = await Promise.all([
                apiRequest('/api/maintenance'),
                apiRequest('/api/trucks')
            ]);

            const logsData = await logsRes.json();
            const trucksData = await trucksRes.json();

            setMaintenanceLogs(logsData.data || []);
            setTrucks(trucksData.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load maintenance data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiRequest('/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    truckId: formData.truckId,
                    type: formData.type,
                    cost: parseFloat(formData.cost) || 0,
                    description: formData.description,
                    scheduledDate: formData.scheduledDate
                })
            });

            if (response.ok) {
                toast.success("Maintenance logged successfully");
                setShowAddModal(false);
                setFormData({ truckId: '', type: 'Preventive', cost: '', description: '', scheduledDate: new Date().toISOString().split('T')[0] });
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to log maintenance");
            }
        } catch (err) {
            toast.error("Error logging maintenance");
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm("Mark this maintenance as completed? Truck will return to Active status.")) return;

        try {
            const response = await apiRequest(`/api/maintenance/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Completed' }) // Send as string just in case, match with enum string converter
            });

            if (response.ok) {
                toast.success("Maintenance marked as completed");
                fetchData();
            } else {
                toast.error("Failed to update status");
            }
        } catch (err) {
            toast.error("Error updating status");
        }
    };

    const inWorkshop = trucks.filter(t => t.status === 'Maintenance').length;
    const completedMonth = maintenanceLogs.filter(l => l.status === 'Completed' && new Date(l.completedDate!).getMonth() === new Date().getMonth()).length;
    const totalCost = maintenanceLogs.reduce((sum, l) => sum + l.cost, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fleet Maintenance"
                subtitle="Track repairs and preventive maintenance for all company tankers"
                action={{
                    label: 'Log Repair',
                    onClick: () => setShowAddModal(true),
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Maintenance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">In Workshop</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{inWorkshop}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Completed (Month)</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{completedMonth}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Maintenance Cost</p>
                    <p className="text-2xl font-black text-blue-600">₦{(totalCost / 1000000).toFixed(2)}M</p>
                </div>
            </div>

            {maintenanceLogs.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-32 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wrench className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Maintenance Logs</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Start tracking fleet health by logging a new maintenance entry.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all text-sm"
                    >
                        Log New Maintenance Entry
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Truck</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Cost</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Scheduled</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {maintenanceLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 font-bold text-gray-900">{log.truckRegNumber}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            {log.type === 'Preventive' ? <CheckCircle className="w-4 h-4 text-blue-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                                            <span className="text-sm text-gray-700">{log.type}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{log.description}</td>
                                    <td className="py-3 px-4 text-sm font-bold text-gray-900">₦{log.cost.toLocaleString()}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${log.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                            log.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">{new Date(log.scheduledDate).toLocaleDateString()}</td>
                                    <td className="py-3 px-4 text-right">
                                        {log.status !== 'Completed' && (
                                            <button
                                                onClick={() => handleComplete(log.id)}
                                                className="text-green-600 hover:text-green-800 text-sm font-bold flex items-center gap-1 justify-end ml-auto"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Complete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Log Truck Maintenance" size="md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Tanker</label>
                        <select
                            value={formData.truckId}
                            onChange={e => setFormData({ ...formData, truckId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Truck</option>
                            {trucks.map(t => (
                                <option key={t.id} value={t.id}>{t.registrationNumber} ({t.status})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Service Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'Preventive' })}
                                className={`p-3 border rounded-xl text-xs font-bold flex flex-col items-center gap-2 transition-colors ${formData.type === 'Preventive'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                            >
                                <Wrench className="w-4 h-4" />
                                Preventive
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'Breakdown' })}
                                className={`p-3 border rounded-xl text-xs font-bold flex flex-col items-center gap-2 transition-colors ${formData.type === 'Breakdown'
                                    ? 'border-red-600 bg-red-50 text-red-700'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Breakdown
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estimated Cost (₦)</label>
                        <input
                            type="number"
                            value={formData.cost}
                            onChange={e => setFormData({ ...formData, cost: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg h-24 focus:ring-2 focus:ring-blue-500"
                            placeholder="Brief details of service..."
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Log & Submit</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
