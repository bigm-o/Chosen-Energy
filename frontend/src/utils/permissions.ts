export const ALL_PERMISSIONS = [
    { id: 'view_dashboard', label: 'View Dashboard', section: 'Main' },
    { id: 'view_purchasing', label: 'View Purchasing', section: 'Operations', canApprove: true },
    { id: 'view_supply', label: 'View Sales & Supply', section: 'Operations', canApprove: true },
    { id: 'view_transloading', label: 'View Transloading', section: 'Operations', canApprove: true },
    { id: 'view_daily_logs', label: 'View Daily Logs', section: 'Operations' },
    { id: 'view_approvals', label: 'View Approvals', section: 'Operations', canApprove: true },
    { id: 'view_inward_loads', label: 'View Disbursements', section: 'Operations', canApprove: true },
    { id: 'view_trucks', label: 'View Trucks', section: 'Fleet' },
    { id: 'view_drivers', label: 'View Drivers', section: 'Fleet' },
    { id: 'view_driver_onboarding', label: 'View Driver Onboarding', section: 'Fleet' },
    { id: 'view_maintenance', label: 'View Maintenance', section: 'Fleet', canApprove: true },
    { id: 'view_diesel_usage', label: 'View Diesel Usage', section: 'Fleet' },
    { id: 'view_customers', label: 'View Customers', section: 'Other' },
    { id: 'view_depots', label: 'View Depots', section: 'Other' },
    { id: 'view_invoices', label: 'View Invoices', section: 'Finance' },
    { id: 'view_expenses', label: 'View Expenses', section: 'Finance' },
    { id: 'view_communication', label: 'View Communication', section: 'Other' },
    { id: 'view_user_management', label: 'View User Management', section: 'Admin' },
    { id: 'view_settings', label: 'View Global Settings', section: 'Admin' },
];

export const APPROVAL_MAPPING: Record<string, string> = {
    'view_purchasing': 'approve_purchasing',
    'view_supply': 'approve_supply',
    'view_transloading': 'approve_transloading',
    'view_maintenance': 'approve_maintenance',
    'view_inward_loads': 'approve_inward_loads',
    'view_approvals': 'approve_approvals',
};

export const getRoleDefaultPermissions = (role: string): string[] => {
    switch (role) {
        case 'MD':
            return ALL_PERMISSIONS.map(p => p.id).concat(Object.values(APPROVAL_MAPPING));
        case 'Admin':
            return ALL_PERMISSIONS.map(p => p.id).concat(Object.values(APPROVAL_MAPPING));
        case 'GarageManager':
            return [
                'view_dashboard',
                'view_transloading',
                'view_daily_logs',
                'view_trucks',
                'view_drivers',
                'view_driver_onboarding',
                'view_maintenance',
                'view_diesel_usage',
                'view_depots',
                'view_communication'
            ];
        default:
            return [];
    }
};

export const hasPermission = (user: any, permissionId: string): boolean => {
    if (!user) return false;

    const custom = user.customPermissions || [];
    
    // If user has custom permissions, they are the source of truth for items in ALL_PERMISSIONS
    if (custom.length > 0) {
        return custom.includes(permissionId);
    }

    // Otherwise fallback to role defaults
    return getRoleDefaultPermissions(user.role).includes(permissionId);
};
