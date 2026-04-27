import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, FileText, Download, Eye, DollarSign, Clock, CheckCircle, Search, Filter, Loader2, CreditCard } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface Invoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amountDue: number;
    amountPaid: number;
    dueDate: string;
    status: 'Unpaid' | 'PartiallyPaid' | 'Paid' | 'Overdue';
}

interface InvoiceSummary {
    totalOutstanding: number;
    paidThisMonth: number;
    pendingInvoicesCount: number;
    overdueInvoicesCount: number;
}

export function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [summary, setSummary] = useState<InvoiceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const [listRes, sumRes] = await Promise.all([
                apiRequest('/api/invoices'),
                apiRequest('/api/invoices/summary')
            ]);
            
            const [listData, sumData] = await Promise.all([
                listRes.json(),
                sumRes.json()
            ]);

            setInvoices(listData.data || []);
            setSummary(sumData.data);
        } catch (error) {
            toast.error("Failed to load invoice records");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        setIsSubmitting(true);
        try {
            const response = await apiRequest(`/api/invoices/${selectedInvoice.id}/pay`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(paymentAmount) })
            });

            if (response.ok) {
                toast.success("Payment recorded successfully");
                setShowPaymentModal(false);
                setPaymentAmount('');
                fetchInvoices();
            } else {
                toast.error("Failed to process payment");
            }
        } catch (error) {
            toast.error("Connection error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredInvoices = invoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="text-sm font-bold uppercase tracking-[0.2em]">Synchronizing Accounts Receivable...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Invoices"
                subtitle="Track and manage customer billing for fuel supplies"
                action={{
                    label: 'New Invoice',
                    onClick: () => { 
                        toast.info("Invoices are automatically generated from approved Sale & Supply records.");
                    },
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Financial Stats */}
            {(() => {
                const derivedSummary = {
                    totalOutstanding: filteredInvoices.reduce((acc, inv) => acc + (inv.amountDue - inv.amountPaid), 0),
                    paidThisMonth: filteredInvoices.reduce((acc, inv) => acc + inv.amountPaid, 0), // Simplifying for filtered view
                    pendingInvoicesCount: filteredInvoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'PartiallyPaid').length,
                    overdueInvoicesCount: filteredInvoices.filter(inv => inv.status === 'Overdue').length
                };

                return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Outstanding</p>
                            <p className="text-2xl font-black text-red-600 dark:text-red-400">₦{derivedSummary.totalOutstanding.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Paid (Filtered)</p>
                            <p className="text-2xl font-black text-green-600 dark:text-green-400">₦{derivedSummary.paidThisMonth.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Pending Payment</p>
                            <p className="text-2xl font-black text-orange-500">{derivedSummary.pendingInvoicesCount}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Overdue Notices</p>
                            <p className="text-2xl font-black text-red-600">{derivedSummary.overdueInvoicesCount}</p>
                        </div>
                    </div>
                );
            })()}

            {/* Table Area */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Accounts Receivable Ledger</h3>
                    <div className="flex items-center gap-3">
                         <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search INV# or Customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            />
                        </div>
                        <button className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 transition-colors"><Filter className="w-4 h-4 text-gray-500" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Ref</th>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Entity</th>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Billed Amount</th>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
                                <th className="text-right py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No matching invoices</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{inv.customerName}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-black text-gray-900 dark:text-gray-100">₦{inv.amountDue.toLocaleString()}</p>
                                            {inv.amountPaid > 0 && (
                                                <p className="text-[10px] font-bold text-green-600 mt-0.5">Paid: ₦{inv.amountPaid.toLocaleString()}</p>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                inv.status === 'Paid' ? 'bg-green-50 text-green-600' :
                                                inv.status === 'PartiallyPaid' ? 'bg-blue-50 text-blue-600' :
                                                inv.status === 'Overdue' ? 'bg-red-50 text-red-600' :
                                                'bg-orange-50 text-orange-600'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                {new Date(inv.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {inv.status !== 'Paid' && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedInvoice(inv);
                                                            setPaymentAmount((inv.amountDue - inv.amountPaid).toString());
                                                            setShowPaymentModal(true);
                                                        }}
                                                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="Log Payment"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg">
                                                    <Download className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Invoice Payment"
                size="sm"
            >
                <form onSubmit={handleMarkAsPaid} className="space-y-6 pt-2">
                    <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Invoice Details</p>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-500">Invoice Ref:</span>
                            <span className="text-xs font-black text-gray-900 dark:text-gray-100">{selectedInvoice?.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Balance Due:</span>
                            <span className="text-xs font-black text-red-600">₦{((selectedInvoice?.amountDue || 0) - (selectedInvoice?.amountPaid || 0)).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest">Amount Paid</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                            <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Confirm Payment Received
                    </button>
                </form>
            </Modal>
        </div>
    );
}
