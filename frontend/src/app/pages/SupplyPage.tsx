import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Search, Plus, Filter, Download as DownloadIcon, Eye, CheckCircle, XCircle, Trash2, Calendar, FileText, ArrowRight, User, Truck, DollarSign, Fuel, Info, Edit2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { apiRequest, getFileUrl } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface Supply {
  id: string;
  saleId: string;
  customerName: string;
  truckRegNumber: string;
  driverName: string;
  quantity: number;
  totalAmount: number;
  pricePerLitre: number;
  status: string;
  supplyDate: string;
  invoiceUrl?: string;
  rejectionReason?: string;
  editReason?: string;
  hasPendingEdit?: boolean;
  originalValues?: string;
  customerId?: string;
  driverId?: string;
  createdByName?: string;
  editedByName?: string;
}

interface Customer { id: string; companyName: string; }
interface Truck { id: string; registrationNumber: string; }
interface Driver { id: string; fullName: string; assignedTruckId: string | null; }

export function SupplyPage() {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showApproveEditModal, setShowApproveEditModal] = useState(false);
  const [showRejectEditModal, setShowRejectEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [supplyToDelete, setSupplyToDelete] = useState<Supply | null>(null);
  const [supplyToReject, setSupplyToReject] = useState<Supply | null>(null);
  const [supplyToApprove, setSupplyToApprove] = useState<Supply | null>(null);
  const [editReason, setEditReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [exportDateRange, setExportDateRange] = useState({ startDate: '', endDate: '' });
  const [filteredSupplies, setFilteredSupplies] = useState<Supply[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    driverId: '',
    quantity: '',
    pricePerLitre: '',
    supplyDate: new Date().toISOString().split('T')[0],
    invoiceFile: null as File | null
  });

  useEffect(() => {
    fetchSupplies();
    fetchDropdowns();
  }, []);

  useEffect(() => {
    let filtered = supplies;
    if (searchTerm) {
      filtered = filtered.filter(s =>
        (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.saleId || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredSupplies(filtered);
  }, [supplies, searchTerm]);

  const fetchSupplies = async () => {
    try {
      const response = await apiRequest('/api/supplies');
      const data = await response.json();
      const suppliesWithCalculatedRates = (data.data || []).map((s: Supply) => ({
        ...s,
        pricePerLitre: (s.pricePerLitre && s.pricePerLitre > 0) 
          ? s.pricePerLitre 
          : (s.quantity > 0 ? s.totalAmount / s.quantity : 0)
      }));
      setSupplies(suppliesWithCalculatedRates);
      setFilteredSupplies(suppliesWithCalculatedRates);
    } catch (err) {
      setError('Failed to load supplies');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [cusRes, trkRes, drvRes] = await Promise.all([
        apiRequest('/api/customers'),
        apiRequest('/api/trucks'),
        apiRequest('/api/drivers')
      ]);

      const [cusData, trkData, drvData] = await Promise.all([
        cusRes.json(), trkRes.json(), drvRes.json()
      ]);

      setCustomers(cusData.data || []);
      setTrucks(trkData.data || []);
      setDrivers(drvData.data || []);
    } catch (err) {
      console.error('Error loading dropdowns', err);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    setFormData(prev => ({ ...prev, customerId, pricePerLitre: '' }));
    if (!customerId) return;

    try {
      const resp = await apiRequest(`/api/settings/customer-prices/${customerId}`);
      const data = await resp.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, customerId, pricePerLitre: data.data.toString() }));
        if (data.isSpecific) {
          toast.info("Specific rate applied for this customer");
        }
      }
    } catch (err) {
      console.error("Failed to fetch customer price", err);
    }
  };


  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          }, 'image/jpeg', 0.7); // 0.7 quality
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      if (isEditing && selectedSupply) {
        // Handle Update
        const response = await apiRequest(`/api/supplies/${selectedSupply.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: formData.customerId,
            driverId: formData.driverId,
            quantity: parseFloat(formData.quantity),
            pricePerLitre: parseFloat(formData.pricePerLitre),
            supplyDate: formData.supplyDate,
            editReason: editReason
          })
        });

        if (response.ok) {
          setSuccess(user?.role === 'MD' ? 'Sale updated successfully' : 'Sale edit request submitted for approval');
          setShowAddModal(false);
          setIsEditing(false);
          setEditReason('');
          fetchSupplies();
        } else {
          const err = await response.json();
          setModalError(err.message || 'Failed to update');
        }
        return;
      }

      // Handle Create
      if (!formData.invoiceFile) {
        setModalError('Please attach an invoice/proof of sale');
        return;
      }
      const compressedFile = await compressImage(formData.invoiceFile);

      const submitData = new FormData();
      submitData.append('CustomerId', formData.customerId);
      submitData.append('DriverId', formData.driverId);
      submitData.append('Quantity', formData.quantity);
      submitData.append('PricePerLitre', formData.pricePerLitre);
      submitData.append('SupplyDate', formData.supplyDate);
      submitData.append('Invoice', compressedFile);

      const response = await apiRequest('/api/supplies', {
        method: 'POST',
        body: submitData
      });

      if (response.ok) {
        setSuccess('Supply record and invoice submitted successfully');
        setShowAddModal(false);
        setFormData({ ...formData, quantity: '', pricePerLitre: '', invoiceFile: null });
        fetchSupplies();
      } else {
        const err = await response.json();
        setModalError(err.message || `Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setModalError('Connection error: Failed to upload record');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      setModalError('Please select both start and end dates');
      return;
    }
    const filtered = supplies.filter(s => {
      const d = new Date(s.supplyDate);
      return d >= new Date(dateFilter.startDate) && d <= new Date(dateFilter.endDate);
    });
    setFilteredSupplies(filtered);
    setShowFilterModal(false);
  };

  const handleExport = async () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) {
      setModalError('Select date range for export');
      return;
    }
    try {
      const url = `/api/supplies/export?startDate=${exportDateRange.startDate}&endDate=${exportDateRange.endDate}`;
      const response = await apiRequest(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `sales_report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`;
        a.click();
        setShowExportModal(false);
        setSuccess('Export downloaded');
      }
    } catch (err) {
      setModalError('Export failed');
    }
  };

  const openViewModal = (supply: Supply) => {
    setSelectedSupply(supply);
    setShowViewModal(true);
  };

  const handleApprove = (supply: Supply) => {
    setSupplyToApprove(supply);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!supplyToApprove) return;
    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/supplies/${supplyToApprove.id}/approve`, { method: 'POST' });
      if (response.ok) {
        setSuccess('Sale approved successfully');
        setShowApproveModal(false);
        setSupplyToApprove(null);
        fetchSupplies();
      } else {
        const err = await response.json();
        setError(err.message || 'Failed to approve');
      }
    } catch (err) {
      setError('Error approving sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = (supply: Supply) => {
    setSupplyToReject(supply);
    setModalError(null);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!supplyToReject || !rejectReason) return;
    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/supplies/${supplyToReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (response.ok) {
        setSuccess('Sale rejected successfully');
        setShowRejectModal(false);
        setSupplyToReject(null);
        setRejectReason('');
        fetchSupplies();
      } else {
        const err = await response.json();
        setModalError(err.message || 'Failed to reject');
      }
    } catch (err) {
      setModalError('Error rejecting sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (supply: Supply) => {
    setSupplyToDelete(supply);
    setModalError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!supplyToDelete) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      const response = await apiRequest(`/api/supplies/${supplyToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        setSuccess('Sale request deleted successfully');
        setShowDeleteModal(false);
        setSupplyToDelete(null);
        fetchSupplies();
      } else {
        const err = await response.json();
        setModalError(err.message || 'Failed to delete request');
      }
    } catch (err) {
      setModalError('Error deleting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered supplies now handled by useEffect

  const stats = {
    totalSales: filteredSupplies.length,
    totalVolume: filteredSupplies.filter(s => s.status === 'Approved').reduce((acc, s) => acc + s.quantity, 0),
    totalRevenue: filteredSupplies.filter(s => s.status === 'Approved').reduce((acc, s) => acc + s.totalAmount, 0),
    pending: filteredSupplies.filter(s => s.status === 'Pending').length
  };

  const totalAmount = formData.quantity && formData.pricePerLitre
    ? (parseFloat(formData.quantity) * parseFloat(formData.pricePerLitre)).toLocaleString()
    : '0';

  const handleEditClick = (supply: Supply) => {
    setSelectedSupply(supply);
    setFormData({
      customerId: supply.customerId || '',
      driverId: supply.driverId || '',
      quantity: supply.quantity.toString(),
      pricePerLitre: supply.pricePerLitre.toString(),
      supplyDate: new Date(supply.supplyDate).toISOString().split('T')[0],
      invoiceFile: null
    });
    setEditReason('');
    setIsEditing(true);
    setModalError(null);
    setShowAddModal(true);
  };

  const handleApproveEdit = (supply: Supply) => {
    setSelectedSupply(supply);
    setShowApproveEditModal(true);
  };

  const confirmApproveEdit = async () => {
    if (!selectedSupply) return;
    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/supplies/${selectedSupply.id}/approve-edit`, {
        method: 'POST'
      });
      if (response.ok) {
        setSuccess('Sale edit approved successfully');
        setShowApproveEditModal(false);
        fetchSupplies();
      } else {
        const err = await response.json();
        setModalError(err.message || 'Failed to approve edit');
      }
    } catch (err) {
      setModalError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectEdit = (supply: Supply) => {
    setSelectedSupply(supply);
    setShowRejectEditModal(true);
  };

  const confirmRejectEdit = async () => {
    if (!selectedSupply) return;
    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/supplies/${selectedSupply.id}/reject-edit`, {
        method: 'POST'
      });
      if (response.ok) {
        setSuccess('Sale edit rejected');
        setShowRejectEditModal(false);
        fetchSupplies();
      } else {
        const err = await response.json();
        setModalError(err.message || 'Failed to reject edit');
      }
    } catch (err) {
      setModalError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canApprove = user?.role === 'MD';

  if (loading && supplies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Synchronizing Sales Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales & Supply</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage customer diesel sales and track deliveries</p>
        </div>
        <button
          onClick={() => { setModalError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Sale
        </button>
      </div>

      {/* Stats Section */}
      <div id="supply-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.totalSales}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Volume Supplied</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.totalVolume.toLocaleString()} L</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">₦{stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending Approval</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by customer or supply ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => { setModalError(null); setShowFilterModal(true); }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300"
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button
          onClick={() => { setModalError(null); setShowExportModal(true); }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300"
        >
          <DownloadIcon className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Mobile Cards (Visible on mobile only) */}
      <div className="md:hidden space-y-4">
        {filteredSupplies.map((supply) => (
          <div key={supply.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{supply.saleId || 'SAL-000'}</span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${supply.status === 'Approved' ? 'bg-green-100 text-green-700' :
                supply.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                {supply.status}
              </span>
            </div>

            <div className="mb-3 space-y-1">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">{supply.customerName}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(supply.supplyDate).toLocaleDateString('en-GB')}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
              <div>
                <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Volume</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{supply.quantity.toLocaleString()} L</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Rate</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">₦{supply.pricePerLitre.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 dark:text-gray-500 uppercase text-[10px]">Total</p>
                <p className="font-medium text-green-700">₦{supply.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>{supply.truckRegNumber}</p>
                <p>{supply.driverName}</p>
              </div>
              <div className="flex gap-2">
                {supply.status === 'Pending' && canApprove && (
                  <>
                    <button
                      onClick={() => handleApprove(supply)}
                      className="p-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectClick(supply)}
                      className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => openViewModal(supply)}
                  className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {supply.status === 'Pending' && (
                  <button
                    onClick={() => handleDeleteClick(supply)}
                    className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table (Visible on desktop only) */}
      <div id="supply-history" className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sale ID</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Volume (L)</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rate (₦)</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Delivery Details</th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="text-center py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSupplies.map((supply, index) => (
              <tr key={supply.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 transition-colors group">
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{supply.saleId || 'SAL-000'}</span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {new Date(supply.supplyDate).toLocaleDateString('en-GB')}
                </td>
                <td className="py-4 px-6">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{supply.customerName}</p>
                </td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">{supply.quantity.toLocaleString()}</td>
                <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">₦{supply.pricePerLitre.toLocaleString()}</td>
                <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-gray-100 text-green-700">₦{supply.totalAmount.toLocaleString()}</td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{supply.truckRegNumber}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{supply.driverName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${supply.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      supply.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                      {supply.status}
                    </span>
                    {supply.hasPendingEdit && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Edit Pending
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setSelectedSupply(supply); setShowViewModal(true); }}
                      className="p-1 hover:bg-zinc-100 rounded-md transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-zinc-600" />
                    </button>

                    {/* MD/Admin Approval Actions */}
                    {canApprove && supply.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(supply)}
                          className="p-1 hover:bg-green-50 rounded-md transition-colors"
                          title="Approve Sale"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                        <button
                          onClick={() => { setSupplyToReject(supply); setShowRejectModal(true); }}
                          className="p-1 hover:bg-red-50 rounded-md transition-colors text-red-600 dark:text-red-400"
                          title="Reject Sale"
                        >
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </>
                    )}

                    {/* MD/Admin Edit Approval Actions */}
                    {canApprove && supply.hasPendingEdit && (
                      <>
                        <button
                          onClick={() => handleApproveEdit(supply)}
                          className="p-1 hover:bg-purple-50 rounded-md transition-colors"
                          title="Approve Edit"
                        >
                          <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </button>
                        <button
                          onClick={() => handleRejectEdit(supply)}
                          className="p-1 hover:bg-red-50 rounded-md transition-colors"
                          title="Reject Edit"
                        >
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </>
                    )}

                    {/* Edit Action - Allowed for Pending or Approved (if not locked by another pending edit) */}
                    {((supply.status === 'Pending') || (supply.status === 'Approved' && !supply.hasPendingEdit)) && (
                      <button
                        onClick={() => handleEditClick(supply)}
                        className="p-1 hover:bg-zinc-100 rounded-md transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    )}

                    {/* Delete Action - Only for Pending records */}
                    {supply.status === 'Pending' && !supply.hasPendingEdit && (
                      <button
                        onClick={() => { setSupplyToDelete(supply); setShowDeleteModal(true); }}
                        className="p-1 hover:bg-red-50 rounded-md transition-colors text-red-600 dark:text-red-400"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Supply Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Supply Record" size="lg">
        {modalError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{modalError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer</label>
              <select
                value={formData.customerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 font-bold"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Driver (Auto-links Truck)</label>
              <select
                value={formData.driverId}
                onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 font-bold"
                required
              >
                <option value="">Select Driver</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">Quantity (Litres)</label>
               <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="e.g., 5000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold">Price per Litre (₦)</label>
               <input
                type="number"
                value={formData.pricePerLitre}
                onChange={e => setFormData({ ...formData, pricePerLitre: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="e.g., 950"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Supply Date</label>
            <input
              type="date"
              value={formData.supplyDate}
              onChange={e => setFormData({ ...formData, supplyDate: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attach Invoice (Proof of Sale) *</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setFormData({ ...formData, invoiceFile: e.target.files ? e.target.files[0] : null })}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">Images are automatically compressed for storage efficiency.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount:</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₦{totalAmount}</span>
            </div>
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold text-blue-600 dark:text-blue-400">REASON FOR EDIT *</label>
              <textarea
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-200 bg-blue-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent min-h-[80px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Explain why this change is necessary..."
                required={isEditing}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setIsEditing(false); }}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{isEditing ? 'Submit Edit Request' : 'Create Supply'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSupplyToDelete(null); setModalError(null); }}
        title="Confirm Deletion"
        size="md"
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{modalError}</span>
            </div>
          )}
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Delete this sale request?</p>
              <p className="text-xs text-red-700 mt-1">This action cannot be undone. Only pending requests can be deleted.</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Sale ID</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{supplyToDelete?.saleId}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Customer</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{supplyToDelete?.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Total Amount</span>
              <span className="text-sm font-bold text-green-700">₦{supplyToDelete?.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowDeleteModal(false); setSupplyToDelete(null); }}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Yes, Delete Sale</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`Sale Details - ${selectedSupply?.saleId}`}
        size="lg"
      >
        {selectedSupply && (
          <div className="space-y-6">
            {/* Status & Rejection logic */}
            {selectedSupply.status === 'Rejected' && selectedSupply.rejectionReason && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900 uppercase tracking-tight">Rejection Reason</p>
                  <p className="text-sm text-red-700 mt-1 italic">"{selectedSupply.rejectionReason}"</p>
                </div>
              </div>
            )}

            {/* Compare View for Pending Edits */}
            {selectedSupply.hasPendingEdit && selectedSupply.originalValues && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-bold text-purple-900">Pending Edit Comparison</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/50 p-3 rounded-lg border border-purple-100">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Original State (Approved)</p>
                    <div className="space-y-2 text-sm">
                      {(() => {
                        const orig = JSON.parse(selectedSupply.originalValues);
                        return (
                          <>
                            <div className="flex justify-between border-b border-gray-50 pb-1">
                              <span className="text-gray-500 dark:text-gray-400 italic">Volume:</span>
                              <span className="font-medium">{orig.Quantity.toLocaleString()} L</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-1">
                              <span className="text-gray-500 dark:text-gray-400 italic">Price/Litre:</span>
                              <span className="font-medium">₦{orig.PricePerLitre}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400 italic">Date:</span>
                              <span className="font-medium">{new Date(orig.SupplyDate).toLocaleDateString('en-GB')}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="bg-white/50 p-3 rounded-lg border-2 border-purple-200">
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-2">New Proposed State</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-purple-100 pb-1">
                        <span className="text-purple-500 dark:text-purple-400 italic">Volume:</span>
                        <span className="font-bold text-purple-900">{selectedSupply.quantity.toLocaleString()} L</span>
                      </div>
                      <div className="flex justify-between border-b border-purple-100 pb-1">
                        <span className="text-purple-500 dark:text-purple-400 italic">Price/Litre:</span>
                        <span className="font-bold text-purple-900">₦{selectedSupply.pricePerLitre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-500 dark:text-purple-400 italic">Date:</span>
                        <span className="font-bold text-purple-900">{new Date(selectedSupply.supplyDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedSupply.editReason && (
                  <div className="mt-4 p-3 bg-purple-100/50 rounded-lg">
                    <p className="text-xs font-bold text-purple-700 uppercase mb-1">Justification:</p>
                    <p className="text-sm text-purple-900 italic">"{selectedSupply.editReason}"</p>
                  </div>
                )}
                <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-2 text-right">Edited by: {selectedSupply.editedByName}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Customer</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedSupply.customerName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedSupply.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    selectedSupply.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {selectedSupply.status}
                  </span>
                  {selectedSupply.hasPendingEdit && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase rounded-full border border-purple-200">
                      EDIT PENDING
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Volume (L)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedSupply.quantity.toLocaleString()} L</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Price Rate</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₦{selectedSupply.pricePerLitre.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Amount</p>
                <p className="text-lg font-bold text-green-700">₦{selectedSupply.totalAmount.toLocaleString()}</p>
              </div>
              <div className="col-span-2 border-t border-gray-100 dark:border-gray-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Truck</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedSupply.truckRegNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Driver</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedSupply.driverName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Supply Date</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(selectedSupply.supplyDate).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Created By</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedSupply.createdByName || 'N/A'}</p>
                </div>
              </div>
            </div>

            {selectedSupply.invoiceUrl && (
              <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Invoice / Proof of Sale</p>
                  <button
                    onClick={() => window.open(getFileUrl(selectedSupply.invoiceUrl), '_blank')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <DownloadIcon className="w-3 h-3" />
                    Open Original
                  </button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 p-2">
                  <img
                    src={getFileUrl(selectedSupply.invoiceUrl)}
                    alt="Proof of Sale"
                    className="w-full h-auto rounded-lg max-h-[500px] object-contain cursor-zoom-in bg-white dark:bg-gray-800"
                    onClick={() => window.open(getFileUrl(selectedSupply.invoiceUrl), '_blank')}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 gap-3">
              {canApprove && (selectedSupply.status === 'Pending' || selectedSupply.hasPendingEdit) && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    if (selectedSupply.hasPendingEdit) handleApproveEdit(selectedSupply);
                    else handleApprove(selectedSupply);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-colors shadow-sm"
                >
                  Quick Approve
                </button>
              )}
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

      <Modal
        isOpen={showApproveModal}
        onClose={() => { setShowApproveModal(false); setSupplyToApprove(null); }}
        title="Confirm Sale Approval"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-100 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Approve this sale?</p>
              <p className="text-xs text-green-700 mt-1">This will deduct {supplyToApprove?.quantity.toLocaleString()} L from the depot.</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Sale ID</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{supplyToApprove?.saleId}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Customer</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{supplyToApprove?.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Volume</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{supplyToApprove?.quantity.toLocaleString()} L</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowApproveModal(false); setSupplyToApprove(null); }}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmApprove}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <span>Yes, Approve Sale</span>
              )}
            </button>
          </div>
        </div>
      </Modal>


      <Modal isOpen={showFilterModal} onClose={() => { setShowFilterModal(false); setModalError(null); }} title="Filter Sales" size="md">
        <div className="space-y-4">
          {modalError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{modalError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={e => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={e => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => { setFilteredSupplies(supplies); setShowFilterModal(false); }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={handleFilter}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={showExportModal} onClose={() => { setShowExportModal(false); setModalError(null); }} title="Export Sales Data" size="md">
        <div className="space-y-4">
          {modalError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{modalError}</span>
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">Select the date range for the CSV export.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold uppercase tracking-widest text-[10px]">From</label>
              <input
                type="date"
                value={exportDateRange.startDate}
                onChange={e => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-bold uppercase tracking-widest text-[10px]">To</label>
              <input
                type="date"
                value={exportDateRange.endDate}
                onChange={e => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={loading || !exportDateRange.startDate || !exportDateRange.endDate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-bold mt-4"
          >
            <DownloadIcon className="w-5 h-5" />
            Download CSV Report
          </button>
        </div>
      </Modal>

      {/* Approve Edit Modal */}
      <Modal
        isOpen={showApproveEditModal}
        onClose={() => { setShowApproveEditModal(false); setSelectedSupply(null); }}
        title="Approve Sale Edit"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-purple-900 uppercase">Confirm Changes</p>
              <p className="text-xs text-purple-700 mt-1">Accepting this edit will update the approved sale record and adjust depot stock automatically.</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium italic">New Volume:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{selectedSupply?.quantity.toLocaleString()} L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium italic">New Total:</span>
              <span className="font-bold text-green-700">₦{selectedSupply?.totalAmount.toLocaleString()}</span>
            </div>
            {selectedSupply?.editReason && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Reason for Edit:</p>
                <p className="text-sm italic text-gray-700 dark:text-gray-300 font-medium">"{selectedSupply.editReason}"</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowApproveEditModal(false); setSelectedSupply(null); }}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmApproveEdit}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <span>Confirm Changes</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Edit Modal */}
      <Modal
        isOpen={showRejectEditModal}
        onClose={() => { setShowRejectEditModal(false); setSelectedSupply(null); }}
        title="Discard Proposed Edit"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-900 uppercase">Discard Changes?</p>
              <p className="text-xs text-orange-700 mt-1">This will restore the sale record to its original approved state and cancel the edit request.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowRejectEditModal(false); setSelectedSupply(null); }}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
            >
              Wait, Keep It
            </button>
            <button
              onClick={confirmRejectEdit}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Discarding...</span>
                </>
              ) : (
                <span>Discard Edit</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setSupplyToReject(null); setRejectReason(''); setModalError(null); }}
        title="Reject Sale Request"
        size="md"
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{modalError}</span>
            </div>
          )}
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-900">Are you sure you want to reject this request?</p>
              <p className="text-xs text-orange-700 mt-1">Please provide a reason for the rejection.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rejection Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 min-h-[100px]"
              placeholder="e.g., Insufficient funds, incorrect quantity, etc."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowRejectModal(false); setSupplyToReject(null); setRejectReason(''); }}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              disabled={isSubmitting || !rejectReason}
              className="px-8 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <span>Confirm Rejection</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
