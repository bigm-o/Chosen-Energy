import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, Fuel, Truck, MapPin, Calendar, Clock, Loader2, Gauge } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface DieselUsage {
    id: string;
    truckId: string;
    truckRegNumber: string;
    driverId: string;
    driverName: string;
    quantityLitres: number;
    usageDate: string;
    route?: string;
    mileage?: number;
    createdByName?: string;
    createdAt: string;
}

interface TruckData {
    id: string;
    registrationNumber: string;
    capacityLitres: number;
    status: string;
    assignedDriverId: string | null;
    driverName: string | null;
}

export function DieselUsagePage() {
    const { user } = useAuth();
    const [usages, setUsages] = useState<DieselUsage[]>([]);
    const [trucks, setTrucks] = useState<TruckData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        truckId: '',
        driverId: '',
        quantityLitres: '',
        usageDate: new Date().toISOString().split('T')[0],
        route: '',
        mileage: ''
    });

    const fetchData = async () => {
        try {
            const [usagesRes, trucksRes] = await Promise.all([
                apiRequest('/api/dieselusage'),
                apiRequest('/api/trucks')
            ]);
            
            const usagesData = await usagesRes.json();
            const trucksData = await trucksRes.json();
            
            if (usagesData.success) setUsages(usagesData.data);
            if (trucksData.success) {
                // Filter active trucks
                setTrucks(trucksData.data.filter((t: any) => t.status !== 'Inactive'));
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load diesel usage records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddUsage = async () => {
        if (!formData.truckId || !formData.quantityLitres || !formData.usageDate) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const response = await apiRequest('/api/dieselusage', {
                method: 'POST',
                body: JSON.stringify({
                    truckId: formData.truckId,
                    driverId: formData.driverId,
                    quantityLitres: parseFloat(formData.quantityLitres),
                    usageDate: new Date(formData.usageDate).toISOString(),
                    route: formData.route,
                    mileage: formData.mileage ? parseInt(formData.mileage) : null
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Diesel usage recorded successfully");
                setShowAddModal(false);
                setFormData({
                    truckId: '',
                    driverId: '',
                    quantityLitres: '',
                    usageDate: new Date().toISOString().split('T')[0],
                    route: '',
                    mileage: ''
                });
                fetchData();
            } else {
                toast.error(data.message || "Failed to record usage");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while recording usage");
        } finally {
            setSubmitting(false);
        }
    };

    const handleTruckChange = (truckId: string) => {
        const truck = trucks.find(t => t.id === truckId);
        setFormData({ 
            ...formData, 
            truckId, 
            driverId: truck?.assignedDriverId || '' 
        });
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader 
                    title="Diesel Usage" 
                    subtitle="Track day-to-day diesel consumption by fleet trucks"
                />
                {(user?.role === 'Admin' || user?.role === 'MD') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Record Usage
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Truck & Driver</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Volume (L)</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Route / Purpose</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Recorded By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {usages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold text-sm">No diesel usage records found</p>
                                    </td>
                                </tr>
                            ) : (
                                usages.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(u.usageDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Truck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-gray-100">{u.truckRegNumber}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{u.driverName || 'No Driver'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-gray-900 dark:text-gray-100">
                                                {u.quantityLitres.toLocaleString()} L
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.route ? (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{u.route}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                            {u.mileage && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Gauge className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{u.mileage.toLocaleString()} KM</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{u.createdByName}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record Diesel Usage" size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Truck</label>
                        <select
                            value={formData.truckId}
                            onChange={(e) => handleTruckChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-900 dark:text-gray-100"
                        >
                            <option value="">-- Choose Truck --</option>
                            {trucks.map(t => (
                                <option key={t.id} value={t.id}>{t.registrationNumber} - {t.driverName || 'Unassigned'}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Volume Consumed (L)</label>
                        <input 
                            type="number" 
                            value={formData.quantityLitres}
                            onChange={(e) => setFormData({ ...formData, quantityLitres: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-900 dark:text-gray-100" 
                            placeholder="Enter liters..." 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                            <input 
                                type="date" 
                                value={formData.usageDate}
                                onChange={(e) => setFormData({ ...formData, usageDate: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-900 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mileage (Optional)</label>
                            <input 
                                type="number" 
                                value={formData.mileage}
                                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                                placeholder="e.g. 45000"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-900 dark:text-gray-100" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Route / Purpose (Optional)</label>
                        <input 
                            type="text" 
                            value={formData.route}
                            onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                            placeholder="e.g. Lagos to Abuja delivery"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-900 dark:text-gray-100" 
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={() => setShowAddModal(false)} 
                            className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddUsage}
                            disabled={submitting}
                            className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Fuel className="w-4 h-4" />
                                    Save Record
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
