import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, Package, Truck, ArrowRightLeft, Eye, Filter, Search } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';

export function TransloadingPage() {
    const { user } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Trans-loading"
                subtitle="Manage fuel transfers between fleet tankers"
                action={{
                    label: 'New Transfer',
                    onClick: () => setShowAddModal(true),
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Transfers</p>
                    <p className="text-2xl font-black text-gray-900">3</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Vol (Today)</p>
                    <p className="text-2xl font-black text-blue-600">12,400 L</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ArrowRightLeft className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Trans-loading Module</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    This records transfers of stock between tankers. Features include volume verification and dual-driver confirmation.
                </p>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all text-sm"
                >
                    Create First Transfer Entry
                </button>
            </div>

            {/* Modern Modal Placeholder */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Log Fuel Trans-load" size="md">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Source Truck</label>
                            <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg outline-none">
                                <option>Select Tanker</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Truck</label>
                            <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg outline-none">
                                <option>Select Tanker</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Volume to Transfer (L)</label>
                        <input type="number" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-00 rounded-lg" placeholder="0" />
                    </div>
                    <p className="text-[10px] text-orange-600 font-bold bg-orange-50 p-2 rounded">
                        Note: Both drivers will be required to confirm this transfer in their daily logs.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-500">Cancel</button>
                        <button className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold">Initiate Transfer</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
