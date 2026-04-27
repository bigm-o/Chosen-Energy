import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { Plus, DollarSign, Download, Filter, Search, MoreVertical, Fuel, Wrench, Shield, Loader2, Calendar, Tag, FileText, Trash2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface Expense {
    id: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    source: 'Manual' | 'Fuel' | 'Maintenance';
    status: string;
    receiptUrl?: string;
}

interface ExpenseSummary {
    fuelCost: number;
    maintenanceCost: number;
    overheadCost: number;
    totalCost: number;
}

interface Category {
    id: string;
    name: string;
    isSystem: boolean;
}

export function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<ExpenseSummary | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expRes, sumRes, catRes] = await Promise.all([
                apiRequest('/api/expenses'),
                apiRequest('/api/expenses/summary'),
                apiRequest('/api/expenses/categories')
            ]);

            const [expData, sumData, catData] = await Promise.all([
                expRes.json(), sumRes.json(), catRes.json()
            ]);

            setExpenses(expData.data || []);
            setSummary(sumData.data);
            setCategories(catData.data || []);
        } catch (error) {
            toast.error("Failed to synchronize expense data");
        } finally {
            setLoading(false);
        }
    };

    const handleLogExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const method = selectedExpense ? 'PUT' : 'POST';
            const endpoint = selectedExpense ? `/api/expenses/${selectedExpense.id}` : '/api/expenses';

            const response = await apiRequest(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount)
                })
            });

            if (response.ok) {
                toast.success(selectedExpense ? "Expense updated" : "Expense logged successfully");
                setShowAddModal(false);
                setSelectedExpense(null);
                setFormData({
                    categoryId: '',
                    amount: '',
                    description: '',
                    expenseDate: new Date().toISOString().split('T')[0]
                });
                fetchData();
            } else {
                toast.error("Process failed");
            }
        } catch (error) {
            toast.error("Connection error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowClick = (expense: Expense) => {
        if (expense.source === 'Manual') {
            setSelectedExpense(expense);
            const category = categories.find(c => c.name === expense.category);
            setFormData({
                categoryId: category?.id || '',
                amount: expense.amount.toString(),
                description: expense.description,
                expenseDate: new Date(expense.date).toISOString().split('T')[0]
            });
            setShowAddModal(true);
        } else {
            // Read-only view for automatic expenses
            toast.info(`Auto-synced from ${expense.source}. Edit this in its original module.`, {
                description: expense.description,
                duration: 5000
            });
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Are you sure you want to remove this ledger entry?")) return;
        
        try {
            const response = await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' });
            if (response.ok) {
                toast.success("Expense deleted");
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleUploadReceipt = async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiRequest(`/api/expenses/${id}/receipt`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                toast.success("Receipt uploaded successfully");
                fetchData();
            } else {
                toast.error("Upload failed");
            }
        } catch (error) {
            toast.error("Network error during upload");
        }
    };

    const filteredExpenses = expenses.filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && expenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="text-sm font-bold uppercase tracking-[0.2em]">Auditing Financial Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Expenses"
                subtitle="Manage and categorize all operational and overhead costs"
                action={{
                    label: 'Log Expense',
                    onClick: () => {
                        setSelectedExpense(null);
                        setFormData({
                            categoryId: '',
                            amount: '',
                            description: '',
                            expenseDate: new Date().toISOString().split('T')[0]
                        });
                        setShowAddModal(true);
                    },
                    icon: <Plus className="w-4 h-4" />
                }}
            />

            {/* Expense Summary Cards */}
            {(() => {
                const derivedSummary = {
                    fuelCost: filteredExpenses.filter(e => e.source === 'Fuel').reduce((acc, e) => acc + e.amount, 0),
                    maintenanceCost: filteredExpenses.filter(e => e.source === 'Maintenance').reduce((acc, e) => acc + e.amount, 0),
                    overheadCost: filteredExpenses.filter(e => e.source === 'Manual').reduce((acc, e) => acc + e.amount, 0),
                    totalCost: filteredExpenses.reduce((acc, e) => acc + e.amount, 0)
                };

                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <Fuel className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-tighter bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">Fueling</span>
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Total Fuel Cost</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₦{derivedSummary.fuelCost.toLocaleString()}</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                                    <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-tighter bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded">Maintenance</span>
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Fleet Repairs</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₦{derivedSummary.maintenanceCost.toLocaleString()}</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-tighter bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">Overhead</span>
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">Office & Admin</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-gray-100">₦{derivedSummary.overheadCost.toLocaleString()}</p>
                        </div>
                    </div>
                );
            })()}

            {/* Main Content Area */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Full Transaction History</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            />
                        </div>
                        <button className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 transition-colors"><Filter className="w-4 h-4 text-gray-500" /></button>
                        <button className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 transition-colors"><Download className="w-4 h-4 text-gray-500" /></button>
                    </div>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredExpenses.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">No expenses found</p>
                        </div>
                    ) : (
                        filteredExpenses.map((expense) => (
                            <div 
                                key={expense.id} 
                                onClick={() => handleRowClick(expense)}
                                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                        expense.source === 'Fuel' ? 'bg-blue-50 text-blue-600' :
                                        expense.source === 'Maintenance' ? 'bg-orange-50 text-orange-600' :
                                        'bg-purple-50 text-purple-600'
                                    }`}>
                                        {expense.source === 'Fuel' ? <Fuel className="w-4 h-4" /> :
                                         expense.source === 'Maintenance' ? <Wrench className="w-4 h-4" /> : 
                                         <DollarSign className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{expense.description}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{expense.category}</span>
                                            <span className="text-[10px] text-gray-300">•</span>
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                            {expense.source !== 'Manual' && (
                                                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[8px] font-black uppercase text-gray-500 tracking-tighter">Auto-Synced</span>
                                            )}
                                            {expense.receiptUrl && (
                                                <span className="p-1 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-md">
                                                    <FileText className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-900 dark:text-gray-100">-₦{expense.amount.toLocaleString()}</p>
                                        <p className={`text-[10px] font-bold uppercase ${expense.status === 'Settled' || expense.status === 'Approved' || expense.status === 'Completed' ? 'text-green-600' : 'text-orange-500'}`}>
                                            {expense.status}
                                        </p>
                                    </div>
                                    {expense.source === 'Manual' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteExpense(expense.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Log/Edit Expense Modal */}
            <Modal 
                isOpen={showAddModal} 
                onClose={() => {
                    setShowAddModal(false);
                    setSelectedExpense(null);
                }} 
                title={
                    selectedExpense 
                        ? (selectedExpense.source === 'Manual' ? "Edit Expense Details" : "Expense Details (Auto-Synced)") 
                        : "Log Manual Expense"
                } 
                size="md"
            >
                <form onSubmit={handleLogExpense} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded inline-block w-fit mb-2">
                            Source: {selectedExpense?.source || 'Manual Entry'}
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-widest">Expense Category</label>
                            <div className="relative">
                                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select 
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-75"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                                    required
                                    disabled={!!selectedExpense && selectedExpense.source !== 'Manual'}
                                >
                                    <option value="">{selectedExpense?.source !== 'Manual' ? selectedExpense?.category : 'Select Category'}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-widest">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
                                <input 
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-75"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    required
                                    disabled={!!selectedExpense && selectedExpense.source !== 'Manual'}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-widest">Expense Date</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="date"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-75"
                                    value={formData.expenseDate}
                                    onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
                                    required
                                    disabled={!!selectedExpense && selectedExpense.source !== 'Manual'}
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1.5 tracking-widest">Description</label>
                            <div className="relative">
                                <FileText className="w-4 h-4 absolute left-3 top-4 text-gray-400" />
                                <textarea 
                                    placeholder="What was this expense for?"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 h-24 resize-none disabled:opacity-75"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    required
                                    disabled={selectedExpense && selectedExpense.source !== 'Manual'}
                                />
                            </div>
                        </div>
                    </div>

                    {selectedExpense && selectedExpense.source === 'Manual' && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                             <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-2 tracking-widest">Receipt / Document</label>
                             <div className="flex items-center gap-3">
                                {selectedExpense.receiptUrl ? (
                                    <a 
                                        href={selectedExpense.receiptUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg text-xs font-bold text-blue-600 border border-blue-100"
                                    >
                                        <FileText className="w-4 h-4" />
                                        View attached receipt
                                    </a>
                                ) : (
                                    <div className="flex-1 text-[10px] text-gray-400 italic">No receipt attached</div>
                                )}
                                <input 
                                    type="file" 
                                    id="receipt-upload" 
                                    className="hidden" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadReceipt(selectedExpense.id, file);
                                    }}
                                />
                                <label 
                                    htmlFor="receipt-upload"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer hover:bg-blue-700 transition-colors"
                                >
                                    {selectedExpense.receiptUrl ? 'Replace' : 'Upload'}
                                </label>
                             </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => {
                                setShowAddModal(false);
                                setSelectedExpense(null);
                            }}
                            className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 uppercase tracking-widest"
                        >
                            {selectedExpense && selectedExpense.source !== 'Manual' ? 'Close' : 'Cancel'}
                        </button>
                        
                        {(!selectedExpense || selectedExpense.source === 'Manual') && (
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                {selectedExpense ? "Save Changes" : "Process Ledger Entry"}
                            </button>
                        )}
                        
                        {selectedExpense && selectedExpense.source !== 'Manual' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                                <Shield className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Protected Record</span>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}
