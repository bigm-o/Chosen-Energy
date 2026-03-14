import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Filter, Truck as TruckIcon, Eye, AlertTriangle, Edit, Trash2, X, CheckCircle2, AlertCircle, ChevronDown, User, Search } from 'lucide-react';
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
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

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

    const filteredTrucks = trucks.filter(t => {
        const matchesSearch = 
            (t.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        const matchesType = typeFilter === 'All' || t.truckType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Truck Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and manage your fleet of diesel tankers</p>
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
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">×</button>
                </div>
            )}

            {/* Stats Cards */}
            <div id="fleet-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Trucks</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.maintenance}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.assigned}/{stats.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Advanced Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1 w-full relative group">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by registration, driver name, or fleet ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none transition-all shadow-sm text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                
                <div className="relative w-full md:w-auto">
                    <button 
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl font-bold text-sm transition-all shadow-sm
                            ${showFilterDropdown ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        {statusFilter !== 'All' || typeFilter !== 'All' ? 'Filters Applied' : 'Filters'}
                        <ChevronDown className={`w-3 h-3 ml-2 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showFilterDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-[60] p-4 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Truck Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['All', 'Active', 'Maintenance', 'Inactive'].map(s => (
                                        <button 
                                            key={s}
                                            onClick={() => setStatusFilter(s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                                ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Capacity Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['All', 'Large', 'Small'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setTypeFilter(t)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                                ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-50 dark:border-gray-800 flex justify-between">
                                <button 
                                    onClick={() => { setStatusFilter('All'); setTypeFilter('All'); }}
                                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                                >
                                    Reset Filters
                                </button>
                                <button 
                                    onClick={() => setShowFilterDropdown(false)}
                                    className="text-[10px] font-black text-gray-400 uppercase hover:text-gray-900"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Truck Cards Grid */}
            {filteredTrucks.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="mx-auto h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No trucks found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get started by adding a new truck to your fleet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrucks.map((truck) => (
                        <div key={truck.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <TruckIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{truck.registrationNumber}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Fleet ID: {truck.id.substring(0, 6)}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${truck.status === 'Active' ? 'bg-green-100 text-green-700' :
                                    truck.status === 'Maintenance' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 dark:bg-gray-800 text-gray-700'
                                    }`}>
                                    {truck.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{(truck.capacityLitres || 0).toLocaleString()} L</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {(truck.capacityLitres || 0) >= 30000 ? 'Large Tanker' : 'Medium Tanker'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Driver:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{truck.driverName || 'Unassigned'}</span>
                                </div>
                                {truck.nextMaintenanceDate && (
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="text-gray-600 dark:text-gray-400">Next Service:</span>
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
                                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white transition-colors"
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
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TruckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{viewingTruck.registrationNumber}</h3>
                            </div>
                            <button onClick={() => setViewingTruck(null)}><X className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Maintenance Alert */}
                            {viewingTruck.nextMaintenanceDate && new Date(viewingTruck.nextMaintenanceDate) < new Date() && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
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
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 bg-red-50 dark:bg-red-900/30 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Truck
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${viewingTruck.status === 'Active' ? 'bg-green-100 text-green-700' : viewingTruck.status === 'Maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${viewingTruck.status === 'Active' ? 'bg-green-500' : viewingTruck.status === 'Maintenance' ? 'bg-orange-500' : 'bg-gray-500'}`} />
                                        {viewingTruck.status}
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">Capacity</p>
                                    <p className="font-bold text-gray-900 dark:text-gray-100">{viewingTruck.capacityLitres.toLocaleString()} Litres</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1 col-span-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">Assigned Driver</p>
                                    {viewingTruck.driverName ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                                                {viewingTruck.driverName.substring(0, 1)}
                                            </div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{viewingTruck.driverName}</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 dark:text-gray-500 italic mt-1">No driver assigned</p>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Registration Number</label>
                        <input
                            type="text"
                            value={formData.registrationNumber}
                            onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="e.g., LAG-001-AA"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity (Litres)</label>
                        <input
                            type="number"
                            value={formData.capacityLitres}
                            onChange={e => setFormData({ ...formData, capacityLitres: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            placeholder="e.g., 33000"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Truck Category</label>
                        <select
                            value={formData.truckType}
                            onChange={e => setFormData({ ...formData, truckType: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                            <option value="Large">Large (Tanker)</option>
                            <option value="Small">Small (Van/Utility)</option>
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-1">Assigned Driver</label>
                        <div
                            className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-xl cursor-pointer transition-all ${showDriverDropdown ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'}`}
                            onClick={() => setShowDriverDropdown(!showDriverDropdown)}
                        >
                            <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className={`text-sm font-medium flex-1 ${formData.assignedDriverId ? 'text-gray-900' : 'text-gray-400'}`}>
                                {drivers.find(d => d.id === formData.assignedDriverId)?.fullName || 'Select driver for assignment...'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDriverDropdown ? 'rotate-180' : ''}`} />
                        </div>

                        {showDriverDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-[60] overflow-hidden">
                                <div className="p-2 border-b border-gray-50">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search driver name..."
                                        value={driverSearchTerm}
                                        onChange={(e) => setDriverSearchTerm(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="w-full p-2 bg-gray-50 dark:bg-gray-900/50 border-none rounded-lg text-sm font-medium outline-none focus:ring-0 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => { setFormData({ ...formData, assignedDriverId: '' }); setShowDriverDropdown(false); }}
                                        className="w-full p-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 hover:bg-gray-50 transition-colors"
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
                                            className="w-full p-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-t border-gray-50 hover:bg-blue-50 transition-colors flex items-center justify-between"
                                        >
                                            {d.fullName}
                                            {formData.assignedDriverId === d.id && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
                            Note: If you select a driver who is already assigned to another truck, they will be reassigned to this one.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                            <option value="Active">Active</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maintenance Interval (Days)</label>
                        <input
                            type="number"
                            value={formData.maintenanceIntervalDays}
                            onChange={e => setFormData({ ...formData, maintenanceIntervalDays: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="e.g., 90"
                            min="1"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default is 90 days.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowFormModal(false)}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
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
