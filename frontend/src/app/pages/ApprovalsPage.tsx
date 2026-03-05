import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { CheckCircle, XCircle, Clock, Eye, Filter, Search } from 'lucide-react';
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
                    amount: `${s.quantity.toLocaleString()} L`,
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
                    amount: `${d.totalQuantity.toLocaleString()} L`,
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
            // If there's an error, we might want to keep the modal open or close it.
            // For now, let's close it to avoid blocking the UI, but the error message will be visible.
            // setShowConfirmModal(false); // Decide if modal should close on error
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
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-900 hover:text-red-700">×</button>
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-green-900 hover:text-green-700">×</button>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pending</p>
                    <p className="text-2xl font-black text-gray-900">{approvals.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Waiting for MD</p>
                    <p className="text-2xl font-black text-orange-600">{approvals.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Action Required</p>
                    <p className="text-2xl font-black text-blue-600">{approvals.length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search approvals..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filter</span>
                </button>
            </div>

            {/* Mobile Cards (Visible on mobile only) */}
            <div className="md:hidden space-y-4">
                {filteredApprovals.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.type === 'Supply' ? 'bg-blue-100 text-blue-700' :
                                item.type === 'Purchase' ? 'bg-green-100 text-green-700' :
                                    item.type === 'Trans-load' ? 'bg-purple-100 text-purple-700' :
                                        item.type === 'Disbursement' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-orange-100 text-orange-700'
                                }`}>
                                {item.type}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-xs font-semibold text-orange-600">{item.status}</span>
                            </div>
                        </div>

                        <div className="mb-3">
                            <h3 className="font-bold text-gray-900 text-sm">{item.details}</h3>
                            <p className="text-xs text-gray-500 mt-1">Requested by: {item.requestedBy}</p>
                            <p className="text-xs text-gray-500">{item.date}</p>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <p className="text-sm font-black text-gray-900">{item.amount}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAction(item.id, 'approve')}
                                    className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleAction(item.id, 'reject')}
                                    className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleView(item)}
                                    className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Approvals Table (Visible on desktop only) */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Type</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Details</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Amount</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Requested By</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Date</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Loading...</td>
                                </tr>
                            ) : filteredApprovals.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                                        No pending requests found
                                    </td>
                                </tr>
                            ) : (
                                filteredApprovals.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.type === 'Supply' ? 'bg-blue-100 text-blue-700' :
                                                item.type === 'Purchase' ? 'bg-green-100 text-green-700' :
                                                    item.type === 'Trans-load' ? 'bg-purple-100 text-purple-700' :
                                                        item.type === 'Disbursement' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-orange-100 text-orange-700'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-bold text-gray-900">{item.details}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-black text-gray-900">{item.amount}</p>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{item.requestedBy}</td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{item.date}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                                <span className="text-xs font-semibold text-orange-600">{item.status}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(item.id, 'approve')}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(item.id, 'reject')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleView(item)}
                                                    className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                                                    title="View details"
                                                >
                                                    <Eye className="w-5 h-5" />
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

                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-xs font-bold text-gray-500 uppercase">Request Type</span>
                                <span className="text-sm font-bold text-gray-900">{actionToConfirm.item.type}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-xs font-bold text-gray-500 uppercase">Customer / Details</span>
                                <span className="text-sm font-bold text-gray-900 text-right">{actionToConfirm.item.details}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                                <span className="text-xs font-bold text-gray-500 uppercase">Volume Amount</span>
                                <span className="text-sm font-bold text-gray-900">{actionToConfirm.item.amount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Requested By</span>
                                <span className="text-sm font-medium text-gray-700">{actionToConfirm.item.requestedBy}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all transform hover:scale-105 ${actionToConfirm.action === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {actionToConfirm.action === 'approve' ? 'Approve Request' : 'Reject Request'}
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
                                <p className="text-xs font-bold text-gray-500 uppercase">Type</p>
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
                                <p className="text-xs font-bold text-gray-500 uppercase">Status</p>
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mt-1 ${viewingItem.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                    viewingItem.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                    {viewingItem.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Customer</p>
                                <p className="text-sm font-bold text-gray-900">{viewingItem.customerName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Volume Amount</p>
                                <p className="text-lg font-black text-gray-900">{viewingItem.amount}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Total Price</p>
                                <p className="text-lg font-bold text-green-700">₦{(viewingItem.totalAmount || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Price Per Litre</p>
                                <p className="text-sm font-medium text-gray-900">₦{(viewingItem.pricePerLitre || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Truck</p>
                                <p className="text-sm font-medium text-gray-900">{viewingItem.truckRegNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Driver</p>
                                <p className="text-sm font-medium text-gray-900">{viewingItem.driverName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Requested By</p>
                                <p className="text-sm font-medium text-gray-900">{viewingItem.requestedBy}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Date</p>
                                <p className="text-sm font-medium text-gray-900">{viewingItem.date}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <p className="text-sm font-bold text-gray-900 mb-3">Invoice / Proof of Sale</p>
                            {viewingItem.invoiceUrl ? (
                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-2 shadow-inner">
                                    <img
                                        src={getFileUrl(viewingItem.invoiceUrl)}
                                        alt="Proof of Sale"
                                        className="w-full h-auto rounded-lg max-h-[500px] object-contain cursor-zoom-in bg-white"
                                        onClick={() => window.open(getFileUrl(viewingItem.invoiceUrl), '_blank')}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Not+Found';
                                        }}
                                    />
                                    <div className="mt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                                        <Eye className="w-3 h-3" /> Click image to view full size
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                                    <div className="w-12 h-12 mb-2 rounded-full bg-gray-100 flex items-center justify-center">
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
                                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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

