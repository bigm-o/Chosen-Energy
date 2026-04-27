import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Filter, Download, Eye, CheckCircle, XCircle, Edit2, Calendar, AlertCircle, FileText, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';

interface Purchase {
  id: string;
  purchaseId?: string;
  depotId?: string;
  depotName: string;
  quantity: number;
  costPerLitre: number;
  totalCost: number;
  status: string;
  purchaseDate: string;
  receiptUrl?: string;
  createdByName?: string;
  approvedByName?: string;
  editedByName?: string;
  hasPendingEdit?: boolean;
  originalValues?: string;
  rejectionReason?: string;
  editReason?: string;
  createdAt?: string;
}

interface Depot {
  id: string;
  name: string;
}

export function PurchasingPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'approve-edit' | 'reject-edit'>('approve');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  // Export date range
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    depotId: '',
    quantity: '',
    costPerLitre: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    editReason: '',
    receiptFile: null as File | null
  });

  useEffect(() => {
    fetchPurchases();
    fetchDepots();
  }, []);

  useEffect(() => {
    // Apply search filter
    let filtered = purchases;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        (p.depotName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredPurchases(filtered);
  }, [purchases, searchTerm]);

  const fetchPurchases = async () => {
    try {
      const response = await apiRequest('/api/purchases');
      const data = await response.json();
      setPurchases(data.data || []);
    } catch (err) {
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepots = async () => {
    try {
      const response = await apiRequest('/api/depots');
      const data = await response.json();
      setDepots(data.data || []);
    } catch (err) {
      console.error('Error loading depots', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        depotId: formData.depotId,
        quantity: parseFloat(formData.quantity),
        costPerLitre: parseFloat(formData.costPerLitre),
        purchaseDate: formData.purchaseDate
      };

      const response = await apiRequest('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess(user?.role === 'MD' ? 'Purchase created and approved automatically' : 'Purchase created successfully. Awaiting MD approval.');
        setShowAddModal(false);
        setFormData({ depotId: '', quantity: '', costPerLitre: '', purchaseDate: new Date().toISOString().split('T')[0], editReason: '', receiptFile: null });
        fetchPurchases();
      } else {
        const err = await response.json();
        setError(err.message || 'Failed to create purchase');
      }
    } catch (err) {
      setError('Error creating purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    // Validate edit reason for approved purchases
    if (selectedPurchase.status === 'Approved' && !formData.editReason.trim()) {
      setError('Please provide a reason for editing this approved purchase');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        depotId: formData.depotId,
        quantity: parseFloat(formData.quantity),
        costPerLitre: parseFloat(formData.costPerLitre),
        purchaseDate: formData.purchaseDate,
        editReason: formData.editReason
      };

      const response = await apiRequest(`/api/purchases/${selectedPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess(user?.role === 'MD' ? 'Purchase updated and approved' : 'Purchase updated. Awaiting MD approval.');
        setShowEditModal(false);
        setSelectedPurchase(null);
        fetchPurchases();
      } else {
        const err = await response.json();
        setError(err.message || 'Failed to update purchase');
      }
    } catch (err) {
      setError('Error updating purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAction = async () => {
    if (!selectedPurchase) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const endpoint = actionType === 'approve-edit'
        ? `/api/purchases/${selectedPurchase.id}/approve-edit`
        : `/api/purchases/${selectedPurchase.id}/approve`;

      const response = await apiRequest(endpoint, { method: 'POST' });

      if (response.ok) {
        setSuccess(actionType === 'approve-edit' ? 'Edit approved successfully' : 'Purchase approved successfully');
        setShowApproveModal(false);
        setSelectedPurchase(null);
        fetchPurchases();
      } else {
        const err = await response.json();
        setError(err.message || 'Failed to approve');
      }
    } catch (err) {
      setError('Error approving');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAction = async () => {
    if (!selectedPurchase || !rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const endpoint = actionType === 'reject-edit'
        ? `/api/purchases/${selectedPurchase.id}/reject-edit`
        : `/api/purchases/${selectedPurchase.id}/reject`;

      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (response.ok) {
        setSuccess(actionType === 'reject-edit' ? 'Edit rejected. Original values restored.' : 'Purchase rejected');
        setShowRejectModal(false);
        setSelectedPurchase(null);
        setRejectionReason('');
        fetchPurchases();
      } else {
        const err = await response.json();
        setError(err.message || 'Failed to reject');
      }
    } catch (err) {
      setError('Error rejecting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) {
      setError('Please select both start and end dates for export');
      return;
    }

    try {
      const url = `/api/purchases/export?startDate=${exportDateRange.startDate}&endDate=${exportDateRange.endDate}`;

      const response = await apiRequest(url);

      if (!response.ok) {
        setError('No purchases found for the selected date range');
        return;
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        setError('No purchases found for the selected date range');
        return;
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `purchases_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setShowExportModal(false);
      setSuccess('Export downloaded successfully');
      setExportDateRange({ startDate: '', endDate: '' });
    } catch (err) {
      setError('Failed to export purchases');
    }
  };

  const handleFilter = () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    // Filter purchases by date range
    const filtered = purchases.filter(p => {
      const purchaseDate = new Date(p.purchaseDate);
      const start = new Date(dateFilter.startDate);
      const end = new Date(dateFilter.endDate);
      return purchaseDate >= start && purchaseDate <= end;
    });

    setFilteredPurchases(filtered);
    setShowFilterModal(false);
    setSuccess(`Showing ${filtered.length} purchase(s) from ${dateFilter.startDate} to ${dateFilter.endDate}`);
  };

  const clearFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setFilteredPurchases(purchases);
    setShowFilterModal(false);
    setSuccess('Filter cleared');
  };

  const openViewModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
  };

  const openEditModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setFormData({
      depotId: purchase.depotId || '',
      quantity: purchase.quantity.toString(),
      costPerLitre: purchase.costPerLitre.toString(),
      purchaseDate: purchase.purchaseDate.split('T')[0],
      editReason: '',
      receiptFile: null
    });
    setShowEditModal(true);
  };

  const openApproveModal = (purchase: Purchase, type: 'approve' | 'approve-edit') => {
    setSelectedPurchase(purchase);
    setActionType(type);
    setShowApproveModal(true);
  };

  const openRejectModal = (purchase: Purchase, type: 'reject' | 'reject-edit') => {
    setSelectedPurchase(purchase);
    setActionType(type);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const totalCost = formData.quantity && formData.costPerLitre
    ? (parseFloat(formData.quantity) * parseFloat(formData.costPerLitre)).toLocaleString()
    : '0';

  // Parse original values for comparison
  const getOriginalValues = (originalValuesJson: string) => {
    try {
      return JSON.parse(originalValuesJson);
    } catch {
      return null;
    }
  };

  if (loading && purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Synchronizing Purchasing Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Diesel Purchasing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all diesel purchase records and track depot purchases</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Purchase
        </button>
      </div>

      {/* Financial & Operational Stats */}
      {(() => {
        const stats = {
          totalVolume: filteredPurchases.filter(p => p.status === 'Approved').reduce((acc, p) => acc + p.quantity, 0),
          totalInvestment: filteredPurchases.filter(p => p.status === 'Approved').reduce((acc, p) => acc + p.totalCost, 0),
          pending: filteredPurchases.filter(p => p.status === 'Pending' || p.hasPendingEdit).length,
          rejected: filteredPurchases.filter(p => p.status === 'Rejected').length
        };

        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Volume (L)</p>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.totalVolume.toLocaleString()} L</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Investment</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">₦{stats.totalInvestment.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Pending Actions</p>
              <p className="text-2xl font-black text-orange-500">{stats.pending}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Rejected Entries</p>
              <p className="text-2xl font-black text-red-600">{stats.rejected}</p>
            </div>
          </div>
        );
      })()}

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by depot name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => setShowFilterModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300"
        >
          <Filter className="w-4 h-4" />
          Filter
          {(dateFilter.startDate || dateFilter.endDate) && (
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Active</span>
          )}
        </button>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Mobile Cards (Visible on mobile only) */}
      <div className="md:hidden space-y-4">
        {filteredPurchases.map((purchase) => (
          <div key={purchase.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{purchase.purchaseId || 'PUR-000'}</span>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${purchase.status === 'Approved' ? 'bg-gray-900 text-white' :
                  purchase.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                  {purchase.status}
                </span>
                {purchase.hasPendingEdit && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Edit Pending
                  </span>
                )}
              </div>
            </div>

            <div className="mb-3 space-y-1">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">{purchase.depotName}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(purchase.purchaseDate).toLocaleDateString('en-GB')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
              <div>
                <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Quantity</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{purchase.quantity.toLocaleString()} L</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Total Cost</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">₦{purchase.totalCost.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              {/* Approve/Reject Edit for Pending Edits */}
              {purchase.hasPendingEdit && user?.role === 'MD' ? (
                <>
                  <button
                    onClick={() => openApproveModal(purchase, 'approve-edit')}
                    className="p-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openRejectModal(purchase, 'reject-edit')}
                    className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              ) : purchase.status === 'Pending' && user?.role === 'MD' ? (
                <>
                  <button
                    onClick={() => openApproveModal(purchase, 'approve')}
                    className="p-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openRejectModal(purchase, 'reject')}
                    className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              ) : purchase.status === 'Approved' && !purchase.hasPendingEdit && (user?.role === 'Admin' || user?.role === 'MD') ? (
                <button
                  onClick={() => openEditModal(purchase)}
                  className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              ) : null}

              <button
                onClick={() => openViewModal(purchase)}
                className="p-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table (Visible on desktop only) */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Purchase ID</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Date</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Depot Name</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Quantity (L)</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Cost/Litre</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Total Cost</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.map((purchase, index) => (
              <tr key={purchase.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{purchase.purchaseId || 'PUR-000'}</span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(purchase.purchaseDate).toLocaleDateString('en-GB')}
                </td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">{purchase.depotName}</td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">{purchase.quantity.toLocaleString()}</td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">₦{purchase.costPerLitre.toLocaleString()}</td>
                <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-gray-100">₦{purchase.totalCost.toLocaleString()}</td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit ${purchase.status === 'Approved' ? 'bg-gray-900 text-white' :
                      purchase.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {purchase.status}
                    </span>
                    {purchase.hasPendingEdit && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 inline-block w-fit">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Edit Pending
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    {/* Approve/Reject Edit for Pending Edits - HIGHEST PRIORITY */}
                    {purchase.hasPendingEdit && user?.role === 'MD' ? (
                      <>
                        <button
                          onClick={() => openApproveModal(purchase, 'approve-edit')}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 rounded transition-colors"
                          title="Approve Edit"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRejectModal(purchase, 'reject-edit')}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 rounded transition-colors"
                          title="Reject Edit"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : purchase.status === 'Pending' && user?.role === 'MD' ? (
                      /* Approve/Reject for Pending Purchases - Only if no pending edit */
                      <>
                        <button
                          onClick={() => openApproveModal(purchase, 'approve')}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 rounded transition-colors"
                          title="Approve Purchase"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRejectModal(purchase, 'reject')}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 rounded transition-colors"
                          title="Reject Purchase"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : purchase.status === 'Approved' && !purchase.hasPendingEdit && (user?.role === 'Admin' || user?.role === 'MD') ? (
                      /* Edit for Approved Purchases - Only if no pending edit */
                      <button
                        onClick={() => openEditModal(purchase)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Purchase"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : null}

                    {/* View button - always visible */}
                    <button
                      onClick={() => openViewModal(purchase)}
                      className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">View</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Purchase Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Purchase" size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Depot</label>
              <select
                value={formData.depotId}
                onChange={e => setFormData({ ...formData, depotId: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Depot</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity (Litres)</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="e.g., 15000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost per Litre (₦)</label>
              <input
                type="number"
                value={formData.costPerLitre}
                onChange={e => setFormData({ ...formData, costPerLitre: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="e.g., 850"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cost:</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₦{totalCost}</span>
            </div>
          </div>

          {user?.role === 'Admin' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">This purchase will require MD approval before stock is updated.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Purchase'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Purchase Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Purchase" size="lg">
        <form onSubmit={handleEdit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Depot</label>
              <select
                value={formData.depotId}
                onChange={e => setFormData({ ...formData, depotId: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select Depot</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity (Litres)</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost per Litre (₦)</label>
              <input
                type="number"
                value={formData.costPerLitre}
                onChange={e => setFormData({ ...formData, costPerLitre: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cost:</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₦{totalCost}</span>
            </div>
          </div>

          {selectedPurchase?.status === 'Approved' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Edit *</label>
              <textarea
                value={formData.editReason}
                onChange={(e) => setFormData({ ...formData, editReason: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
                rows={3}
                placeholder="Explain why this approved purchase needs to be edited..."
                required
              />
            </div>
          )}

          {user?.role === 'Admin' && selectedPurchase?.status === 'Approved' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">This edit will require MD approval. Stock will not be adjusted until approved.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                'Update Purchase'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Purchase Details" size="lg">
        {selectedPurchase && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Purchase Date</label>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">{new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedPurchase.status === 'Approved' ? 'bg-gray-900 text-white' :
                    selectedPurchase.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                    {selectedPurchase.status}
                  </span>
                  {selectedPurchase.hasPendingEdit && (
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      Edit Pending Approval
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Depot</label>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">{selectedPurchase.depotName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</label>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">{selectedPurchase.quantity.toLocaleString()} Litres</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost per Litre</label>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">₦{selectedPurchase.costPerLitre.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</label>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-bold text-lg">₦{selectedPurchase.totalCost.toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedPurchase.createdByName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved By</label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedPurchase.approvedByName || 'Pending'}</p>
                </div>
              </div>
            </div>

            {selectedPurchase.editedByName && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <label className="text-sm font-medium text-orange-800">Last Edited By</label>
                <p className="mt-1 text-orange-900">{selectedPurchase.editedByName}</p>
              </div>
            )}

            {/* Show rejection reason */}
            {selectedPurchase.rejectionReason && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg p-4">
                <label className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejection Reason
                </label>
                <p className="mt-2 text-red-900">{selectedPurchase.rejectionReason}</p>
              </div>
            )}

            {/* Show edit reason */}
            {selectedPurchase.editReason && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Edit Justification
                </label>
                <p className="mt-2 text-blue-900">{selectedPurchase.editReason}</p>
              </div>
            )}

            {/* Show comparison for pending edits */}
            {selectedPurchase.hasPendingEdit && selectedPurchase.originalValues && (() => {
              const original = getOriginalValues(selectedPurchase.originalValues);
              if (!original) return null;

              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-purple-800 flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4" />
                    Pending Changes - Comparison View
                  </label>

                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original Quantity</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{original.Quantity?.toLocaleString()} L</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Quantity</p>
                        <p className="font-medium text-purple-900">{selectedPurchase.quantity.toLocaleString()} L</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original Cost/Litre</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">₦{original.CostPerLitre?.toLocaleString()}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Cost/Litre</p>
                        <p className="font-medium text-purple-900">₦{selectedPurchase.costPerLitre.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original Total</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">₦{original.TotalCost?.toLocaleString()}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Total</p>
                        <p className="font-bold text-purple-900">₦{selectedPurchase.totalCost.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Confirm Approval" size="md">
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {actionType === 'approve-edit' ? 'Approve Purchase Edit?' : 'Approve Purchase?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {actionType === 'approve-edit'
                ? 'This will approve the edited values and adjust the depot stock accordingly.'
                : 'This will approve the purchase and add the quantity to the depot stock.'}
            </p>
          </div>

          {selectedPurchase && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Depot:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPurchase.depotName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPurchase.quantity.toLocaleString()} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Cost:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">₦{selectedPurchase.totalCost.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowApproveModal(false)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveAction}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{actionType === 'approve-edit' ? 'Confirming...' : 'Approving...'}</span>
                </>
              ) : (
                <span>{actionType === 'approve-edit' ? 'Confirm Changes' : 'Yes, Approve Purchase'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Confirm Rejection" size="md">
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {actionType === 'reject-edit' ? 'Reject Purchase Edit?' : 'Reject Purchase?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {actionType === 'reject-edit'
                ? 'This will reject the edit and restore the original approved values.'
                : 'This will reject the purchase. No stock will be added.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rejection Reason *</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
              rows={4}
              placeholder="Please provide a reason for rejection..."
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectAction}
              disabled={isSubmitting || !rejectionReason.trim()}
              className="px-8 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <span>{actionType === 'reject-edit' ? 'Discard Edit' : 'Confirm Rejection'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Purchases" size="md">
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">Filter purchases by selecting a date range. Leave empty to show all purchases.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">Start Date</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">End Date</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <button
              onClick={clearFilter}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filter
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFilter}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Purchases" size="md">
        <div id="export-purchases">
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 rounded-lg p-4 flex items-start gap-2">
              <Download className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 dark:text-green-200">Select a date range to export purchases. Only purchases within this range will be included in the CSV file.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">Start Date</label>
                <input
                  type="date"
                  value={exportDateRange.startDate}
                  onChange={(e) => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">End Date</label>
                <input
                  type="date"
                  value={exportDateRange.endDate}
                  onChange={(e) => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!exportDateRange.startDate || !exportDateRange.endDate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
