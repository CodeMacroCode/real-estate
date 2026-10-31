'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  Shield,
  Phone,
  Mail,
  Building,
  Calendar,
  Briefcase,
  Eye,
  EyeOff,
  LogIn,
  Copy,
  Check,
} from 'lucide-react';
import { SafeUser, IRole } from '@/types';
import { StatusBadge, LoginStatusBadge, RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatDate } from '@/lib/dateUtils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface UsersClientProps {
  initialUsers: SafeUser[];
  initialRoles: IRole[];
  initialTotalPages: number;
  initialTotalCount: number;
  currentUserRoleSlug: string;
}

export function UsersClient({
  initialUsers = [],
  initialRoles = [],
  initialTotalPages = 1,
  initialTotalCount = 0,
  currentUserRoleSlug: initialRoleSlug = 'super_admin',
}: UsersClientProps) {
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [roles, setRoles] = useState<IRole[]>(initialRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [currentUserRoleSlug, setCurrentUserRoleSlug] = useState<string>(initialRoleSlug);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, passwordText: string) => {
    if (!passwordText) return;
    navigator.clipboard.writeText(passwordText);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoginAsAdmin = async (targetUser: SafeUser) => {
    if (
      !confirm(
        `Are you sure you want to log in as ${targetUser.name}? You will switch to their session and can return anytime.`
      )
    ) {
      return;
    }
    setImpersonatingId(targetUser._id);
    setError(null);
    try {
      const res = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser._id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to switch session');
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Error logging in as admin');
      setImpersonatingId(null);
    }
  };

  // Form State
  const initialForm = {
    name: '',
    email: '',
    password: '',
    mobile: '',
    department: 'Operations',
    designation: 'Admin',
    branch: 'Headquarters',
    roleId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    team: '',
    profilePhoto: '',
    allowedSubRoles: [] as string[],
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success && data.data?.role) {
        setCurrentUserRoleSlug(data.data.role.slug || '');
      }
    } catch (err) {
      console.error('Failed to load current user profile:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        userType: 'admin',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (departmentFilter) params.append('department', departmentFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading staff directory');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, departmentFilter, statusFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (res.ok && data.success) {
        setRoles(data.data || []);
        setFormData((prev) => (!prev.roleId && data.data?.length > 0 ? { ...prev, roleId: data.data[0]._id } : prev));
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }, []);

  const prevFilterRef = useRef({
    page: 1,
    searchTerm: '',
    departmentFilter: '',
    statusFilter: '',
  });

  useEffect(() => {
    const prev = prevFilterRef.current;
    if (
      prev.page === page &&
      prev.searchTerm === searchTerm &&
      prev.departmentFilter === departmentFilter &&
      prev.statusFilter === statusFilter
    ) {
      return;
    }
    prevFilterRef.current = { page, searchTerm, departmentFilter, statusFilter };
    fetchUsers();
  }, [page, searchTerm, departmentFilter, statusFilter, fetchUsers]);

  const handleOpenAddModal = () => {
    // When Super Admin creates, default to 'admin' role
    const defaultRole = currentUserRoleSlug === 'super_admin'
      ? roles.find((r) => r.slug === 'admin')?._id || roles[0]?._id || ''
      : roles.find((r) => r.slug === 'sales_executive')?._id || roles[0]?._id || '';

    setFormData({
      ...initialForm,
      department: currentUserRoleSlug === 'super_admin' ? 'Administration' : 'Sales',
      designation: currentUserRoleSlug === 'super_admin' ? 'System Administrator' : 'Sales Executive',
      branch: currentUserRoleSlug === 'super_admin' ? 'Headquarters' : 'Main Branch',
      roleId: defaultRole,
      allowedSubRoles: currentUserRoleSlug === 'super_admin' ? ['property_manager', 'sales_executive', 'sales_manager', 'website_manager'] : [],
    });
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: SafeUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: user.plainPassword || '',
      mobile: user.mobile,
      department: user.department,
      designation: user.designation,
      branch: user.branch,
      roleId: (user.role?._id || user.roleId) as string,
      joiningDate: new Date(user.joiningDate).toISOString().split('T')[0],
      team: user.team || '',
      profilePhoto: user.profilePhoto || '',
      allowedSubRoles: (user as any).allowedSubRoles || [],
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenStatusModal = (user: SafeUser) => {
    setSelectedUser(user);
    setError(null);
    setIsStatusModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMsg(`Admin account ${data.data.name} created successfully!`);
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error submitting user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    setFormSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        department: formData.department,
        designation: formData.designation,
        branch: formData.branch,
        roleId: formData.roleId,
        joiningDate: formData.joiningDate,
        team: formData.team,
        profilePhoto: formData.profilePhoto,
        allowedSubRoles: formData.allowedSubRoles || [],
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccessMsg(`Staff member ${data.data.name} updated successfully!`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error updating user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser?._id) return;
    setFormSubmitting(true);
    setError(null);

    const nextStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/users/${selectedUser._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Admin requested account ${nextStatus}`,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update account status');
      }

      setSuccessMsg(`Staff account ${selectedUser.name} is now ${nextStatus}.`);
      setIsStatusModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error toggling account status');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admin User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Super Administrator Portal: Provision administrators and configure delegated sub-role management authorities.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Admin</span>
        </button>
      </div>

      {successMsg && (
        <Alert
          type="success"
          title="Operation Succeeded"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {error && !isAddModalOpen && !isEditModalOpen && !isStatusModalOpen && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, email, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            <option value="Management">Management</option>
            <option value="Sales">Sales</option>
            <option value="Property Management">Property Management</option>
            <option value="Marketing">Marketing / Web</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingOverlay message="Querying staff database..." />
        ) : users.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Staff Members Found"
              description="No user records match your search or filter criteria."
              actionLabel="Add New Staff Member"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <Table className="min-w-[1550px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="w-[100px] whitespace-nowrap font-bold text-slate-700">Emp ID</TableHead>
                  <TableHead className="w-[170px] whitespace-nowrap font-bold text-slate-700">Admin Name</TableHead>
                  <TableHead className="w-[200px] whitespace-nowrap font-bold text-slate-700">Email Address</TableHead>
                  <TableHead className="w-[130px] whitespace-nowrap font-bold text-slate-700">Mobile</TableHead>
                  <TableHead className="w-[180px] whitespace-nowrap font-bold text-slate-700">Password</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap font-bold text-slate-700">Role</TableHead>
                  <TableHead className="w-[220px] whitespace-nowrap font-bold text-slate-700">Delegated Sub-Roles</TableHead>
                  <TableHead className="w-[130px] whitespace-nowrap font-bold text-slate-700">Department</TableHead>
                  <TableHead className="w-[130px] whitespace-nowrap font-bold text-slate-700">Designation</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap font-bold text-slate-700">Branch</TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap font-bold text-slate-700">Team</TableHead>
                  <TableHead className="w-[110px] whitespace-nowrap font-bold text-slate-700">Account Status</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap font-bold text-slate-700">Login Status</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap font-bold text-slate-700">Joining Date</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-bold text-slate-700 sticky right-0 bg-slate-50/95 backdrop-blur z-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {user.employeeId || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap font-medium">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap font-mono">
                      {user.mobile || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.plainPassword ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 w-fit">
                          <span className="font-mono text-xs font-semibold text-slate-800 tracking-wide select-all">
                            {visiblePasswords[user._id] ? user.plainPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user._id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                            title={visiblePasswords[user._id] ? 'Hide password' : 'Show password'}
                          >
                            {visiblePasswords[user._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(user._id, user.plainPassword!)}
                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition"
                            title="Copy password to clipboard"
                          >
                            {copiedId === user._id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 italic">Not Set (Legacy)</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="text-xs text-blue-600 hover:underline font-semibold"
                          >
                            Set
                          </button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <RoleBadge
                        roleSlug={user.role?.slug}
                        roleName={user.role?.name}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(user as any).allowedSubRoles && (user as any).allowedSubRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(user as any).allowedSubRoles.map((sub: string) => (
                            <span
                              key={sub}
                              className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
                            >
                              {sub.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 whitespace-nowrap">
                      {user.department || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                      {user.designation || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                      {user.branch || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {user.team || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <LoginStatusBadge status={user.loginStatus} />
                    </TableCell>
                    <TableCell suppressHydrationWarning className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(user.joiningDate)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur z-10">
                      <div className="flex items-center justify-end gap-1.5">
                        {currentUserRoleSlug === 'super_admin' && (
                          <button
                            onClick={() => handleLoginAsAdmin(user)}
                            disabled={impersonatingId === user._id || user.status !== 'active'}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition shadow-sm disabled:opacity-50"
                            title="Log in directly as this Admin"
                          >
                            {impersonatingId === user._id ? (
                              <Spinner className="w-3 h-3 text-amber-800" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            <span>Login As</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit admin details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(user)}
                          className={`p-1.5 rounded-lg transition ${
                            user.status === 'active'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={user.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{users.length}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> total staff members
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Admin"
        description="Provision an administrator account and assign delegated sub-roles."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && isAddModalOpen && (
            <Alert type="error" title="Validation Failed" message={error} onClose={() => setError(null)} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rahul Verma"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="jane@company.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Initial Password *</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 num"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+919876543210"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Assigned Role *</label>
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {(currentUserRoleSlug === 'super_admin'
                  ? roles.filter((r) => r.slug === 'admin')
                  : roles
                ).map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subroles checkboxes when SuperAdmin selects 'admin' role */}
          {currentUserRoleSlug === 'super_admin' &&
            roles.find((r) => r._id === formData.roleId)?.slug === 'admin' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-900">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Delegated Sub-Roles For This Admin</span>
                </div>
                <p className="text-xs text-slate-600">
                  Select which sub-roles this Admin can create and manage in their staff directory:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { slug: 'property_manager', label: 'Property Manager' },
                    { slug: 'sales_executive', label: 'Sales Executive' },
                    { slug: 'sales_manager', label: 'Sales Manager' },
                    { slug: 'website_manager', label: 'Website Manager' },
                  ].map((subrole) => {
                    const checked = formData.allowedSubRoles?.includes(subrole.slug);
                    return (
                      <label key={subrole.slug} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = formData.allowedSubRoles || [];
                            const updated = e.target.checked
                              ? [...current, subrole.slug]
                              : current.filter((s) => s !== subrole.slug);
                            setFormData({ ...formData, allowedSubRoles: updated });
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{subrole.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Omit Department, Designation, Branch, Joining Date, and Team inputs when SuperAdmin is creating an Admin */}
          {currentUserRoleSlug !== 'super_admin' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Branch *</label>
                  <input
                    type="text"
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Team / Unit (Optional)</label>
                  <input
                    type="text"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    placeholder="Alpha Sales Team"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>Create Staff Account</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Admin Account"
        description={`Modify configuration and sub-roles for ${selectedUser?.name}.`}
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {error && isEditModalOpen && (
            <Alert type="error" title="Update Failed" message={error} onClose={() => setError(null)} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Admin Password {formData.password ? '' : '(Optional)'}
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password or keep existing"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Assigned Role *</label>
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {(currentUserRoleSlug === 'super_admin'
                  ? roles.filter((r) => r.slug === 'admin')
                  : roles
                ).map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subroles checkboxes when SuperAdmin selects 'admin' role */}
          {currentUserRoleSlug === 'super_admin' &&
            roles.find((r) => r._id === formData.roleId)?.slug === 'admin' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-900">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Delegated Sub-Roles For This Admin</span>
                </div>
                <p className="text-xs text-slate-600">
                  Select which sub-roles this Admin can create and manage in their staff directory:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { slug: 'property_manager', label: 'Property Manager' },
                    { slug: 'sales_executive', label: 'Sales Executive' },
                    { slug: 'sales_manager', label: 'Sales Manager' },
                    { slug: 'website_manager', label: 'Website Manager' },
                  ].map((subrole) => {
                    const checked = formData.allowedSubRoles?.includes(subrole.slug);
                    return (
                      <label key={subrole.slug} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = formData.allowedSubRoles || [];
                            const updated = e.target.checked
                              ? [...current, subrole.slug]
                              : current.filter((s) => s !== subrole.slug);
                            setFormData({ ...formData, allowedSubRoles: updated });
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{subrole.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Omit Department, Designation, Branch, Joining Date, and Team inputs when SuperAdmin is editing an Admin */}
          {currentUserRoleSlug !== 'super_admin' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Branch *</label>
                  <input
                    type="text"
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Team / Unit</label>
                  <input
                    type="text"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Account Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={selectedUser?.status === 'active' ? 'Deactivate Staff Account' : 'Activate Staff Account'}
        description={`Confirm status update for ${selectedUser?.name}.`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {error && isStatusModalOpen && (
            <Alert type="error" title="Status Change Failed" message={error} onClose={() => setError(null)} />
          )}

          <p className="text-sm text-slate-600">
            {selectedUser?.status === 'active'
              ? `Are you sure you want to deactivate ${selectedUser.name}'s account? When deactivated, the user will be immediately rejected upon attempting any authenticated request or API operation.`
              : `Are you sure you want to reactivate ${selectedUser?.name}'s account? They will be able to log in with their existing credentials.`}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                selectedUser?.status === 'active'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>{selectedUser?.status === 'active' ? 'Deactivate Now' : 'Activate Now'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
