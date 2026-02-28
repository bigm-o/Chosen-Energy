import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, FileText, Download, Eye, DollarSign, Clock, CheckCircle } from 'lucide-react';

export function InvoicesPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Invoices"
                subtitle="Generate and track customer billing for diesel supplies"
                action={{
                    label: 'New Invoice',
                    onClick: () => { },
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Financial Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                    <p className="text-2xl font-black text-red-600">₦24.5M</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Paid (Month)</p>
                    <p className="text-2xl font-black text-green-600">₦82.1M</p>
                </div>
            </div>

            {/* Invoice Table Placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Inv #</th>
                            <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Customer</th>
                            <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Amount</th>
                            <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Due Date</th>
                            <th className="text-left py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="text-right py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-6 text-sm font-bold text-blue-600">INV-2026-04{i}</td>
                                <td className="py-4 px-6">
                                    <p className="text-sm font-bold text-gray-900">Premium Logistics Ltd</p>
                                </td>
                                <td className="py-4 px-6 text-sm font-black text-gray-900">₦{(450000 * i).toLocaleString()}</td>
                                <td className="py-4 px-6 text-sm text-gray-500">Feb 15, 2026</td>
                                <td className="py-4 px-6">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${i % 3 === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                        }`}>
                                        {i % 3 === 0 ? 'Overdue' : 'Paid'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4 text-gray-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
