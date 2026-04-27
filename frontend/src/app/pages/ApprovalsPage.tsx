import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { CheckCircle, XCircle, Clock, Eye, Filter, Search, Fuel, ShoppingCart, Info, FileText, Loader2 } from 'lucide-react';
import { apiRequest, getFileUrl } from '@/utils/api';
import { Modal } from '@/app/components/Modal';

interface ApprovalItem {
    id: string;
    type: 'Supply' | 'Purchase' | 'Trans-load' | 'Maintenance' | 'Disbursement';
    details: string;
    isBatch?: boolean;
    batchId?: string;
    amount: string;
    status: string;
    date: string;
    requestedBy: string;
    // Extended details for View Modal
    customerName?: string;
    truckRegNumber?: string;
    driverName?: string;
    quantity?: number;
    totalAmount?: number;
    pricePerLitre?: number;
    invoiceUrl?: string;
}

export function ApprovalsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<{ id: string, action: 'approve' | 'reject', item: ApprovalItem } | null>(null);
    const [viewingItem, setViewingItem] = useState<ApprovalItem | null>(null);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            // Fetch both supplies and disbursements
            const [suppResponse, disResp] = await Promise.all([
                apiRequest('/api/supplies/pending'),
                apiRequest('/api/inwardloads/pending')
            ]);

            let items: ApprovalItem[] = [];

            if (suppResponse.ok) {
                const suppData = await suppResponse.json();
                items.push(...(suppData.data || []).map((s: any) => ({
                    id: s.id,
                    type: 'Supply' as const,
                    details: `${s.customerName} - ${s.truckRegNumber}`,
                    amount: `${(s.quantity || 0).toLocaleString()} L`,
                    status: s.status,
                    date: new Date(s.supplyDate).toLocaleDateString('en-GB'),
                    requestedBy: s.createdByName || 'N/A',
                    customerName: s.customerName,
                    truckRegNumber: s.truckRegNumber,
                    driverName: s.driverName,
                    quantity: s.quantity,
                    totalAmount: s.totalAmount,
                    pricePerLitre: s.pricePerLitre,
                    invoiceUrl: s.invoiceUrl
                })));
            }

            if (disResp.ok) {
                const disData = await disResp.json();
                items.push(...(disData.data || []).map((d: any) => ({
                    id: d.batchId,
                    batchId: d.batchId,
                    isBatch: true,
                    type: 'Disbursement' as const,
                    details: `${d.truckCount} Truck(s) - ${d.remarks || 'No remarks'}`,
                    amount: `${(d.totalQuantity || 0).toLocaleString()} L`,
                    status: 'Pending',
                    date: new Date(d.date).toLocaleDateString('en-GB'),
                    requestedBy: d.createdBy || 'Direct',
                    quantity: d.totalQuantity
                })));
            }

            setApprovals(items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (id: string, action: 'approve' | 'reject') => {
        const item = approvals.find(a => a.id === id);
        if (!item) return;

        setActionToConfirm({ id, action, item });
        setShowConfirmModal(true);
    };

    const handleView = (item: ApprovalItem) => {
        setViewingItem(item);
    };

    const confirmAction = async () => {
        if (!actionToConfirm) return;
 
        setIsSubmitting(true);
        const { id, action } = actionToConfirm;

        try {
            let url = '';
            if (actionToConfirm.item.type === 'Disbursement') {
                url = `/api/inwardloads/batch/${id}/approve`;
            } else {
                url = `/api/supplies/${id}/${action}`;
            }

            const options: RequestInit = { method: 'POST' };

            if (action === 'reject') {
                const reason = prompt("Enter rejection reason:");

                if (!reason) return;
                options.body = JSON.stringify({ reason });
                options.headers = { 'Content-Type': 'application/json' };
            }

            const response = await apiRequest(url, options);
            if (response.ok) {
                setSuccess(`Request ${action}d successfully`);
                setApprovals(prev => prev.filter(item => item.id !== id));
                setShowConfirmModal(false);
                setActionToConfirm(null);
            } else {
                const err = await response.json();
                setError(err.message || `Failed to ${action} request`);
            }
        } catch (err) {
            setError(`Error performing action`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredApprovals = approvals.filter(item =>
        item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Approvals"
                subtitle="Review and manage pending operational requests"
            />

            {/* Alerts */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700 p-1">×</button>
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 text-green-700 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{success}</span>
                    </div>
                    <button onClick={() => setSuccess(null)} className="text-green-900 hover:text-green-700 p-1">×</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Pending Requests List */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Filters & Search Header */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 relative w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by details or type..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all text-gray-900 dark:text-white text-sm"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-700 dark:text-gray-300 transition-all font-bold text-xs uppercase tracking-widest">
                            <Filter className="w-4 h-4" />
                            Filter
                        </button>
                    </div>

                    {/* Pending Items */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="bg-gray-50/50 dark:bg-gray-900/40 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <h3 className="font-black text-gray-900 dark:text-gray-100 tracking-tight text-sm uppercase">Pending Queue</h3>
                            </div>
                            <span className="text-[10px] font-black bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {filteredApprovals.length} Actions Required
                            </span>
                        </div>

                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching Approvals...</p>
                                </div>
                            ) : filteredApprovals.length === 0 ? (
                                <div className="py-20 text-center text-gray-400 dark:text-gray-500">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-medium">All caught up! No pending requests.</p>
                                </div>
                            ) : (
                                filteredApprovals.map((item) => (
                                    <div key={item.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                                item.type === 'Supply' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                item.type === 'Purchase' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                item.type === 'Disbursement' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                            }`}>
                                                {item.type === 'Supply' ? <Fuel className="w-6 h-6" /> : 
                                                 item.type === 'Purchase' ? <ShoppingCart className="w-6 h-6" /> :
                                                 <FileText className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{item.type}</span>
                                                    <span className="text-[9px] font-black text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded uppercase">{item.date}</span>
                                                </div>
                                                <h4 className="font-black text-gray-900 dark:text-gray-100 text-sm tracking-tight">{item.details}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                     <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.amount}</p>
                                                     <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">By: {item.requestedBy}</p>
                                                </div>
                                            </div>
                                        </div>                                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleAction(item.id, 'approve')}
                                                disabled={isSubmitting}
                                                className="p-2.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-xl hover:bg-green-100 transition-all active:scale-95 disabled:opacity-50"
                                                title="Approve"
                                            >
                                                {isSubmitting && actionToConfirm?.id === item.id && actionToConfirm?.action === 'approve' ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleAction(item.id, 'reject')}
                                                disabled={isSubmitting}
                                                className="p-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                                                title="Reject"
                                            >
                                                {isSubmitting && actionToConfirm?.id === item.id && actionToConfirm?.action === 'reject' ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleView(item)}
                                                disabled={isSubmitting}
                                                className="p-2.5 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50"
                                                title="View Details"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Action Center & Stats */}
                <div className="space-y-6">
                    {/* Action Center - Matching DriverOnboarding Style */}
                    <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 dark:shadow-none overflow-hidden relative">
                         {/* Decorative Background Element */}
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl font-black"></div>
                        
                        <h3 className="text-xl font-black mb-2 tracking-tight">Action Center</h3>
                        <p className="text-blue-100 text-xs mb-6 font-medium leading-relaxed">Review all operational requests carefully. Approval triggers systematic inventory updates.</p>

                        <div className="space-y-3">
                             <button
                                onClick={fetchPending}
                                disabled={loading}
                                className="w-full py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl font-black shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                {loading ? 'Updating...' : 'Refresh Queue'}
                            </button>
                            <p className="text-[10px] text-center text-blue-200 font-bold uppercase tracking-widest">Last Updated: {new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>

                    {/* Stats List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                        <h4 className="font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between text-xs uppercase tracking-widest border-b border-gray-50 dark:border-gray-900 pb-4">
                            Operational Insight
                            <div className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</div>
                        </h4>
                        
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-0.5 w-10 h-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Pending</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{approvals.length}</p>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, approvals.length * 10)}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-0.5 w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Fuel className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Supply Requests</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{approvals.filter(a => a.type === 'Supply').length}</p>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(approvals.filter(a => a.type === 'Supply').length / (approvals.length || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-0.5 w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Audit Required</p>
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1">Manual verification of documents required for high-volume loads.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                         <div className="flex items-center gap-3 mb-4">
                            <Info className="w-4 h-4 text-gray-400" />
                            <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Verification Status</h5>
                         </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            System audit is currently <span className="text-green-600 dark:text-green-400 font-black">STABLE</span>. 
                            Approved items are moved to historical logs immediately.
                         </p>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title={actionToConfirm?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
                size="md"
            >
                {actionToConfirm && (
                    <div className="space-y-6">
                        <div className={`p-4 rounded-xl border flex items-start gap-4 ${actionToConfirm.action === 'approve' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                            }`}>
                            <div className={`p-2 rounded-full ${actionToConfirm.action === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                {actionToConfirm.action === 'approve' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${actionToConfirm.action === 'approve' ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                    {actionToConfirm.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </h3>
                                <p className={`text-sm mt-1 ${actionToConfirm.action === 'approve' ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {actionToConfirm.action === 'approve'
                                        ? `Are you sure you want to approve this ${actionToConfirm.item.type.toLowerCase()} request?`
                                        : 'Are you sure you want to reject this request? This action cannot be undone.'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Request Type</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{actionToConfirm.item.type}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Customer / Details</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 text-right">{actionToConfirm.item.details}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Volume Amount</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{actionToConfirm.item.amount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Requested By</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{actionToConfirm.item.requestedBy}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                disabled={isSubmitting}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center gap-2 ${actionToConfirm.action === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSubmitting ? 'Processing...' : (actionToConfirm.action === 'approve' ? 'Approve Request' : 'Reject Request')}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* View Details Modal */}
            <Modal
                isOpen={!!viewingItem}
                onClose={() => setViewingItem(null)}
                title="Request Details"
                size="lg"
            >
                {viewingItem && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Type</p>
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mt-1 ${viewingItem.type === 'Supply' ? 'bg-blue-100 text-blue-700' :
                                    viewingItem.type === 'Purchase' ? 'bg-green-100 text-green-700' :
                                        viewingItem.type === 'Trans-load' ? 'bg-purple-100 text-purple-700' :
                                            viewingItem.type === 'Disbursement' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-orange-100 text-orange-700'
                                    }`}>
                                    {viewingItem.type}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</p>
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mt-1 ${viewingItem.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                    viewingItem.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                    {viewingItem.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Customer</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{viewingItem.customerName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Volume Amount</p>
                                <p className="text-lg font-black text-gray-900 dark:text-gray-100">{viewingItem.amount}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Price</p>
                                <p className="text-lg font-bold text-green-700">₦{(viewingItem.totalAmount || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Price Per Litre</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">₦{(viewingItem.pricePerLitre || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Truck</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingItem.truckRegNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Driver</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingItem.driverName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Requested By</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingItem.requestedBy}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingItem.date}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Invoice / Proof of Sale</p>
                            {viewingItem.invoiceUrl ? (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 p-2 shadow-inner">
                                    <img
                                        src={getFileUrl(viewingItem.invoiceUrl)}
                                        alt="Proof of Sale"
                                        className="w-full h-auto rounded-lg max-h-[500px] object-contain cursor-zoom-in bg-white dark:bg-gray-800"
                                        onClick={() => window.open(getFileUrl(viewingItem.invoiceUrl), '_blank')}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Not+Found';
                                        }}
                                    />
                                    <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                                        <Eye className="w-3 h-3" /> Click image to view full size
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500">
                                    <div className="w-12 h-12 mb-2 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <Filter className="w-6 h-6 text-gray-300" />
                                        {/* Using Filter icon as placeholder for generic file/image if Image icon not available in scope easily without adding import, but Eye is available. Let's use simple text. */}
                                    </div>
                                    <span className="text-sm">No invoice image attached</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 gap-3">
                            <button
                                onClick={() => setViewingItem(null)}
                                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setViewingItem(null); handleAction(viewingItem.id, 'reject'); }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => { setViewingItem(null); handleAction(viewingItem.id, 'approve'); }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                                >
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

