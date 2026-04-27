import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/app/components/PageHeader';
import { Modal } from '@/app/components/Modal';
import { apiRequest } from '@/utils/api';
import { toast } from 'sonner';
import {
    Users, Plus, Shield, KeyRound, UserX, UserCheck,
    MoreVertical, Loader2, CheckSquare, Square, Search, Clock
} from 'lucide-react';

interface AppUser {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    customPermissions: string[];
    requiresPasswordChange: boolean;
    lastLoginAt?: string;
}

const ALL_PERMISSIONS = [
    { id: 'view_purchasing', label: 'View Purchasing', section: 'Operations' },
    { id: 'view_supply', label: 'View Sales & Supply', section: 'Operations' },
    { id: 'view_transloading', label: 'View Transloading', section: 'Operations' },
    { id: 'view_daily_logs', label: 'View Daily Logs', section: 'Operations' },
    { id: 'view_approvals', label: 'View Approvals', section: 'Operations' },
    { id: 'view_inward_loads', label: 'View Disbursements', section: 'Operations' },
    { id: 'view_trucks', label: 'View Trucks', section: 'Fleet' },
    { id: 'view_drivers', label: 'View Drivers', section: 'Fleet' },
    { id: 'view_maintenance', label: 'View Maintenance', section: 'Fleet' },
    { id: 'view_diesel_usage', label: 'View Diesel Usage', section: 'Fleet' },
    { id: 'view_customers', label: 'View Customers', section: 'Other' },
    { id: 'view_depots', label: 'View Depots', section: 'Other' },
    { id: 'view_invoices', label: 'View Invoices', section: 'Finance' },
    { id: 'view_expenses', label: 'View Expenses', section: 'Finance' },
];

const ROLE_BADGE: Record<string, string> = {
    MD: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    GarageManager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Driver: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [createForm, setCreateForm] = useState({
        fullName: '', email: '', username: '', password: '', role: 'Admin'
    });

    const [newPassword, setNewPassword] = useState('');
    const [forceChange, setForceChange] = useState(true);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const fetchUsers = async () => {
        try {
            const res = await apiRequest('/api/users');
            const data = await res.json();
            if (data.success) setUsers(data.data);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!createForm.fullName || !createForm.email || !createForm.username || !createForm.password) {
            toast.error('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const res = await apiRequest('/api/users', {
                method: 'POST',
                body: JSON.stringify(createForm)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('User created successfully');
                setShowCreateModal(false);
                setCreateForm({ fullName: '', email: '', username: '', password: '', role: 'Admin' });
                fetchUsers();
            } else {
                toast.error(data.message || 'Failed to create user');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (user: AppUser) => {
        setSubmitting(true);
        try {
            const res = await apiRequest(`/api/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ fullName: user.fullName, role: user.role, isActive: !user.isActive })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(user.isActive ? 'User deactivated' : 'User reactivated');
                fetchUsers();
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setSubmitting(false);
            setMenuOpen(null);
        }
    };

    const openPermissions = (user: AppUser) => {
        setSelectedUser(user);
        setSelectedPermissions(user.customPermissions || []);
        setShowPermissionsModal(true);
        setMenuOpen(null);
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;
        setSubmitting(true);
        try {
            const res = await apiRequest(`/api/users/${selectedUser.id}/permissions`, {
                method: 'PUT',
                body: JSON.stringify({ permissions: selectedPermissions })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Permissions updated successfully');
                setShowPermissionsModal(false);
                fetchUsers();
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const openPasswordReset = (user: AppUser) => {
        setSelectedUser(user);
        setNewPassword('');
        setForceChange(true);
        setShowPasswordModal(true);
        setMenuOpen(null);
    };

    const handlePasswordReset = async () => {
        if (!selectedUser || !newPassword) {
            toast.error('Please enter a new password');
            return;
        }
        setSubmitting(true);
        try {
            const res = await apiRequest(`/api/users/${selectedUser.id}/reset-password`, {
                method: 'PUT',
                body: JSON.stringify({ newPassword, requiresPasswordChange: forceChange })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Password reset successfully');
                setShowPasswordModal(false);
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const togglePermission = (perm: string) => {
        setSelectedPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const permissionSections = [...new Set(ALL_PERMISSIONS.map(p => p.section))];

    const filtered = users.filter(u =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <PageHeader title="User Management" subtitle="Manage system users, roles, and access permissions" />
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Last Login</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Permissions</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold text-sm">No users found</p>
                                    </td>
                                </tr>
                            ) : filtered.map(u => (
                                <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-gray-100">{u.fullName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                                {u.requiresPasswordChange && (
                                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">⚠ Password change required</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_BADGE[u.role] || ROLE_BADGE['Driver']}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.customPermissions?.length > 0 ? (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {u.customPermissions.length} custom
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">Default</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <button
                                                onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                                                disabled={u.id === currentUser?.id}
                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title={u.id === currentUser?.id ? "Can't edit your own account" : 'Actions'}
                                            >
                                                <MoreVertical className="w-4 h-4 text-gray-500" />
                                            </button>
                                            {menuOpen === u.id && (
                                                <div className="absolute right-0 top-8 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-52 overflow-hidden">
                                                    <button
                                                        onClick={() => openPermissions(u)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <Shield className="w-4 h-4 text-indigo-500" />
                                                        Manage Permissions
                                                    </button>
                                                    <button
                                                        onClick={() => openPasswordReset(u)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <KeyRound className="w-4 h-4 text-amber-500" />
                                                        Reset Password
                                                    </button>
                                                    <div className="border-t border-gray-100 dark:border-gray-700" />
                                                    <button
                                                        onClick={() => handleToggleActive(u)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${u.isActive ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                                    >
                                                        {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                        {u.isActive ? 'Deactivate User' : 'Reactivate User'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New User" size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                            <input type="text" value={createForm.fullName} onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-gray-100"
                                placeholder="John Smith" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Role *</label>
                            <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-gray-100">
                                <option value="Admin">Admin</option>
                                <option value="GarageManager">Garage Manager</option>
                                <option value="MD">MD</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email *</label>
                        <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-gray-100"
                            placeholder="john@chosenergy.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Username *</label>
                            <input type="text" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-gray-100"
                                placeholder="jsmith" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password *</label>
                            <input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-gray-100"
                                placeholder="Temporary password" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm">Cancel</button>
                        <button onClick={handleCreate} disabled={submitting} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {submitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Permissions Modal */}
            <Modal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} title={`Permissions — ${selectedUser?.fullName}`} size="md">
                <div className="space-y-5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        Custom permissions <strong>extend</strong> the default access for this user's role. They won't restrict existing role access.
                    </p>
                    {permissionSections.map(section => (
                        <div key={section}>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{section}</p>
                            <div className="space-y-1.5">
                                {ALL_PERMISSIONS.filter(p => p.section === section).map(perm => {
                                    const checked = selectedPermissions.includes(perm.id);
                                    return (
                                        <button key={perm.id} onClick={() => togglePermission(perm.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${checked ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'}`}>
                                            {checked ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 flex-shrink-0" />}
                                            {perm.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowPermissionsModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm">Cancel</button>
                        <button onClick={handleSavePermissions} disabled={submitting} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                            {submitting ? 'Saving...' : 'Save Permissions'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Password Reset Modal */}
            <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title={`Reset Password — ${selectedUser?.fullName}`} size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password *</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-gray-100"
                            placeholder="Enter new password..." />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div onClick={() => setForceChange(!forceChange)} className={`w-11 h-6 rounded-full transition-colors flex items-center ${forceChange ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${forceChange ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Require password change on next login</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm">Cancel</button>
                        <button onClick={handlePasswordReset} disabled={submitting} className="flex-[2] py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                            {submitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Close menu on outside click */}
            {menuOpen && <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />}
        </div>
    );
}
