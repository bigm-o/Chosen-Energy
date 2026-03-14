import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { Settings, Users, Shield, Database, Bell, Lock, Plus, Edit, Power } from 'lucide-react';
import { apiRequest } from '@/utils/api';
import { Modal } from '@/app/components/Modal';
import { toast } from 'sonner';

interface User {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
}

export function SystemSettingsPage() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        role: 'Admin'
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiRequest('/api/users');
            const data = await response.json();
            setUsers(data.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiRequest('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowAddModal(false);
                setFormData({ fullName: '', email: '', username: '', password: '', role: 'Admin' });
                toast.success("User created successfully");
                fetchUsers();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to create user");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const response = await apiRequest(`/api/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    role: formData.role,
                    isActive: selectedUser.isActive // Keep existing status from state, unless we add toggle here
                })
            });

            if (response.ok) {
                setShowEditModal(false);
                setSelectedUser(null);
                toast.success("User updated successfully");
                fetchUsers();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to update user");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const handleToggleStatus = async (user: User) => {
        try {
            // If deactivating, use the Delete endpoint (soft delete)
            // If reactivating, we'd need an update endpoint that supports setting isActive=true explicitly.
            // Currently, Update endpoint supports IsActive.
            // Delete endpoint sets IsActive=false. 
            // So let's use Update for both to be safe and explicit, if backend allows.

            const newStatus = !user.isActive;

            const response = await apiRequest(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: user.fullName,
                    role: user.role,
                    isActive: newStatus
                })
            });

            if (response.ok) {
                toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
                fetchUsers();
            } else {
                toast.error("Failed to update status");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            password: '',
            role: user.role
        });
        setShowEditModal(true);
    };

    const tabs = [
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'roles', label: 'Role Permissions', icon: Shield },
        { id: 'system', label: 'System Config', icon: Settings },
        { id: 'database', label: 'Database & Backup', icon: Database },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="System Settings"
                subtitle="Configure application preferences, manage users, and system health"
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-gray-900 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-900/50 border border-gray-100'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-h-[400px]">
                {activeTab === 'users' && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">System Users</h3>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-blue-200 shadow-md hover:bg-blue-700 transition-colors"
                            >
                                + Add Administrator/Staff
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-10">Loading users...</div>
                        ) : (
                            <>
                                {/* Mobile Cards (Visible on mobile only) */}
                                <div className="md:hidden space-y-4">
                                    {users.map((u) => (
                                        <div key={u.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {u.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{u.fullName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                                                <Shield className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                                <span className="font-medium">Role: {u.role}</span>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[150px]">{u.email}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(u)}
                                                        className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 rounded-lg hover:bg-blue-100"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {u.role !== 'Admin' && (
                                                        <button
                                                            onClick={() => handleToggleStatus(u)}
                                                            className={`p-1.5 rounded-lg ${u.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Table (Visible on desktop only) */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                            <tr>
                                                <th className="text-left py-3 px-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Name</th>
                                                <th className="text-left py-3 px-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Role</th>
                                                <th className="text-left py-3 px-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Email</th>
                                                <th className="text-left py-3 px-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                                                <th className="text-right py-3 px-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {users.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {u.fullName}
                                                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400">@{u.username}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{u.role}</td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {u.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => openEditModal(u)}
                                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-bold flex items-center gap-1"
                                                            >
                                                                <Edit className="w-3 h-3" /> Edit
                                                            </button>
                                                            {u.role !== 'Admin' && (
                                                                <button
                                                                    onClick={() => handleToggleStatus(u)}
                                                                    title={u.isActive ? "Deactivate User" : "Activate User"}
                                                                    className={`p-1 rounded transition-colors ${u.isActive ? 'text-green-600 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                                                >
                                                                    <Power className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Other tabs remain same... */}
                {activeTab === 'system' && (
                    <div className="p-8 space-y-8">
                        <div className="max-w-xl space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-gray-400 dark:text-gray-500" /> Notification Preferences
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 cursor-pointer">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Alerts for Approvals</span>
                                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-blue-600 dark:text-blue-400" />
                                    </label>
                                    <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 cursor-pointer">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Warnings</span>
                                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-blue-600 dark:text-blue-400" />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" /> Security
                                </h3>
                                <div className="space-y-3">
                                    <button className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 font-medium text-gray-700 dark:text-gray-300">
                                        Change Admin Password
                                    </button>
                                    <button className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 font-medium text-gray-700 dark:text-gray-300">
                                        Configure 2FA Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="p-8 text-center py-20">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Database className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Database Management</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">Current Database Size: 45MB • Last Backup: 2 hours ago</p>
                        <button className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:bg-gray-800 transition-all">
                            Trigger Manual Backup
                        </button>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="p-8 text-center py-20 text-gray-400 dark:text-gray-500">
                        Role Management UI coming soon.
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New User" size="md">
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Full Name</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            >
                                <option value="Admin">Admin</option>
                                <option value="MD">MD</option>
                                <option value="GarageManager">Garage Manager</option>
                                {/* Driver creation is handled in Onboarding */}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Create User</button>
                    </div>
                </form>
            </Modal>

            {/* Edit User Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="md">
                <form onSubmit={handleEditUser} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Full Name</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Username (Read-only)</label>
                            <input
                                type="text"
                                value={formData.username}
                                readOnly
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            >
                                <option value="Admin">Admin</option>
                                <option value="MD">MD</option>
                                <option value="GarageManager">Garage Manager</option>
                                <option value="Driver">Driver</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Changes</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
