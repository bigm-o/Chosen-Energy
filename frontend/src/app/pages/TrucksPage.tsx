import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Filter, Truck as TruckIcon, Eye, AlertTriangle, Edit, Trash2, X, CheckCircle2, AlertCircle, ChevronDown, User } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface TruckItem {
    id: string;
    registrationNumber: string;
    capacityLitres: number;
    status: string;
    assignedDriverId?: string;
    driverName?: string;
    currentLoad?: number;
    truckType: string;

    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    maintenanceIntervalDays: number;
    createdAt: string;
}

interface Driver {
    id: string;
    fullName: string;
}

export function TrucksPage() {
    const { token } = useAuth();
    const [trucks, setTrucks] = useState<TruckItem[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [viewingTruck, setViewingTruck] = useState<TruckItem | null>(null);
    const [editingTruck, setEditingTruck] = useState<TruckItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        registrationNumber: '',
        capacityLitres: '',
        status: 'Active',
        assignedDriverId: '',
        truckType: 'Large',
        maintenanceIntervalDays: 90
    });

    const [driverSearchTerm, setDriverSearchTerm] = useState('');
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [trucksRes, driversRes] = await Promise.all([
                apiRequest('/api/trucks'),
                apiRequest('/api/drivers')
            ]);

            const trucksData = await trucksRes.json();
            const driversData = await driversRes.json();

            setTrucks(trucksData.data || []);
            setDrivers(driversData.data || []);
        } catch (err) {
            console.error("Error loading truck data:", err);
            setError('Failed to load fleet data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (truck: TruckItem) => {
        setEditingTruck(truck);
        setFormData({
            registrationNumber: truck.registrationNumber,
            capacityLitres: truck.capacityLitres.toString(),
            status: truck.status,
            assignedDriverId: truck.assignedDriverId || '',
            truckType: truck.truckType || 'Large',
            maintenanceIntervalDays: truck.maintenanceIntervalDays || 90
        });
        setViewingTruck(null);
        setShowFormModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this truck?')) return;

        try {
            const response = await apiRequest(`/api/trucks/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Truck deleted successfully');
                setViewingTruck(null);
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.message || 'Failed to delete truck');
            }
        } catch (err) {
            toast.error('An error occurred');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = editingTruck
                ? `/api/trucks/${editingTruck.id}`
                : '/api/trucks';

            const method = editingTruck ? 'PUT' : 'POST';

            const response = await apiRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registrationNumber: formData.registrationNumber,
                    capacityLitres: parseFloat(formData.capacityLitres),
                    status: formData.status,
                    assignedDriverId: formData.assignedDriverId || null,
                    truckType: formData.truckType,
                    maintenanceIntervalDays: parseInt(formData.maintenanceIntervalDays.toString())
                })
            });

            if (response.ok) {
                toast.success(`Truck ${editingTruck ? 'updated' : 'created'} successfully`);
                setShowFormModal(false);
                setEditingTruck(null);
                setFormData({ registrationNumber: '', capacityLitres: '', status: 'Active', assignedDriverId: '', truckType: 'Large', maintenanceIntervalDays: 90 });
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.message || `Failed to ${editingTruck ? 'update' : 'create'} truck`);
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTruck(null);
        setFormData({ registrationNumber: '', capacityLitres: '', status: 'Active', assignedDriverId: '', truckType: 'Large', maintenanceIntervalDays: 90 });
        setShowFormModal(true);
    };

    const filteredTrucks = trucks.filter(t =>
        (t.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: trucks.length,
        active: trucks.filter(t => t.status === 'Active').length,
        maintenance: trucks.filter(t => t.status === 'Maintenance').length,
        assigned: trucks.filter(t => t.assignedDriverId).length
    };

    if (loading && trucks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Truck Management</h1>
                    <p className="text-gray-600 mt-1">Monitor and manage your fleet of diesel tankers</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Truck
                </button>
            </div>

            {/* Alerts - Removed manual success/error alerts in favor of Sonner toast */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">×</button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Trucks</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Maintenance</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.maintenance}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Assigned</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.assigned}/{stats.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by truck ID, number, or driver..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Truck Cards Grid */}
            {filteredTrucks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">No trucks found</h3>
                    <p className="text-sm text-gray-500 mt-1">Get started by adding a new truck to your fleet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrucks.map((truck) => (
                        <div key={truck.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <TruckIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{truck.registrationNumber}</h3>
                                        <p className="text-sm text-gray-500">Fleet ID: {truck.id.substring(0, 6)}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${truck.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    truck.status === 'Maintenance' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {truck.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Capacity:</span>
                                    <span className="font-semibold text-gray-900">{(truck.capacityLitres || 0).toLocaleString()} L</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-semibold text-gray-900">
                                        {(truck.capacityLitres || 0) >= 30000 ? 'Large Tanker' : 'Medium Tanker'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Driver:</span>
                                    <span className="font-semibold text-gray-900">{truck.driverName || 'Unassigned'}</span>
                                </div>
                                {truck.nextMaintenanceDate && (
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                                        <span className="text-gray-600">Next Service:</span>
                                        <span className={`font-semibold ${new Date(truck.nextMaintenanceDate) < new Date() ? 'text-red-600' :
                                            new Date(truck.nextMaintenanceDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-orange-600' : 'text-green-600'
                                            }`}>
                                            {new Date(truck.nextMaintenanceDate).toLocaleDateString('en-GB')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setViewingTruck(truck)}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm font-medium">View Details</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Truck Details Modal */}
            {viewingTruck && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TruckIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">{viewingTruck.registrationNumber}</h3>
                            </div>
                            <button onClick={() => setViewingTruck(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Maintenance Alert */}
                            {viewingTruck.nextMaintenanceDate && new Date(viewingTruck.nextMaintenanceDate) < new Date() && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-red-900">Maintenance Overdue</p>
                                        <p className="text-sm text-red-700">This truck was due for service on {new Date(viewingTruck.nextMaintenanceDate).toLocaleDateString()}. Please schedule maintenance immediately.</p>
                                    </div>
                                </div>
                            )}

                            {/* Actions Toolbar */}
                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => handleEdit(viewingTruck)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors"
                                >
                                    <Edit className="w-4 h-4" /> Edit Truck
                                </button>
                                <button
                                    onClick={() => handleDelete(viewingTruck.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Truck
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${viewingTruck.status === 'Active' ? 'bg-green-100 text-green-700' : viewingTruck.status === 'Maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${viewingTruck.status === 'Active' ? 'bg-green-500' : viewingTruck.status === 'Maintenance' ? 'bg-orange-500' : 'bg-gray-500'}`} />
                                        {viewingTruck.status}
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Capacity</p>
                                    <p className="font-bold text-gray-900">{viewingTruck.capacityLitres.toLocaleString()} Litres</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1 col-span-2">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest">Assigned Driver</p>
                                    {viewingTruck.driverName ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                                                {viewingTruck.driverName.substring(0, 1)}
                                            </div>
                                            <p className="font-medium text-gray-900">{viewingTruck.driverName}</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 italic mt-1">No driver assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assessment / Form Modal */}
            <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingTruck ? "Edit Truck" : "Add New Truck"} size="md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                        <input
                            type="text"
                            value={formData.registrationNumber}
                            onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., LAG-001-AA"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (Litres)</label>
                        <input
                            type="number"
                            value={formData.capacityLitres}
                            onChange={e => setFormData({ ...formData, capacityLitres: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 33000"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Truck Category</label>
                        <select
                            value={formData.truckType}
                            onChange={e => setFormData({ ...formData, truckType: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="Large">Large (Tanker)</option>
                            <option value="Small">Small (Van/Utility)</option>
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2 px-1">Assigned Driver</label>
                        <div
                            className={`flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer transition-all ${showDriverDropdown ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'}`}
                            onClick={() => setShowDriverDropdown(!showDriverDropdown)}
                        >
                            <User className="w-4 h-4 text-gray-400" />
                            <span className={`text-sm font-medium flex-1 ${formData.assignedDriverId ? 'text-gray-900' : 'text-gray-400'}`}>
                                {drivers.find(d => d.id === formData.assignedDriverId)?.fullName || 'Select driver for assignment...'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDriverDropdown ? 'rotate-180' : ''}`} />
                        </div>

                        {showDriverDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] overflow-hidden">
                                <div className="p-2 border-b border-gray-50">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search driver name..."
                                        value={driverSearchTerm}
                                        onChange={(e) => setDriverSearchTerm(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="w-full p-2 bg-gray-50 border-none rounded-lg text-sm font-medium outline-none focus:ring-0"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => { setFormData({ ...formData, assignedDriverId: '' }); setShowDriverDropdown(false); }}
                                        className="w-full p-3 text-left text-xs font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                                    >
                                        Unassign / Clear
                                    </button>
                                    {drivers.filter(d => d.fullName.toLowerCase().includes(driverSearchTerm.toLowerCase())).map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, assignedDriverId: d.id });
                                                setShowDriverDropdown(false);
                                            }}
                                            className="w-full p-3 text-left text-sm font-medium text-gray-900 border-t border-gray-50 hover:bg-blue-50 transition-colors flex items-center justify-between"
                                        >
                                            {d.fullName}
                                            {formData.assignedDriverId === d.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2 px-1">
                            Note: If you select a driver who is already assigned to another truck, they will be reassigned to this one.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="Active">Active</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Interval (Days)</label>
                        <input
                            type="number"
                            value={formData.maintenanceIntervalDays}
                            onChange={e => setFormData({ ...formData, maintenanceIntervalDays: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 90"
                            min="1"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Default is 90 days.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowFormModal(false)}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (editingTruck ? 'Update Truck' : 'Add Truck')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
