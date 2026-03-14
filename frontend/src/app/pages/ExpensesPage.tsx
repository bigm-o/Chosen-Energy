import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, DollarSign, Download, Filter, Search, MoreVertical, Fuel, Wrench, Shield } from 'lucide-react';

export function ExpensesPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Expenses"
                subtitle="Manage and categorize all operational and overhead costs"
                action={{
                    label: 'Log Expense',
                    onClick: () => { },
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Expense Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl"><Fuel className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-tighter bg-blue-50 px-2 py-0.5 rounded">Fueling</span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Total Fuel Cost</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₦42.5M</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl"><Wrench className="w-6 h-6 text-orange-600" /></div>
                        <span className="text-[10px] font-black uppercase text-orange-600 tracking-tighter bg-orange-50 px-2 py-0.5 rounded">Maintenance</span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Fleet Repairs</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₦8.2M</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl"><Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div>
                        <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-tighter bg-purple-50 px-2 py-0.5 rounded">Overhead</span>
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Administrative</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₦3.1M</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Recent Transactions</h3>
                    <div className="flex items-center gap-2">
                        <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg"><Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                    </div>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center font-bold text-gray-400 dark:text-gray-500">
                                    {idx}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Garage Tooling Kit Buy</p>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Maintenance • Feb 12</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-900 dark:text-gray-100">-₦45,000</p>
                                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Settled</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
