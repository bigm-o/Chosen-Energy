import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight, Plus, Bell, User, LogOut, Fuel, Clock, CheckCircle, AlertCircle, Camera, Upload, ImageIcon, Loader2, MapPin, ArrowLeftRight, ShoppingCart, Info, TrendingDown, TrendingUp, ChevronDown, Truck as TruckIcon } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  type: string;
  title: string;
  quantity: number;
  value: number;
  status: string;
  date: string;
  invoiceUrl?: string;
  isConfirmed?: boolean;
}

interface DailyLog {
  date: string;
  rollover: number;
  openingBalance: number;
  totalSupplies: number;
  closingBalance: number;
  availableLoad: number;
  totalInToday?: number;
  totalOutToday?: number;
  logs: LogEntry[];
  pendingConfirmations: any[];
}

interface Customer {
  id: string;
  companyName: string;
}

interface Truck {
  id: string;
  registrationNumber: string;
  truckType: string;
  driverName?: string;
}

export function DriverDailyLogPage() {
  const { user, logout } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDispatch, setShowAddDispatch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Dispatch Form States
  const [dispatchType, setDispatchType] = useState<'Sale' | 'Transload'>('Sale');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [fixedPrice, setFixedPrice] = useState<number>(0);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    destTruckId: '',
    quantity: '',
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [truckSearch, setTruckSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showTruckDropdown, setShowTruckDropdown] = useState(false);

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDailyLog(currentDate);
    fetchFixedPrice();
  }, [currentDate]);

  useEffect(() => {
    if (showAddDispatch) {
      fetchCustomers();
      fetchTrucks();
      if (user?.role === 'Driver') {
        fetchDriverProfile();
      }
    }
  }, [showAddDispatch, user?.role]);

  const fetchDailyLog = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await apiRequest(`/api/daily-logs/${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setDailyLog(data.data);
      } else if (response.status === 404) {
        console.warn('Daily log not found (404)');
      }
    } catch (err) {
      console.error('Failed to load daily log:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFixedPrice = async () => {
    try {
      const resp = await apiRequest('/api/settings/DieselSellingPrice');
      if (resp.ok) {
        const data = await resp.json();
        setFixedPrice(parseFloat(data.data));
      }
    } catch (err) { }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest('/api/customers');
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (err) { }
  };

  const fetchTrucks = async () => {
    try {
      const response = await apiRequest('/api/trucks');
      const data = await response.json();
      setTrucks(data.data || []);
    } catch (err) { }
  };

  const fetchDriverProfile = async () => {
    try {
      const response = await apiRequest('/api/drivers/me');
      const data = await response.json();
      if (data.success) setDriverProfile(data.data);
    } catch (err) { }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverProfile) {
      toast.error("Driver profile not found");
      return;
    }

    if (dispatchType === 'Sale') {
      if (!formData.customerId || !formData.quantity || !invoiceFile) {
        toast.error("Please fill all fields and attach invoice");
        return;
      }

      // Balance Check
      const qty = parseFloat(formData.quantity);
      if (qty > (dailyLog?.availableLoad || 0)) {
        toast.error(`Insufficient load. Available: ${(dailyLog?.availableLoad || 0).toLocaleString()} L`);
        return;
      }

      setFormLoading(true);
      try {
        const payload = new FormData();
        payload.append('customerId', formData.customerId);
        payload.append('driverId', driverProfile.id);
        payload.append('quantity', formData.quantity);
        payload.append('pricePerLitre', fixedPrice.toString());
        payload.append('supplyDate', new Date().toISOString());
        payload.append('invoice', invoiceFile);

        const response = await apiRequest('/api/supplies', {
          method: 'POST',
          body: payload
        });

        if (response.ok) {
          toast.success("Sale registered! Pending approval.");
          setShowAddDispatch(false);
          resetForm();
          fetchDailyLog(currentDate);
        } else {
          const err = await response.json();
          toast.error(err.message || "Failed to register sale");
        }
      } catch (err) {
        toast.error("An error occurred");
      } finally {
        setFormLoading(false);
      }
    } else {
      // Transload
      if (!formData.destTruckId || !formData.quantity) {
        toast.error("Please select destination truck and quantity");
        return;
      }

      // Balance Check
      const qty = parseFloat(formData.quantity);
      if (qty > (dailyLog?.availableLoad || 0)) {
        toast.error(`Insufficient load. Available: ${dailyLog?.availableLoad.toLocaleString()} L`);
        return;
      }

      const destTruck = trucks.find(t => t.id === formData.destTruckId);
      if (driverProfile.truckType === 'Small' && destTruck?.truckType === 'Large') {
        toast.error("Invalid Transload: Small to Large is not allowed");
        return;
      }

      setFormLoading(true);
      try {
        const response = await apiRequest('/api/transloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceTruckId: driverProfile.assignedTruckId,
            destinationTruckId: formData.destTruckId,
            quantity: parseFloat(formData.quantity)
          })
        });

        if (response.ok) {
          toast.success("Transload request sent to receiver!");
          setShowAddDispatch(false);
          resetForm();
          fetchDailyLog(currentDate);
        } else {
          const err = await response.json();
          toast.error(err.message || "Failed to initiate transload");
        }
      } catch (err) {
        toast.error("Execution error");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleConfirmTransload = async (id: string) => {
    try {
      const resp = await apiRequest(`/api/transloads/${id}/confirm`, { method: 'POST' });
      if (resp.ok) {
        toast.success("Transload confirmed!");
        fetchDailyLog(currentDate);
      }
    } catch (err) {
      toast.error("Confirmation failed");
    }
  };

  const resetForm = () => {
    setFormData({ customerId: '', destTruckId: '', quantity: '' });
    setCustomerSearch('');
    setTruckSearch('');
    setShowCustomerDropdown(false);
    setShowTruckDropdown(false);
    setInvoiceFile(null);
    setFilePreview(null);
    setDispatchType('Sale');
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">CE</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">Fleet Operations</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Driver Portal</p>
          </div>
        </div>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {showProfile && (
        <div className="absolute top-[72px] right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-64 z-50 p-2 animate-in fade-in zoom-in-95">
          <div className="p-4 border-b border-gray-50 mb-2">
            <p className="text-sm font-bold">{user?.fullName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{driverProfile?.truckRegistration} ({driverProfile?.truckType})</p>
          </div>
          <button onClick={logout} className="w-full p-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 rounded-xl flex items-center gap-3">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}

      <main className="max-w-md mx-auto pb-24 px-4">
        {/* Date Nav */}
        <div className="py-6">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <button onClick={() => navigateDate('prev')} className="p-3 hover:bg-gray-50 rounded-xl"><ChevronLeft /></button>
            <div className="text-center">
              <p className="text-sm font-bold">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-green-500' : 'text-gray-400'}`}>
                {isToday ? 'Live Log' : 'Archived'}
              </span>
            </div>
            <button onClick={() => navigateDate('next')} disabled={isToday} className="p-3 hover:bg-gray-50 rounded-xl disabled:opacity-20"><ChevronRight /></button>
          </div>
        </div>


        {/* Pending Confirmations */}
        {dailyLog?.pendingConfirmations && dailyLog.pendingConfirmations.length > 0 && (
          <div className="mb-8 animate-pulse">
            <div className="flex items-center gap-2 mb-3 px-1 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Action Required</h3>
            </div>
            {dailyLog.pendingConfirmations.map(pc => (
              <div key={pc.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900">{pc.type}</p>
                  <p className="text-[10px] text-amber-700 font-semibold">{pc.title} • {pc.quantity} L</p>
                </div>
                <button
                  onClick={() => handleConfirmTransload(pc.id)}
                  className="px-4 py-2 bg-amber-600 text-white text-[10px] font-bold rounded-lg shadow-sm"
                >
                  Confirm
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Inward Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Inward Fuel
            </h2>
            <span className="text-[10px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg uppercase tracking-wider">Stock In</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center text-slate-300 gap-3">
                <Loader2 className="animate-spin w-5 h-5" />
                <p className="text-[10px] font-black uppercase">Loading Stock...</p>
              </div>
            ) : dailyLog?.logs.filter(l => l.type.includes('In') || l.type.includes('Load') || l.type.toLowerCase().includes('disbursement') || l.type.includes('Rollover')).length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-dashed border-slate-200 rounded-2xl py-8 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">No Inward records</p>
              </div>
            ) : (
              dailyLog?.logs
                .filter(l => l.type.includes('In') || l.type.includes('Load') || l.type.toLowerCase().includes('disbursement') || l.type.includes('Rollover'))
                .map((log) => (
                  <div key={log.id} className="bg-white dark:bg-gray-800 border-l-4 border-l-green-500 border-y border-r border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{log.type === 'Company Load' ? 'Disbursement' : log.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {log.type.replace('Company Load', 'Disbursement')} • {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-green-600 dark:text-green-400">+{(log.quantity || 0).toLocaleString()} L</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${log.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {log.status === 'Pending' && log.type.includes('Transload') && !log.isConfirmed ? 'Confirm Needed' : log.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Available Load Card */}
        <div className="mb-10">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 border border-white/10">
                <Fuel className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Operational Balance</p>
              <h2 className="text-5xl font-black tracking-tight">{(dailyLog?.availableLoad || 0).toLocaleString()}<span className="text-xl ml-1 text-slate-500 font-bold">L</span></h2>

              <div className="w-full mt-10 pt-8 border-t border-slate-800/50 flex items-center justify-center gap-12">
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Stock In</p>
                  <p className="text-lg font-black text-green-400">+{(dailyLog?.totalInToday || 0).toLocaleString()} L</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-800" />
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Stock Out</p>
                  <p className="text-lg font-black text-rose-400">-{(dailyLog?.totalOutToday || 0).toLocaleString()} L</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outward Section */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" /> Outward Usage
            </h2>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg uppercase tracking-wider">Dispatched</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center text-slate-300 gap-3">
                <Loader2 className="animate-spin w-5 h-5" />
                <p className="text-[10px] font-black uppercase">Syncing Sales...</p>
              </div>
            ) : dailyLog?.logs.filter(l => l.type === 'Sale' || l.type.includes('Out') || l.type.includes('Supply')).length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-dashed border-slate-200 rounded-2xl py-12 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-200 mx-auto mb-2 opacity-20" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">No dispatch activity</p>
              </div>
            ) : (
              dailyLog?.logs
                .filter(l => l.type === 'Sale' || l.type.includes('Out') || l.type.includes('Supply'))
                .map((log) => (
                  <div key={log.id} className="bg-white dark:bg-gray-800 border-l-4 border-l-rose-500 border-y border-r border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{log.title}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{log.type} • {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${log.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        log.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {log.status === 'Pending' && log.type.includes('Transload') && !log.isConfirmed ? 'Awaiting Confirm' : log.status}
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Quantity</p>
                        <p className="text-sm font-black text-rose-600">-{(log.quantity || 0).toLocaleString()} L</p>
                      </div>
                      {log.value > 0 && (
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Revenue Impact</p>
                          <p className="text-sm font-black text-slate-900">₦{(log.value || 0).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      {isToday && (
        <div className="fixed bottom-8 left-0 right-0 px-8 flex justify-center z-40">
          <button
            onClick={() => setShowAddDispatch(true)}
            className="w-full max-w-sm bg-slate-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-bold shadow-2xl active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Register Dispatch
          </button>
        </div>
      )}

      {/* Dispatch Modal */}
      <Modal isOpen={showAddDispatch} onClose={() => !formLoading && setShowAddDispatch(false)} title="New Dispatch Entry">
        <div className="space-y-6">
          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setDispatchType('Sale')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${dispatchType === 'Sale' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <ShoppingCart className="w-4 h-4" /> Supply to Customer
            </button>
            <button
              onClick={() => setDispatchType('Transload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${dispatchType === 'Transload' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <ArrowLeftRight className="w-4 h-4" /> Transload to Truck
            </button>
          </div>

          <form onSubmit={handleRegisterDispatch} className="space-y-6">
            {dispatchType === 'Sale' ? (
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Customer Account</label>
                  <div
                    className={`flex items-center gap-3 p-4 bg-slate-50 border rounded-2xl transition-all ${showCustomerDropdown ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-100'}`}
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span className={`text-sm font-semibold flex-1 ${formData.customerId ? 'text-slate-900' : 'text-slate-400'}`}>
                      {customers.find(c => c.id === formData.customerId)?.companyName || 'Select target customer...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-slate-50">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-0"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setFormData({ ...formData, customerId: '' }); setShowCustomerDropdown(false); }}
                          className="w-full p-4 text-left text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                        >
                          Clear Selection
                        </button>
                        {customers.filter(c => c.companyName.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, customerId: c.id });
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full p-4 text-left text-sm font-bold text-slate-900 border-t border-slate-50 hover:bg-blue-50 transition-colors flex items-center justify-between"
                          >
                            {c.companyName}
                            {formData.customerId === c.id && <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Destination Truck</label>
                  <div
                    className={`flex items-center gap-3 p-4 bg-slate-50 border rounded-2xl transition-all ${showTruckDropdown ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-100'}`}
                    onClick={() => setShowTruckDropdown(!showTruckDropdown)}
                  >
                    <TruckIcon className="w-4 h-4 text-slate-400" />
                    <span className={`text-sm font-semibold flex-1 ${formData.destTruckId ? 'text-slate-900' : 'text-slate-400'}`}>
                      {trucks.find(t => t.id === formData.destTruckId) ?
                        `${trucks.find(t => t.id === formData.destTruckId)?.registrationNumber} (${trucks.find(t => t.id === formData.destTruckId)?.driverName || 'No Driver'})`
                        : 'Select destination truck...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTruckDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {showTruckDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-slate-50">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search truck or driver..."
                          value={truckSearch}
                          onChange={e => setTruckSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-0"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {trucks
                          .filter(t => t.id !== driverProfile?.assignedTruckId)
                          .filter(t =>
                            t.registrationNumber.toLowerCase().includes(truckSearch.toLowerCase()) ||
                            (t.driverName && t.driverName.toLowerCase().includes(truckSearch.toLowerCase()))
                          ).map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, destTruckId: t.id });
                                setShowTruckDropdown(false);
                              }}
                              className="w-full p-4 text-left text-sm font-bold text-slate-900 border-t border-slate-50 hover:bg-blue-50 transition-colors flex items-center justify-between"
                            >
                              <div className="flex flex-col">
                                <span>{t.registrationNumber}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">{t.driverName || 'No Assigned Driver'}</span>
                              </div>
                              {formData.destTruckId === t.id && <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fuel Volume (Litres)</label>
              <div className="relative">
                <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black"
                />
              </div>
            </div>

            {dispatchType === 'Sale' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Capture</label>
                {filePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 h-40 group">
                    <img src={filePreview} alt="Invoice" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFilePreview(null)} className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Remove Image</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-2 p-6 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 dark:text-blue-400 active:scale-95 transition-all">
                      <Camera className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Camera</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 active:scale-95 transition-all">
                      <Upload className="w-6 h-6" /> <span className="text-[10px] font-black uppercase">Gallery</span>
                    </button>
                  </div>
                )}
                <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={handleFileChange} />
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button type="button" onClick={() => setShowAddDispatch(false)} className="py-4 rounded-2xl border border-slate-200 font-bold text-slate-600 text-sm">Cancel</button>
              <button type="submit" disabled={formLoading} className="py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-xl shadow-blue-200 flex items-center justify-center gap-2">
                {formLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Record Dispatch'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
