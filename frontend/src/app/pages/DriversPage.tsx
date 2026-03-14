import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Filter, Users, Eye, Phone, CreditCard, Star, AlertCircle, Truck, CheckCircle2, X } from 'lucide-react';
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
                className="flex items-center justify-center gap-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
                disabled={actionLoading}
              >
                <Truck className="w-4 h-4" />
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
                  <CheckCircle2 className="w-4 h-4" />
                  Activate
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
                  {actionLoading ? <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" /> : 'Confirm Assignment'}
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
              <button onClick={() => setViewingDriver(null)}><X className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600" /></button>
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
    </div>
  );
}
