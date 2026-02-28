import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, MapPin, Fuel, Phone, Search, Filter, X, Calendar, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';

interface Depot {
    id: string;
    name: string;
    location: string;
    contactInfo: string;
    current_stock?: number;
    purchasePrice?: number;
    totalPurchased?: number; // Total litres purchased
    createdAt: string;
}

interface Purchase {
    id: string;
    quantity: number;
    costPerLitre: number;
    totalCost: number;
    purchaseDate: string;
    status: string;
    createdByName?: string;
}

export function DepotsPage() {
    const { token } = useAuth();
    const [depots, setDepots] = useState<Depot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [editingDepot, setEditingDepot] = useState<Depot | null>(null);
    const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
    const [depotPurchases, setDepotPurchases] = useState<Purchase[]>([]);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [depotToDelete, setDepotToDelete] = useState<Depot | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        contactInfo: '',
        purchasePrice: ''
    });

    useEffect(() => {
        if (token) {
            fetchDepots();
        }
    }, [token]);

    const fetchDepots = async () => {
        try {
            const response = await apiRequest('/api/depots');
            const data = await response.json();

            // Fetch purchases to calculate total purchased per depot
            const purchasesResponse = await apiRequest('/api/purchases');
            const purchasesData = await purchasesResponse.json();
            const purchases = purchasesData.data || [];

            // Calculate total purchased litres per depot (only approved purchases)
            const depotsWithPurchases = (data.data || []).map((depot: Depot) => {
                const depotPurchases = purchases.filter(
                    (p: any) => p.depotId === depot.id && p.status === 'Approved'
                );
                const totalPurchased = depotPurchases.reduce((sum: number, p: any) => sum + p.quantity, 0);
                return { ...depot, totalPurchased };
            });

            // Sort by total purchased (highest to lowest)
            depotsWithPurchases.sort((a: Depot, b: Depot) => (b.totalPurchased || 0) - (a.totalPurchased || 0));

            setDepots(depotsWithPurchases);
        } catch (err) {
            setError('Failed to load depots');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepotPurchases = async (depotId: string) => {
        setLoadingPurchases(true);
        try {
            const response = await apiRequest('/api/purchases');
            const data = await response.json();
            const purchases = (data.data || []).filter((p: any) => p.depotId === depotId);
            setDepotPurchases(purchases);
        } catch (err) {
            setError('Failed to load depot purchases');
        } finally {
            setLoadingPurchases(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = editingDepot
                ? `/api/depots/${editingDepot.id}`
                : '/api/depots';

            const response = await apiRequest(url, {
                method: editingDepot ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSuccess(editingDepot ? 'Depot updated successfully' : 'Depot created successfully');
                setShowAddModal(false);
                setEditingDepot(null);
                setFormData({ name: '', location: '', contactInfo: '', purchasePrice: '' });
                fetchDepots();
            } else {
                const err = await response.json();
                setError(err.message || 'Failed to save depot');
            }
        } catch (err) {
            setError('Error saving depot');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (depot: Depot) => {
        setEditingDepot(depot);
        setFormData({
            name: depot.name,
            location: depot.location,
            contactInfo: depot.contactInfo,
            purchasePrice: (depot.purchasePrice || 0).toString()
        });
        setShowAddModal(true);
    };

    const handleDeleteClick = (depot: Depot) => {
        setDepotToDelete(depot);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!depotToDelete) return;

        setLoading(true);
        try {
            const response = await apiRequest(`/api/depots/${depotToDelete.id}`, { method: 'DELETE' });
            if (response.ok) {
                setSuccess('Depot deleted successfully');
                setShowDeleteConfirmModal(false);
                setDepotToDelete(null);
                fetchDepots();
            } else {
                const err = await response.json();
                setError(err.message || 'Failed to delete depot');
            }
        } catch (err) {
            setError('Error deleting depot');
        } finally {
            setLoading(false);
        }
    };

    const handleViewInventory = (depot: Depot) => {
        setSelectedDepot(depot);
        setShowInventoryModal(true);
        fetchDepotPurchases(depot.id);
    };

    const filteredDepots = depots.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Find the max total purchased for progress bar scaling
    const maxPurchased = Math.max(...depots.map(d => d.totalPurchased || 0), 1);

    if (loading && depots.length === 0) return <div className="p-6 text-center">Loading depots...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Depot Management</h1>
                    <p className="text-gray-600 mt-1">Manage fuel depot locations and monitor real-time stock levels</p>
                </div>
                <button
                    onClick={() => {
                        setEditingDepot(null);
                        setFormData({ name: '', location: '', contactInfo: '', purchasePrice: '' });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Depot
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">×</button>
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between items-center animate-in fade-in-from-top-2">
                    <span className="text-sm">{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-green-900 hover:text-green-700">×</button>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by depot name or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Depot Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDepots.map(depot => {
                    const totalPurchased = depot.totalPurchased || 0;
                    const purchasePercentage = maxPurchased > 0 ? (totalPurchased / maxPurchased) * 100 : 0;
                    const canDelete = totalPurchased === 0;

                    return (
                        <div key={depot.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-600">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <MapPin className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{depot.name}</h3>
                                        <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="text-xs">{depot.location || 'Location not set'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(depot)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Edit Depot"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteClick(depot)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete Depot"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Total Purchased Section */}
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Purchased</span>
                                        </div>
                                        <span className="text-sm font-bold text-blue-900">{totalPurchased.toLocaleString()} L</span>
                                    </div>
                                    <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                            style={{ width: `${purchasePercentage}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-blue-700 mt-1">
                                        {purchasePercentage.toFixed(1)}% of highest depot
                                    </p>
                                </div>

                                {/* Contact Section */}
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-xs text-gray-400 font-medium uppercase">Contact Details</span>
                                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">
                                            {depot.contactInfo || 'No contact details provided'}
                                        </p>
                                    </div>
                                </div>

                                {/* Purchase Price Section */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Purchase Price</span>
                                    <span className="text-sm font-black text-gray-900">₦{(depot.purchasePrice || 0).toLocaleString()} <span className="text-[10px] text-gray-400">/L</span></span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleViewInventory(depot)}
                                className="w-full mt-6 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 group/btn"
                            >
                                <span>View Full Inventory</span>
                                <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Add / Edit Depot Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setEditingDepot(null); }}
                title={editingDepot ? 'Edit Depot Details' : 'Register New Depot'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Depot Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Apex Fuel Depot"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Location / Region</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Port Harcourt, Rivers State"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Information</label>
                        <textarea
                            value={formData.contactInfo}
                            onChange={e => setFormData({ ...formData, contactInfo: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                            placeholder="Phone numbers, email addresses, or site manager details..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Price (per Litre)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.purchasePrice}
                                onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => { setShowAddModal(false); setEditingDepot(null); }}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>{editingDepot ? 'Update Depot' : 'Register Depot'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Inventory Modal */}
            <Modal
                isOpen={showInventoryModal}
                onClose={() => setShowInventoryModal(false)}
                title={`${selectedDepot?.name} - Purchase History`}
                size="xl"
            >
                <div className="space-y-4">
                    {/* Depot Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase">Location</p>
                                <p className="text-sm font-semibold text-blue-900 mt-1">{selectedDepot?.location}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase">Total Purchased</p>
                                <p className="text-sm font-semibold text-blue-900 mt-1">{(selectedDepot?.totalPurchased || 0).toLocaleString()} L</p>
                            </div>
                        </div>
                    </div>

                    {/* Purchases Table */}
                    {loadingPurchases ? (
                        <div className="text-center py-8 text-gray-500">Loading purchases...</div>
                    ) : depotPurchases.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No purchases found for this depot</div>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Date</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Cost/Litre</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Total Cost</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Created By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {depotPurchases.map((purchase, index) => (
                                        <tr key={purchase.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                            <td className="py-3 px-4 text-sm text-gray-900">
                                                {new Date(purchase.purchaseDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                {purchase.quantity.toLocaleString()} L
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900">
                                                ₦{purchase.costPerLitre.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                                                ₦{purchase.totalCost.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${purchase.status === 'Approved' ? 'bg-gray-900 text-white' :
                                                    purchase.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {purchase.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {purchase.createdByName || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => setShowInventoryModal(false)}
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirmModal}
                onClose={() => { setShowDeleteConfirmModal(false); setDepotToDelete(null); }}
                title="Confirm Depot Deletion"
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-900">Are you sure you want to delete this depot?</p>
                            <p className="text-xs text-red-700 mt-1">This action is permanent and cannot be undone.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <MapPin className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{depotToDelete?.name}</h4>
                                <p className="text-xs text-gray-500">{depotToDelete?.location}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Litres</span>
                                <p className="text-sm font-bold text-gray-900">0 L</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                                <p className="text-sm font-semibold text-green-600">Eligible for deletion</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => { setShowDeleteConfirmModal(false); setDepotToDelete(null); }}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            No, Keep it
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={loading}
                            className="px-8 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Deleting...</span>
                                </>
                            ) : (
                                <span>Yes, Delete Depot</span>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

const AlertCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
