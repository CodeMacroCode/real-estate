'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Briefcase,
  Building,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SafeUser, IRole } from '@/types';
import { StatusBadge, LoginStatusBadge, RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function StaffPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [roles, setRoles] = useState<IRole[]>([]);
  const [admins, setAdmins] = useState<SafeUser[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [currentUserRoleSlug, setCurrentUserRoleSlug] = useState<string>('');
  const [currentUserAllowedSubRoles, setCurrentUserAllowedSubRoles] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  // Strictly requested fields:
  // SuperAdmin: parentAdminId -> subrole category -> name, mobile, joiningDate, email, password
  // Admin: subrole category -> name, mobile, joiningDate, email, password
  const initialForm = {
    parentAdminId: '',
    roleId: '',
    name: '',
    mobile: '',
    joiningDate: new Date().toISOString().split('T')[0],
    email: '',
    password: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success && data.data?.role) {
        const slug = data.data.role.slug || '';
        setCurrentUserRoleSlug(slug);
        setCurrentUserAllowedSubRoles(data.data.user?.allowedSubRoles || []);

        if (slug === 'super_admin') {
          const adminsRes = await fetch('/api/users?userType=admin&limit=100');
          const adminsData = await adminsRes.json();
          if (adminsRes.ok && adminsData.success) {
            setAdmins(adminsData.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (selectedAdminId) params.append('parentAdminId', selectedAdminId);

      const res = await fetch(`/api/staff?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch staff members');
      }

      setUsers(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading staff directory');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, selectedAdminId]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (res.ok && data.success) {
        // Exclude admin and super_admin from staff sub-roles
        const staffRoles = (data.data || []).filter(
          (r: IRole) => r.slug !== 'super_admin' && r.slug !== 'admin'
        );
        setRoles(staffRoles);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  useEffect(() => {
    fetchRoles();
    fetchCurrentUser();
  }, [fetchRoles, fetchCurrentUser]);

  // Compute available subroles dynamically based on selected admin (for SuperAdmin) or current admin (for Admin)
  const availableSubRoles = useMemo(() => {
    if (currentUserRoleSlug === 'super_admin') {
      if (!formData.parentAdminId) return [];
      const selectedAdmin = admins.find((a) => a._id === formData.parentAdminId);
      const allowedSlugs = selectedAdmin?.allowedSubRoles || [];
      return roles.filter((r) => allowedSlugs.includes(r.slug));
    } else {
      // Admin: filtered by their own allowedSubRoles
      return roles.filter((r) => currentUserAllowedSubRoles.includes(r.slug));
    }
  }, [currentUserRoleSlug, formData.parentAdminId, admins, roles, currentUserAllowedSubRoles]);

  // When available subroles change, keep roleId valid
  useEffect(() => {
    if (availableSubRoles.length > 0) {
      const currentRoleValid = availableSubRoles.some((r) => r._id === formData.roleId);
      if (!currentRoleValid) {
        setFormData((prev) => ({ ...prev, roleId: availableSubRoles[0]._id }));
      }
    } else {
      setFormData((prev) => ({ ...prev, roleId: '' }));
    }
  }, [availableSubRoles]);

  const handleOpenAddModal = () => {
    const defaultAdminId = admins[0]?._id || selectedAdminId || '';
    setFormData({
      ...initialForm,
      parentAdminId: currentUserRoleSlug === 'super_admin' ? defaultAdminId : '',
    });
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: SafeUser) => {
    setSelectedUser(user);
    const parentId = (user as any).parentAdminId?._id || (user as any).parentAdminId || '';
    setFormData({
      parentAdminId: parentId,
      roleId: (user.role?._id || user.roleId) as string,
      name: user.name,
      mobile: user.mobile,
      joiningDate: new Date(user.joiningDate).toISOString().split('T')[0],
      email: user.email,
      password: '',
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenStatusModal = (user: SafeUser) => {
    setSelectedUser(user);
    setError(null);
    setIsStatusModalOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);

    try {
      if (!formData.roleId) {
        throw new Error('Please select an authorized Sub-Role Category');
      }
      if (currentUserRoleSlug === 'super_admin' && !formData.parentAdminId) {
        throw new Error('Please select an Admin first');
      }

      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        joiningDate: formData.joiningDate,
        roleId: formData.roleId,
      };

      if (currentUserRoleSlug === 'super_admin') {
        payload.parentAdminId = formData.parentAdminId;
      }

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create staff member');
      }

      setSuccessMsg(`Staff member ${data.data.name} created successfully!`);
      setIsAddModalOpen(false);
      fetchStaffList();
    } catch (err: any) {
      setError(err.message || 'Error submitting staff member');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    setFormSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        joiningDate: formData.joiningDate,
        roleId: formData.roleId,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      if (currentUserRoleSlug === 'super_admin' && formData.parentAdminId) {
        payload.parentAdminId = formData.parentAdminId;
      }

      const res = await fetch(`/api/staff/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update staff member');
      }

      setSuccessMsg(`Staff member ${data.data.name} updated successfully!`);
      setIsEditModalOpen(false);
      fetchStaffList();
    } catch (err: any) {
      setError(err.message || 'Error updating staff member');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser?._id) return;
    setFormSubmitting(true);
    setError(null);

    try {
      const nextStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/users/${selectedUser._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Requested status toggle to ${nextStatus}`,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update account status');
      }

      setSuccessMsg(`Staff account ${selectedUser.name} is now ${nextStatus}.`);
      setIsStatusModalOpen(false);
      fetchStaffList();
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
            Staff Directory & Sub-Roles
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage authorized staff sub-roles: Property Managers, Sales Executives, Sales Managers, and Website Managers.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <Alert
          type="success"
          title="Operation Successful"
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

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* SuperAdmin filter by Admin */}
        {currentUserRoleSlug === 'super_admin' && (
          <div>
            <select
              value={selectedAdminId}
              onChange={(e) => {
                setSelectedAdminId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Admins' Staff</option>
              {admins.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  Managed by: {admin.name} ({admin.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingOverlay message="Querying staff database..." />
        ) : users.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Staff Members Found"
              description="No sub-role staff records match your criteria."
              actionLabel="Add New Staff Member"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Staff Member</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Sub-Role</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Mobile Number</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Joining Date</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Managing Admin</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold">Login Status</th>
                  <th scope="col" className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/75 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge
                        roleSlug={user.role?.slug}
                        roleName={user.role?.name}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {user.mobile}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {(user as any).parentAdminId?.name ? (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800">
                            {(user as any).parentAdminId.name}
                          </span>
                          <span className="text-slate-400 block text-[11px]">
                            {(user as any).parentAdminId.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Self / Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4">
                      <LoginStatusBadge status={user.loginStatus} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit staff details"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        title="Add New Staff Member"
        description="Register a new staff member under an authorized sub-role category."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {error && isAddModalOpen && (
            <Alert type="error" title="Validation Failed" message={error} onClose={() => setError(null)} />
          )}

          {/* SuperAdmin sequence: 1. Select Admin Name */}
          {currentUserRoleSlug === 'super_admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Select Admin Name *
              </label>
              <select
                required
                value={formData.parentAdminId}
                onChange={(e) => setFormData({ ...formData, parentAdminId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Admin --</option>
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sequence: Sub-role Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Select Sub-Role Category *
            </label>
            <select
              required
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {availableSubRoles.length === 0 ? (
                <option value="">No permitted sub-roles found for selected admin</option>
              ) : (
                availableSubRoles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))
              )}
            </select>
            {currentUserRoleSlug === 'super_admin' && !formData.parentAdminId && (
              <p className="mt-1 text-xs text-amber-600">Select an admin above to load their permitted sub-roles.</p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Sharma"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Mobile Number & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 9876543210"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
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
          </div>

          {/* Email Address & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Email Address (Login) *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="staff@company.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">Password *</label>
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
              disabled={formSubmitting || (availableSubRoles.length === 0)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {formSubmitting && <Spinner size="sm" className="text-white" />}
              <span>Create Staff Member</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Staff Member"
        description={`Modify details for ${selectedUser?.name}.`}
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-4">
          {error && isEditModalOpen && (
            <Alert type="error" title="Update Failed" message={error} onClose={() => setError(null)} />
          )}

          {/* SuperAdmin can reassign Admin */}
          {currentUserRoleSlug === 'super_admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Assigned Admin *
              </label>
              <select
                required
                value={formData.parentAdminId}
                onChange={(e) => setFormData({ ...formData, parentAdminId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Admin --</option>
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-Role Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Sub-Role Category *
            </label>
            <select
              required
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {availableSubRoles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Full Name */}
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

          {/* Mobile Number & Joining Date */}
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
              <label className="block text-xs font-semibold text-slate-700 uppercase">Joining Date *</label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address & Password (Optional reset) */}
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
              <label className="block text-xs font-semibold text-slate-700 uppercase">Reset Password (Optional)</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current"
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
        title={selectedUser?.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
        description={`Are you sure you want to change status for ${selectedUser?.name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {selectedUser?.status === 'active'
              ? 'Deactivating this user will revoke their session and deny future login attempts.'
              : 'Activating this user will allow them to log in and access CRM modules according to their role permissions.'}
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
              <span>{selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
