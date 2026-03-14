import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Users, Eye, Phone, Mail, User, Search, AlertCircle, Edit, Trash2, CheckCircle, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';

interface CustomerItem {
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    totalLitresBought: number;
    createdAt: string;
}

export function CustomersPage() {
    const { token } = useAuth();
    const [customers, setCustomers] = useState<CustomerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
    const [viewingCustomer, setViewingCustomer] = useState<CustomerItem | null>(null);
    const [customerHistory, setCustomerHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [formData, setFormData] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (token) {
            fetchCustomers();
        }
    }, [token]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await apiRequest('/api/customers');
            if (!response.ok) throw new Error('Failed to fetch customers');

            const data = await response.json();
            setCustomers(data.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load customers. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const url = editingCustomer
                ? `/api/customers/${editingCustomer.id}`
                : '/api/customers';

            const response = await apiRequest(url, {
                method: editingCustomer ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSuccess(editingCustomer ? 'Customer updated successfully' : 'Customer added successfully');
                setShowAddModal(false);
                setEditingCustomer(null);
                setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '' });
                fetchCustomers();
            } else {
                const err = await response.json();
                setError(err.message || 'Failed to save customer');
            }
        } catch (err) {
            setError('Error saving customer');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (customer: CustomerItem) => {
        setEditingCustomer(customer);
        setFormData({
            companyName: customer.companyName,
            contactPerson: customer.contactPerson,
            email: customer.email,
            phone: customer.phone,
            address: customer.address
        });
        setShowAddModal(true);
    };

    const handleDeleteClick = (customer: CustomerItem) => {
        setCustomerToDelete(customer);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        setLoading(true);
        try {
            const response = await apiRequest(`/api/customers/${customerToDelete.id}`, { method: 'DELETE' });
            if (response.ok) {
                setSuccess('Customer deleted successfully');
                setShowDeleteModal(false);
                setCustomerToDelete(null);
                fetchCustomers();
            } else {
                const err = await response.json();
                setError(err.message || 'Failed to delete customer');
            }
        } catch (err) {
            setError('Error deleting customer');
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = async (customer: CustomerItem) => {
        setViewingCustomer(customer);
        setLoadingHistory(true);
        try {
            const response = await apiRequest(`/api/customers/${customer.id}/history`);
            if (response.ok) {
                const data = await response.json();
                setCustomerHistory(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const filteredCustomers = customers.filter(c =>
        (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: customers.length,
        totalLitres: customers.reduce((sum, c) => sum + (c.totalLitresBought || 0), 0),
    };

    if (loading && customers.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage customer accounts and track supply history</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCustomer(null);
                        setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '' });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Customer
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">×</button>
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 text-green-700 rounded-lg flex justify-between">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-green-900 hover:text-green-700">×</button>
                </div>
            )}

            <div id="customer-balances" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Customers</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Volume Sold</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalLitres.toLocaleString()} L</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Engagement</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Active</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No customers found</h3>
                </div>
            ) : (
                <div id="customer-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map((customer, index) => (
                        <div key={customer.id} className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all relative">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(customer)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded-lg">
                                    <Edit className="w-4 h-4" />
                                </button>
                                {customer.totalLitresBought === 0 && (
                                    <button onClick={() => handleDeleteClick(customer)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100">
                                    {getInitials(customer.companyName)}
                                </div>
                                <div className="pr-10">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{customer.companyName}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CUS-{String(index + 1).padStart(3, '0')}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4" />
                                    <span>{customer.contactPerson}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4" />
                                    <span>{customer.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4" />
                                    <span>{customer.email}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleViewProfile(customer)}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-900 dark:text-gray-100"
                            >
                                <Eye className="w-4 h-4" />
                                View History
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); setEditingCustomer(null); }}
                title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                                <input
                                    type="text"
                                    value={formData.contactPerson}
                                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                            <textarea
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={3}
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!viewingCustomer}
                onClose={() => setViewingCustomer(null)}
                title="Customer History"
                size="lg"
            >
                {viewingCustomer && (
                    <div className="space-y-4">
                        <div className="bg-gray-50/50 dark:bg-gray-900/60 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-900 dark:text-white">{viewingCustomer.companyName}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{viewingCustomer.contactPerson} | {viewingCustomer.email}</p>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="px-4 py-2 font-bold uppercase text-[10px] text-gray-500 dark:text-gray-200">Date</th>
                                        <th className="px-4 py-2 font-bold uppercase text-[10px] text-gray-500 dark:text-gray-200">Qty (L)</th>
                                        <th className="px-4 py-2 font-bold uppercase text-[10px] text-gray-500 dark:text-gray-200">Amount</th>
                                        <th className="px-4 py-2 font-bold uppercase text-[10px] text-gray-500 dark:text-gray-200">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {customerHistory.map(sale => (
                                        <tr key={sale.id} className="border-b border-gray-100 dark:border-gray-800">
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{new Date(sale.supplyDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{sale.quantity.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-bold">₦{sale.totalAmount.toLocaleString()}</td>
                                            <td className="px-4 py-2">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                                                    {sale.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {customerHistory.length === 0 && !loadingHistory && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Customer"
                size="md"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete <span className="font-bold">{customerToDelete?.companyName}</span>?</p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                        <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
