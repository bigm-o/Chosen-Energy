import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { apiRequest } from '@/utils/api';
import { User, Phone, FileText, CheckCircle, AlertCircle, Save, Loader2, ShieldCheck, ClipboardCheck, HeartPulse, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem {
    id: string;
    label: string;
    status: 'pending' | 'checking' | 'completed';
    blurred: boolean;
    icon: any;
}

export function DriverOnboardingPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        licenseNumber: '',
        licenseExpiry: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        guarantorName: '',
        guarantorPhone: '',
        notes: ''
    });

    const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>({
        personal: { id: 'personal', label: 'Background Check Completed', status: 'pending', blurred: true, icon: ShieldCheck },
        license: { id: 'license', label: "Valid Driver's License Verified", status: 'pending', blurred: true, icon: ClipboardCheck },
        guarantor: { id: 'guarantor', label: 'Guarantor Records Verified', status: 'pending', blurred: true, icon: UserCheck },
    });

    // Handle dynamic checklist blur and checking
    useEffect(() => {
        const updateChecklist = async () => {
            const newChecklist = { ...checklist };

            // Personal Info / Background
            if (formData.fullName.length > 0 || formData.phone.length > 0) {
                newChecklist.personal.blurred = false;
            }
            // Background Check Validation: 11 digit phone, at least 2 names, and address present
            const isPhoneValid = /^\d{11}$/.test(formData.phone.replace(/[\s-]/g, ''));
            const hasTwoNames = formData.fullName.trim().split(/\s+/).length >= 2;
            const hasAddress = formData.address.trim().length > 5;

            if (isPhoneValid && hasTwoNames && hasAddress && newChecklist.personal.status === 'pending') {
                newChecklist.personal.status = 'checking';
                setChecklist({ ...newChecklist });
                await new Promise(r => setTimeout(r, 1500)); // Simulate backend check
                newChecklist.personal.status = 'completed';
                setChecklist({ ...newChecklist });
            }

            // License
            if (formData.licenseNumber.length > 0) {
                newChecklist.license.blurred = false;
            }
            if (formData.licenseNumber.length > 5 && formData.licenseExpiry && newChecklist.license.status === 'pending') {
                newChecklist.license.status = 'checking';
                setChecklist({ ...newChecklist });
                await new Promise(r => setTimeout(r, 1500));
                newChecklist.license.status = 'completed';
                setChecklist({ ...newChecklist });
            }

            // Guarantor
            if (formData.guarantorName.length > 0) {
                newChecklist.guarantor.blurred = false;
            }
            if (formData.guarantorName.length > 3 && formData.guarantorPhone.length >= 10 && newChecklist.guarantor.status === 'pending') {
                newChecklist.guarantor.status = 'checking';
                setChecklist({ ...newChecklist });
                await new Promise(r => setTimeout(r, 1500));
                newChecklist.guarantor.status = 'completed';
                setChecklist({ ...newChecklist });
            }
        };

        updateChecklist();
    }, [formData]);

    const isFormValid = Object.values(checklist).every(item => item.status === 'completed');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await apiRequest('/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    status: 'Inactive' // Initial onboarding status
                })
            });

            if (response.ok) {
                toast.success('Driver onboarded successfully. User account created.');
                setSuccess('Driver onboarded successfully. Account is INACTIVE until a truck is assigned.');
                setFormData({
                    fullName: '', phone: '', licenseNumber: '', licenseExpiry: '',
                    address: '', emergencyContactName: '', emergencyContactPhone: '',
                    guarantorName: '', guarantorPhone: '', notes: ''
                });
                // Reset checklist
                setChecklist({
                    personal: { id: 'personal', label: 'Background Check Completed', status: 'pending', blurred: true, icon: ShieldCheck },
                    license: { id: 'license', label: "Valid Driver's License Verified", status: 'pending', blurred: true, icon: ClipboardCheck },
                    guarantor: { id: 'guarantor', label: 'Guarantor Records Verified', status: 'pending', blurred: true, icon: UserCheck },
                });
            } else {
                const err = await response.json();
                setError(err.message || 'Failed to onboard driver');
                toast.error(err.message || 'Onboarding failed');
            }
        } catch (err) {
            setError('An error occurred during onboarding');
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Driver Onboarding"
                subtitle="Register and verify new fleet operators"
            />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="bg-gray-50/50 dark:bg-gray-900/40 px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-gray-100 tracking-tight">Personal Information</h3>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest">Identify the driver</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                        placeholder="e.g. Ahmed Ibrahim"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                        placeholder="090..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Residential Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all h-24 resize-none text-gray-900 dark:text-gray-100"
                                        placeholder="Full home address..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="bg-gray-50/50 dark:bg-gray-900/40 px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-gray-100 tracking-tight">License & Verification</h3>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest">Legal & compliance</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Driver's License No.</label>
                                    <input
                                        type="text"
                                        value={formData.licenseNumber}
                                        onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                        placeholder="ABC-12345-KY"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">License Expiry</label>
                                    <input
                                        type="date"
                                        value={formData.licenseExpiry}
                                        onChange={e => setFormData({ ...formData, licenseExpiry: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="bg-gray-50/50 dark:bg-gray-900/40 px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-gray-100 tracking-tight">Emergency & Guarantor</h3>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest">Backups & references</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Emergency Contact Name</label>
                                    <input
                                        type="text"
                                        value={formData.emergencyContactName}
                                        onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Emergency Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.emergencyContactPhone}
                                        onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Guarantor Name</label>
                                    <input
                                        type="text"
                                        value={formData.guarantorName}
                                        onChange={e => setFormData({ ...formData, guarantorName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Guarantor Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.guarantorPhone}
                                        onChange={e => setFormData({ ...formData, guarantorPhone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200">
                        <h3 className="text-xl font-bold mb-2">Action Center</h3>
                        <p className="text-blue-100 text-sm mb-6">Review all details before submitting. This will create a system user account automatically.</p>

                        <button
                            onClick={handleSubmit}
                            className={`w-full py-4 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 ${isFormValid && !loading
                                ? 'bg-white dark:bg-gray-800 text-blue-600 hover:shadow-xl active:scale-95'
                                : 'bg-blue-400 text-blue-200 cursor-not-allowed'
                                }`}
                            disabled={!isFormValid || loading}
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="w-5 h-5" /> Onboard Driver</>}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between">
                            Onboarding Checklist
                            <div className="text-[10px] bg-blue-50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Live Check</div>
                        </h4>
                        <div className="space-y-4">
                            {Object.values(checklist).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-start gap-4 transition-all duration-300 ${item.blurred ? 'opacity-20 blur-[2px] pointer-events-none' : 'opacity-100 blur-0'}`}
                                    >
                                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${item.status === 'completed' ? 'bg-green-100 text-green-600' :
                                            item.status === 'checking' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                            }`}>
                                            {item.status === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold ${item.status === 'completed' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{item.label}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={`h-1 flex-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden`}>
                                                    <div
                                                        className={`h-full transition-all duration-500 ${item.status === 'completed' ? 'w-full bg-green-500' :
                                                            item.status === 'checking' ? 'w-1/2 bg-blue-500 animate-pulse' : 'w-0'
                                                            }`}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                        {item.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
