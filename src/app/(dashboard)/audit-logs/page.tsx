'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  History,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  User as UserIcon,
  Globe,
  Layers,
} from 'lucide-react';
import { IAuditLog, AuditAction, SafeUser } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { LoadingOverlay } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [currentUserRoleSlug, setCurrentUserRoleSlug] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);

  // Hierarchical Filter State
  // View mode / scope:
  // Super Admin: 'all' | 'own' | 'admin' | 'subrole'
  // Admin: 'all' | 'own' | 'subrole'
  const [logScope, setLogScope] = useState<string>('all');

  // Admin Selection (for Super Admin)
  const [admins, setAdmins] = useState<SafeUser[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [isAdminSearching, setIsAdminSearching] = useState(false);

  // Sub-Role Category & Staff User Selection
  const [subRoleCategories, setSubRoleCategories] = useState<{ slug: string; name: string }[]>([]);
  const [selectedSubRoleCategory, setSelectedSubRoleCategory] = useState<string>('');
  const [staffUsers, setStaffUsers] = useState<SafeUser[]>([]);
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>('');
  const [isStaffSearching, setIsStaffSearching] = useState(false);

  // Diff Modal
  const [selectedLog, setSelectedLog] = useState<IAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch Current Logged-in Profile
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success && data.data?.role) {
        const slug = data.data.role.slug;
        setCurrentUserRoleSlug(slug);
        setCurrentUser(data.data.user);

        if (slug === 'super_admin') {
          // Fetch initial admins list
          const adminRes = await fetch('/api/users?userType=admin&limit=20');
          const adminData = await adminRes.json();
          if (adminRes.ok && adminData.success) {
            setAdmins(adminData.data || []);
          }
        } else if (slug === 'admin') {
          // Sub-roles configured for this admin
          const allowedSlugs: string[] = data.data.user?.allowedSubRoles || [];
          const categoryLabels: Record<string, string> = {
            property_manager: 'Property Manager',
            sales_executive: 'Sales Executive',
            sales_manager: 'Sales Manager',
            website_manager: 'Website Manager',
          };
          const categories = allowedSlugs.map((s) => ({
            slug: s,
            name: categoryLabels[s] || s.replace(/_/g, ' '),
          }));
          setSubRoleCategories(categories);
          if (categories.length > 0) {
            setSelectedSubRoleCategory(categories[0].slug);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile for audit:', err);
    }
  }, []);

  // Server-side debounced search for Admins (Super Admin)
  const handleAdminServerSearch = useCallback(async (query: string) => {
    setIsAdminSearching(true);
    try {
      const params = new URLSearchParams({
        userType: 'admin',
        limit: '20',
      });
      if (query.trim()) params.append('search', query.trim());

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAdmins(data.data || []);
      }
    } catch (err) {
      console.error('Failed to search admins:', err);
    } finally {
      setIsAdminSearching(false);
    }
  }, []);

  // When Super Admin selects an Admin, update their permitted sub-roles
  useEffect(() => {
    if (currentUserRoleSlug === 'super_admin' && selectedAdminId) {
      const adminObj = admins.find((a) => a._id === selectedAdminId);
      const allowedSlugs: string[] = adminObj?.allowedSubRoles || [];
      const categoryLabels: Record<string, string> = {
        property_manager: 'Property Manager',
        sales_executive: 'Sales Executive',
        sales_manager: 'Sales Manager',
        website_manager: 'Website Manager',
      };
      const categories = allowedSlugs.map((s) => ({
        slug: s,
        name: categoryLabels[s] || s.replace(/_/g, ' '),
      }));
      setSubRoleCategories(categories);
      if (categories.length > 0) {
        setSelectedSubRoleCategory(categories[0].slug);
      } else {
        setSelectedSubRoleCategory('');
        setStaffUsers([]);
        setSelectedStaffUserId('');
      }
    }
  }, [currentUserRoleSlug, selectedAdminId, admins]);

  // Server-side search for Staff Users in category
  const handleStaffServerSearch = useCallback(
    async (query: string) => {
      if (!selectedSubRoleCategory) return;
      setIsStaffSearching(true);
      try {
        const params = new URLSearchParams({ limit: '20' });
        if (query.trim()) params.append('search', query.trim());
        if (currentUserRoleSlug === 'super_admin' && selectedAdminId) {
          params.append('parentAdminId', selectedAdminId);
        }

        const res = await fetch(`/api/staff?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const filtered = (data.data || []).filter(
            (u: SafeUser) => (u.role as any)?.slug === selectedSubRoleCategory
          );
          setStaffUsers(filtered);
        }
      } catch (err) {
        console.error('Failed to search staff:', err);
      } finally {
        setIsStaffSearching(false);
      }
    },
    [selectedSubRoleCategory, currentUserRoleSlug, selectedAdminId]
  );

  useEffect(() => {
    if (selectedSubRoleCategory) {
      handleStaffServerSearch('');
    }
  }, [selectedSubRoleCategory, handleStaffServerSearch]);

  // Fetch Audit Logs according to hierarchy
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity', entityFilter);

      // Hierarchical filter parameters
      if (logScope === 'own') {
        params.append('scope', 'own');
      } else if (logScope === 'admin') {
        params.append('scope', 'admin');
        if (selectedAdminId) params.append('adminId', selectedAdminId);
      } else if (logScope === 'subrole') {
        params.append('scope', 'subrole');
        if (currentUserRoleSlug === 'super_admin' && selectedAdminId) {
          params.append('adminId', selectedAdminId);
        }
        if (selectedStaffUserId) {
          params.append('userId', selectedStaffUserId);
        }
      } else if (logScope === 'all') {
        if (currentUserRoleSlug === 'super_admin' && selectedAdminId) {
          params.append('adminId', selectedAdminId);
        }
      }

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve audit trail');
      }

      setLogs(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
      setTotalCount(data.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error querying audit database');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    actionFilter,
    entityFilter,
    logScope,
    selectedAdminId,
    selectedStaffUserId,
    currentUserRoleSlug,
  ]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleOpenDetail = (log: IAuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'create':
        return <Badge variant="success">Create</Badge>;
      case 'update':
        return <Badge variant="info">Update</Badge>;
      case 'delete':
        return <Badge variant="danger">Delete</Badge>;
      case 'login':
        return <Badge variant="purple">Login</Badge>;
      case 'logout':
        return <Badge variant="default">Logout</Badge>;
      case 'status_change':
        return <Badge variant="warning">Status Change</Badge>;
      case 'publish':
        return <Badge variant="success">Publish</Badge>;
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <History className="w-7 h-7 text-blue-600" />
          Audit & Compliance Trail
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentUserRoleSlug === 'super_admin'
            ? 'Super Admin Audit: Inspect your own activity, specific Admin logs, or drill down into sub-role staff users.'
            : 'Admin Audit: Inspect your own activity or drill down into staff members under your delegated sub-roles.'}
        </p>
      </div>

      {error && <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />}

      {/* Hierarchical Filter Selector Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Audit Scope & Hierarchy</span>
          </div>

          {/* Quick Scope Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setLogScope('all');
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                logScope === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Logs
            </button>
            <button
              type="button"
              onClick={() => {
                setLogScope('own');
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                logScope === 'own'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Own Logs
            </button>
            {currentUserRoleSlug === 'super_admin' && (
              <button
                type="button"
                onClick={() => {
                  setLogScope('admin');
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  logScope === 'admin'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Specific Admin Logs
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setLogScope('subrole');
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                logScope === 'subrole'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sub-Role Staff Logs
            </button>
          </div>
        </div>

        {/* Drill-Down Dropdowns depending on logScope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Step A: SuperAdmin selects Admin */}
          {currentUserRoleSlug === 'super_admin' && (logScope === 'admin' || logScope === 'subrole' || logScope === 'all') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Admin
              </label>
              <SearchableSelect
                options={admins.map((a) => ({
                  value: a._id,
                  label: a.name,
                  subLabel: a.email,
                }))}
                value={selectedAdminId}
                onChange={(val) => {
                  setSelectedAdminId(val);
                  setPage(1);
                }}
                onSearchChange={handleAdminServerSearch}
                isLoading={isAdminSearching}
                debounceMs={300}
                placeholder="All Admins or search..."
                searchPlaceholder="Search admin name/email..."
              />
            </div>
          )}

          {/* Step B: Sub-Role Category (shown when logScope is 'subrole') */}
          {logScope === 'subrole' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Sub-Role Category
              </label>
              <select
                value={selectedSubRoleCategory}
                onChange={(e) => {
                  setSelectedSubRoleCategory(e.target.value);
                  setSelectedStaffUserId('');
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {subRoleCategories.length === 0 ? (
                  <option value="">No sub-roles available</option>
                ) : (
                  subRoleCategories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Step C: Specific Staff User (shown when logScope is 'subrole') */}
          {logScope === 'subrole' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Staff Member
              </label>
              <SearchableSelect
                options={staffUsers.map((u) => ({
                  value: u._id,
                  label: u.name,
                  subLabel: u.email,
                }))}
                value={selectedStaffUserId}
                onChange={(val) => {
                  setSelectedStaffUserId(val);
                  setPage(1);
                }}
                onSearchChange={handleStaffServerSearch}
                isLoading={isStaffSearching}
                debounceMs={300}
                disabled={staffUsers.length === 0}
                placeholder={staffUsers.length === 0 ? "No staff found" : "All staff in category or search..."}
                searchPlaceholder="Search staff by name/email..."
              />
            </div>
          )}

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="status_change">Status Change</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="publish">Publish</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
              Entity Type
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="role">Role</option>
              <option value="role_permissions">Role Permissions</option>
              <option value="session">Session</option>
              <option value="property">Property</option>
              <option value="lead">Lead</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingOverlay message="Querying audit records..." />
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Audit Records Found"
              description="No audit events matched your filter criteria."
            />
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[190px]">Timestamp</TableHead>
                  <TableHead className="w-[220px]">Actor</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead className="w-[180px]">Entity &amp; ID</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{log.actor.name}</div>
                      <div className="text-xs text-slate-500">{log.actor.email}</div>
                      <div className="text-[11px] font-mono text-purple-600 capitalize">
                        {log.actor.roleSlug?.replace(/_/g, ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-slate-800 uppercase">
                        {log.entity}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                        {log.entityId}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.source}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => handleOpenDetail(log)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Payload</span>
                      </button>
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
            Showing <span className="font-semibold">{logs.length}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> total audit events
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

      {/* Payload Inspection Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Event Details"
        description={`Event ID: ${selectedLog?._id} | Entity: ${selectedLog?.entity}:${selectedLog?.entityId}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 font-sans block text-[10px] uppercase font-semibold">Actor</span>
                <span className="text-slate-800 font-semibold">{selectedLog.actor.name} ({selectedLog.actor.roleSlug})</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block text-[10px] uppercase font-semibold">Timestamp</span>
                <span className="text-slate-800">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
            </div>

            {selectedLog.oldValues && (
              <div>
                <div className="font-sans font-semibold text-slate-700 uppercase text-[11px] mb-1">
                  Previous Values (Pre-mutation)
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValues && (
              <div>
                <div className="font-sans font-semibold text-slate-700 uppercase text-[11px] mb-1">
                  Mutated Values (Post-mutation)
                </div>
                <pre className="bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}

            {!selectedLog.oldValues && !selectedLog.newValues && (
              <p className="text-slate-500 italic font-sans">No additional payload recorded for this event.</p>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="font-sans rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
