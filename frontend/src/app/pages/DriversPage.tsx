import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Filter, Users, Eye, Phone, CreditCard, Star, AlertCircle, Truck, CheckCircle2, X, Loader2 } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { toast } from 'sonner';

interface DriverItem {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  status: string;
  assignedTruckId?: string;
  truckRegistration?: string;
  rating?: number;
  totalTrips?: number;
  createdAt: string;
  address?: string;
  licenseExpiry?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  notes?: string;
  userId?: string;
  isUserActive?: boolean;
  appEmail?: string;
  appUsername?: string;
}

interface TruckItem {
  id: string;
  registrationNumber: string;
  capacityLitres: number;
  status: string;
}

export function DriversPage() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [availableTrucks, setAvailableTrucks] = useState<TruckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [assigningDriver, setAssigningDriver] = useState<DriverItem | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingDriver, setViewingDriver] = useState<DriverItem | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [forceChange, setForceChange] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DriverItem>>({});

  useEffect(() => {
    if (token) {
      fetchDrivers();
    }
  }, [token]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/drivers');
      const data = await response.json();
      setDrivers(data.data || []);
    } catch (err) {
      setError('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTrucks = async () => {
    try {
      const response = await apiRequest('/api/trucks/available');
      const data = await response.json();
      setAvailableTrucks(data.data || []);
    } catch (err) {
      toast.error('Failed to load available trucks');
    }
  };

  const handleAssignTruck = async () => {
    if (!assigningDriver || !selectedTruckId) return;

    setActionLoading(true);
    try {
      const response = await apiRequest(`/api/drivers/${assigningDriver.id}/assign-truck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckId: selectedTruckId })
      });

      if (response.ok) {
        toast.success(`Truck assigned to ${assigningDriver.fullName}`);
        setAssigningDriver(null);
        setSelectedTruckId('');
        fetchDrivers();
      } else {
        toast.error('Failed to assign truck');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateDriver = async (driver: DriverItem) => {
    if (!driver.assignedTruckId) {
      toast.error('You must assign a truck before activating the driver');
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiRequest(`/api/drivers/${driver.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' })
      });

      if (response.ok) {
        toast.success(`${driver.fullName} is now Active`);
        fetchDrivers();
      } else {
        toast.error('Failed to activate driver');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!viewingDriver?.id || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    setActionLoading(true);
    try {
      const response = await apiRequest(`/api/drivers/${viewingDriver.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, requiresPasswordChange: forceChange })
      });
      if (response.ok) {
        toast.success('Password reset successfully');
        setShowPasswordModal(false);
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to reset password');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAccountAccess = async (isActive: boolean) => {
    if (!viewingDriver?.id) return;
    setActionLoading(true);
    try {
      const response = await apiRequest(`/api/drivers/${viewingDriver.id}/toggle-account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (response.ok) {
        toast.success(`App access ${isActive ? 'granted' : 'revoked'}`);
        fetchDrivers(); // refresh to get updated status
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to toggle access');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!viewingDriver?.id) return;
    setActionLoading(true);
    try {
      const response = await apiRequest(`/api/drivers/${viewingDriver.id}/create-account`, {
        method: 'POST'
      });
      if (response.ok) {
        toast.success('App access created successfully');
        fetchDrivers();
        setViewingDriver(null);
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to create account');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDriver = async () => {
    if (!viewingDriver?.id) return;
    setActionLoading(true);
    try {
      const response = await apiRequest(`/api/drivers/${viewingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        toast.success('Driver details updated successfully');
        setShowEditModal(false);
        fetchDrivers();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to update driver');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(d =>
    (d.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone || '').includes(searchTerm)
  );

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'Active').length,
    assigned: drivers.filter(d => d.assignedTruckId).length,
    inactive: drivers.filter(d => d.status === 'Inactive').length
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading && drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Synchronizing Driver Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Driver Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage driver records and assignments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div id="driver-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div id="driver-ratings" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600 dark:text-blue-400"><Users className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-600 dark:text-gray-400">Total</p><p className="text-2xl font-bold dark:text-white">{stats.total}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400"><CheckCircle2 className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-600 dark:text-gray-400">Active</p><p className="text-2xl font-bold dark:text-white">{stats.active}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600 dark:text-purple-400"><Truck className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p><p className="text-2xl font-bold dark:text-white">{stats.assigned}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-gray-600 dark:text-gray-400"><AlertCircle className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p><p className="text-2xl font-bold dark:text-white">{stats.inactive}</p></div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map((driver, index) => (
          <div key={driver.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                  {getInitials(driver.fullName)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{driver.fullName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">DR-{String(index + 1).padStart(3, '0')}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${driver.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-100' :
                driver.status === 'Inactive' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border border-gray-100'
                }`}>
                {driver.status}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <span>{driver.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <CreditCard className="w-4 h-4" />
                <span>{driver.licenseNumber}</span>
              </div>

              <div className="pt-3 border-t border-gray-50 flex justify-between text-sm items-center">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Truck:</span>
                <span className={`font-bold ${driver.truckRegistration ? 'text-blue-600' : 'text-gray-400 italic'}`}>
                  {driver.truckRegistration || 'Not Assigned'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setAssigningDriver(driver);
                  fetchAvailableTrucks();
                }}
                className="flex items-center justify-center gap-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading && assigningDriver?.id === driver.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                {driver.assignedTruckId && driver.assignedTruckId !== '00000000-0000-0000-0000-000000000000' ? 'Change Truck' : 'Assign Truck'}
              </button>

              {driver.status === 'Inactive' ? (
                <button
                  onClick={() => handleActivateDriver(driver)}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${driver.assignedTruckId
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                   disabled={!driver.assignedTruckId || actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {actionLoading ? "Activating..." : "Activate"}
                </button>
              ) : (
                <button
                  onClick={() => setViewingDriver(driver)}
                  className="flex items-center justify-center gap-2 py-2 border border-blue-100 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Profile
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Assign Truck Modal */}
      {assigningDriver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Assign Truck to {assigningDriver.fullName}</h3>
              <button onClick={() => setAssigningDriver(null)}><X className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Available Trucks</label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                  {availableTrucks.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl italic">No available trucks at the moment</p>
                  ) : (
                    availableTrucks.map(truck => (
                      <button
                        key={truck.id}
                        onClick={() => setSelectedTruckId(truck.id)}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${selectedTruckId === truck.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/20'
                          : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 bg-white dark:bg-gray-800/50'
                          }`}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className={`p-2 rounded-lg ${selectedTruckId === truck.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">{truck.registrationNumber}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{truck.capacityLitres.toLocaleString()} Litres Capacity</p>
                          </div>
                        </div>
                        {selectedTruckId === truck.id && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setAssigningDriver(null)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTruck}
                  disabled={!selectedTruckId || actionLoading}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${selectedTruckId && !actionLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Profile Modal */}
      {viewingDriver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                  {getInitials(viewingDriver.fullName)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{viewingDriver.fullName}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-0.5">{viewingDriver.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setEditForm(viewingDriver); setShowEditModal(true); }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Edit Details
                </button>
                <button onClick={() => setViewingDriver(null)}><X className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600" /></button>
              </div>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" /> Personal Details
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingDriver.phone}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingDriver.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* License Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> License & Truck
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">License Number</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{viewingDriver.licenseNumber}</p>
                    </div>
                    <div className="flex gap-3">
                <div id="license-tracking" className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expiry Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{viewingDriver.licenseExpiry ? new Date(viewingDriver.licenseExpiry).toLocaleDateString() : 'N/A'}</p>
                </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Truck</p>
                        <p className="font-medium text-blue-600 dark:text-blue-400">{viewingDriver.truckRegistration || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Emergency
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-50 dark:border-red-900/30">
                      <p className="text-xs text-red-500 dark:text-red-400 uppercase font-bold tracking-tight">Contact Name</p>
                      <p className="font-bold text-gray-900 dark:text-white">{viewingDriver.emergencyContactName || 'N/A'}</p>
                    </div>
                    <div className="bg-red-50/50 dark:bg-red-900/20 p-3 rounded-lg border border-red-50 dark:border-red-900/30">
                      <p className="text-xs text-red-500 dark:text-red-400 uppercase font-bold tracking-tight">Contact Phone</p>
                      <p className="font-bold text-gray-900 dark:text-white">{viewingDriver.emergencyContactPhone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Guarantor */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Guarantor
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-purple-50/50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-50 dark:border-purple-900/30">
                      <p className="text-xs text-purple-500 dark:text-purple-400 uppercase font-bold tracking-tight">Guarantor Name</p>
                      <p className="font-bold text-gray-900 dark:text-white">{viewingDriver.guarantorName || 'N/A'}</p>
                    </div>
                    <div className="bg-purple-50/50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-50 dark:border-purple-900/30">
                      <p className="text-xs text-purple-500 dark:text-purple-400 uppercase font-bold tracking-tight">Guarantor Phone</p>
                      <p className="font-bold text-gray-900 dark:text-white">{viewingDriver.guarantorPhone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* App Access Management */}
                <div className="space-y-4 md:col-span-2 mt-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" /> App Access Management
                  </h4>
                  {!viewingDriver.userId ? (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">This driver does not have an app account.</p>
                      <button 
                        onClick={handleCreateAccount}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Creating...' : 'Create App Account'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Login Credentials</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span className="block mb-1"><strong>Login Username/ID:</strong> {viewingDriver.appUsername || viewingDriver.appEmail}</span>
                          <span className="block mb-1"><strong>Account Email:</strong> {viewingDriver.appEmail}</span>
                          <span className="block"><strong>Initial Password:</strong> {viewingDriver.phone}</span>
                        </p>
                        <button 
                          onClick={() => { setNewPassword(''); setForceChange(true); setShowPasswordModal(true); }}
                          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        >
                          Reset Password
                        </button>
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                          Account Status: <span className={viewingDriver.isUserActive ? 'text-green-600' : 'text-red-600'}>{viewingDriver.isUserActive ? 'Active' : 'Revoked'}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Enable or disable this driver's ability to log into the app.</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleToggleAccountAccess(true)}
                            disabled={actionLoading || viewingDriver.isUserActive}
                            className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-sm font-bold rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                          >
                            Grant Access
                          </button>
                          <button 
                            onClick={() => handleToggleAccountAccess(false)}
                            disabled={actionLoading || !viewingDriver.isUserActive}
                            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                          >
                            Revoke Access
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setViewingDriver(null)}
                className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Password Reset Modal */}
      {showPasswordModal && viewingDriver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Reset Password</h3>
              <button onClick={() => setShowPasswordModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Password *</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  placeholder="Enter new password..." 
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={() => setForceChange(!forceChange)} className={`w-11 h-6 rounded-full transition-colors flex items-center ${forceChange ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${forceChange ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Require change on next login</span>
              </label>
              <div className="pt-2 flex gap-3">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={handlePasswordReset} disabled={actionLoading || !newPassword} className="flex-[2] py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50">
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Edit Driver Details <span className="text-sm font-normal text-gray-500">({editForm.fullName})</span>
              </h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input type="text" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Address</label>
                  <input type="text" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">License Number</label>
                  <input type="text" value={editForm.licenseNumber || ''} onChange={e => setEditForm({...editForm, licenseNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
                
                <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Emergency Contact</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Name</label>
                  <input type="text" value={editForm.emergencyContactName || ''} onChange={e => setEditForm({...editForm, emergencyContactName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input type="text" value={editForm.emergencyContactPhone || ''} onChange={e => setEditForm({...editForm, emergencyContactPhone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>

                <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Guarantor Information</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Name</label>
                  <input type="text" value={editForm.guarantorName || ''} onChange={e => setEditForm({...editForm, guarantorName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input type="text" value={editForm.guarantorPhone || ''} onChange={e => setEditForm({...editForm, guarantorPhone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm" />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">Cancel</button>
              <button onClick={handleUpdateDriver} disabled={actionLoading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 text-sm">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
