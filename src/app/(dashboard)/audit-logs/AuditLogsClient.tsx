'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Search,
  RotateCcw,
  Copy,
  Check,
  FileText,
  Activity,
  ArrowRight,
  Key,
  ShieldAlert,
} from 'lucide-react';
import { IAuditLog, AuditAction, SafeUser } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { LoadingOverlay, Spinner } from '@/components/ui/Spinner';
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
import { formatDateTime } from '@/lib/dateUtils';

interface AuditLogsClientProps {
  initialLogs: IAuditLog[];
  initialTotalPages: number;
  initialTotalCount: number;
  initialAdmins?: SafeUser[];
  currentUserRoleSlug: string;
  currentUser: SafeUser | null;
}

function formatRoleSlug(slug: string | undefined): string {
  if (!slug) return 'User';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditLogsClient({
  initialLogs = [],
  initialTotalPages = 1,
  initialTotalCount = 0,
  initialAdmins = [],
  currentUserRoleSlug: initialRoleSlug = '',
  currentUser: initialUser = null,
}: AuditLogsClientProps) {
  const [logs, setLogs] = useState<IAuditLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentUserRoleSlug] = useState<string>(initialRoleSlug);

  // Hierarchical Filter State: 'all' | 'own' | 'admin' | 'subrole'
  const [logScope, setLogScope] = useState<string>('all');

  // Admin Selection (for Super Admin)
  const [admins, setAdmins] = useState<SafeUser[]>(initialAdmins);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [isAdminSearching, setIsAdminSearching] = useState(false);

  // Sub-Role Category & Staff User Selection
  const initialSubRoles = useMemo(() => {
    if (initialRoleSlug === 'admin' && initialUser?.allowedSubRoles) {
      return initialUser.allowedSubRoles.map((s) => ({
        slug: s,
        name: formatRoleSlug(s),
      }));
    }
    return [];
  }, [initialRoleSlug, initialUser]);

  const [subRoleCategories, setSubRoleCategories] = useState<{ slug: string; name: string }[]>(initialSubRoles);
  const [selectedSubRoleCategory, setSelectedSubRoleCategory] = useState<string>(
    initialSubRoles.length > 0 ? initialSubRoles[0].slug : ''
  );
  const [staffUsers, setStaffUsers] = useState<SafeUser[]>([]);
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>('');
  const [isStaffSearching, setIsStaffSearching] = useState(false);

  // Detail / Diff Modal State
  const [selectedLog, setSelectedLog] = useState<IAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'diff' | 'raw'>('diff');
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  // When Super Admin selects an Admin, update their permitted sub-roles dynamically
  useEffect(() => {
    if (currentUserRoleSlug === 'super_admin' && selectedAdminId) {
      const adminObj = admins.find((a) => a._id === selectedAdminId);
      const allowedSlugs: string[] = adminObj?.allowedSubRoles || [];
      const categories = allowedSlugs.map((s) => ({
        slug: s,
        name: formatRoleSlug(s),
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

  const prevCategoryRef = useRef(selectedSubRoleCategory);
  useEffect(() => {
    if (logScope === 'subrole' && selectedSubRoleCategory && prevCategoryRef.current !== selectedSubRoleCategory) {
      prevCategoryRef.current = selectedSubRoleCategory;
      handleStaffServerSearch('');
    }
  }, [logScope, selectedSubRoleCategory, handleStaffServerSearch]);

  // Fetch Audit Logs according to hierarchy & filters
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

  const prevFilterRef = useRef({
    page: 1,
    actionFilter: '',
    entityFilter: '',
    logScope: 'all',
    selectedAdminId: '',
    selectedStaffUserId: '',
  });

  useEffect(() => {
    const prev = prevFilterRef.current;
    if (
      prev.page === page &&
      prev.actionFilter === actionFilter &&
      prev.entityFilter === entityFilter &&
      prev.logScope === logScope &&
      prev.selectedAdminId === selectedAdminId &&
      prev.selectedStaffUserId === selectedStaffUserId
    ) {
      return;
    }
    prevFilterRef.current = {
      page,
      actionFilter,
      entityFilter,
      logScope,
      selectedAdminId,
      selectedStaffUserId,
    };
    fetchLogs();
  }, [
    page,
    actionFilter,
    entityFilter,
    logScope,
    selectedAdminId,
    selectedStaffUserId,
    fetchLogs,
  ]);

  // Client-side quick filter for text matching
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      const actorName = log.actor?.name?.toLowerCase() || '';
      const actorEmail = log.actor?.email?.toLowerCase() || '';
      const entity = log.entity?.toLowerCase() || '';
      const entityId = log.entityId?.toLowerCase() || '';
      const action = log.action?.toLowerCase() || '';
      return (
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        entity.includes(q) ||
        entityId.includes(q) ||
        action.includes(q)
      );
    });
  }, [logs, searchQuery]);

  const hasActiveFilters = Boolean(
    actionFilter || entityFilter || selectedAdminId || selectedStaffUserId || searchQuery || logScope !== 'all'
  );

  const handleResetFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setSearchQuery('');
    setSelectedAdminId('');
    setSelectedStaffUserId('');
    setLogScope('all');
    setPage(1);
  };

  const handleOpenDetail = (log: IAuditLog) => {
    setSelectedLog(log);
    setModalTab('diff');
    setIsDetailModalOpen(true);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            Create
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            Update
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            Delete
          </span>
        );
      case 'login':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            Login
          </span>
        );
      case 'logout':
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            Logout
          </span>
        );
      case 'status_change':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            Status
          </span>
        );
      case 'publish':
        return (
          <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
            Publish
          </span>
        );
      case 'unpublish':
        return (
          <span className="inline-flex items-center rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 border border-orange-200">
            Unpublish
          </span>
        );
      case 'assign':
        return (
          <span className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 border border-sky-200">
            Assign
          </span>
        );
      case 'export':
        return (
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            Export
          </span>
        );
      case 'import':
        return (
          <span className="inline-flex items-center rounded-md bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 border border-violet-200">
            Import
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 capitalize">
            {action}
          </span>
        );
    }
  };

  // Compute key-value differences for structured diff display
  const structuredDiff = useMemo(() => {
    if (!selectedLog) return [];
    const oldVals = (selectedLog.oldValues || {}) as Record<string, any>;
    const newVals = (selectedLog.newValues || {}) as Record<string, any>;

    const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

    return allKeys.map((key) => {
      const oldVal = oldVals[key];
      const newVal = newVals[key];
      const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

      return {
        key,
        oldVal: oldVal !== undefined ? JSON.stringify(oldVal) : '—',
        newVal: newVal !== undefined ? JSON.stringify(newVal) : '—',
        isChanged,
      };
    });
  }, [selectedLog]);

  return (
    <div className="space-y-6">
      {error && <Alert type="error" title="Notice" message={error} onClose={() => setError(null)} />}

      {/* Header & Hierarchy Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Scope Navigation Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900">
                  Audit Trail &amp; Activity Log
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {totalCount} events
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Immutable records of system actions, authentication events, and data changes.
              </p>
            </div>
          </div>

          {/* Scope Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setLogScope('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                logScope === 'all'
                  ? 'bg-white text-blue-600 shadow-xs'
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                logScope === 'own'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Actions
            </button>

            {currentUserRoleSlug === 'super_admin' && (
              <button
                type="button"
                onClick={() => {
                  setLogScope('admin');
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  logScope === 'admin'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Activity
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setLogScope('subrole');
                setPage(1);
                if (selectedSubRoleCategory) {
                  handleStaffServerSearch('');
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                logScope === 'subrole'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff Activity
            </button>
          </div>
        </div>

        {/* Refinement Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Quick Search */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Search Actor / ID
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Name, email, entity ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Super Admin Admin Selector */}
          {currentUserRoleSlug === 'super_admin' && (logScope === 'all' || logScope === 'admin' || logScope === 'subrole') && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Admin Organization {logScope === 'admin' ? '*' : '(Optional)'}
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Admin Accounts' },
                  ...admins.map((a) => ({
                    value: a._id,
                    label: a.name,
                    subLabel: a.email,
                  })),
                ]}
                value={selectedAdminId}
                onChange={(val) => {
                  setSelectedAdminId(val);
                  setSelectedStaffUserId('');
                  setPage(1);
                }}
                onSearchChange={handleAdminServerSearch}
                placeholder="Search Admin..."
                isLoading={isAdminSearching}
              />
            </div>
          )}

          {/* Sub-role Category Picker */}
          {logScope === 'subrole' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Sub-Role Category
              </label>
              <select
                value={selectedSubRoleCategory}
                onChange={(e) => {
                  setSelectedSubRoleCategory(e.target.value);
                  setSelectedStaffUserId('');
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {subRoleCategories.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  subRoleCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Sub-role Staff User Picker */}
          {logScope === 'subrole' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Staff Member (Optional)
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Staff in Category' },
                  ...staffUsers.map((u) => ({
                    value: u._id,
                    label: u.name,
                    subLabel: u.email,
                  })),
                ]}
                value={selectedStaffUserId}
                onChange={(val) => {
                  setSelectedStaffUserId(val);
                  setPage(1);
                }}
                onSearchChange={handleStaffServerSearch}
                placeholder="Search Staff Member..."
                isLoading={isStaffSearching}
              />
            </div>
          )}

          {/* Action Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Action Types</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="status_change">Status Change</option>
              <option value="assign">Assign</option>
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Entity Type
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="role">Role</option>
              <option value="permission">Permission</option>
              <option value="lead">Lead</option>
              <option value="property">Property</option>
              <option value="client">Client</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Filtering applied • {filteredLogs.length} matching events
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden relative min-h-[380px]">
        {loading && <LoadingOverlay message="Loading audit events..." />}

        {filteredLogs.length === 0 && !loading ? (
          <EmptyState
            title="No audit records match your query"
            description="Try switching the scope filter or resetting action and entity filters."
            icon={<History className="w-6 h-6 text-slate-400" />}
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <colgroup>
                <col className="w-[190px]" />
                <col className="w-[240px]" />
                <col className="w-[120px]" />
                <col />
                <col className="w-[130px]" />
                <col className="w-[120px]" />
              </colgroup>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="w-[190px] text-xs font-semibold text-slate-700">Timestamp</TableHead>
                  <TableHead className="w-[240px] text-xs font-semibold text-slate-700">Actor</TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold text-slate-700 text-center">Action</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Entity &amp; Target</TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold text-slate-700 text-center">Source IP</TableHead>
                  <TableHead className="w-[120px] text-right text-xs font-semibold text-slate-700">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const hasPayload = Boolean(log.oldValues || log.newValues);
                  return (
                    <TableRow key={log._id} className="hover:bg-slate-50/75 transition border-b border-slate-100">
                      {/* Timestamp */}
                      <TableCell className="w-[190px] whitespace-nowrap text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span suppressHydrationWarning>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </TableCell>

                      {/* Actor Profile */}
                      <TableCell className="w-[240px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs shrink-0">
                            {log.actor?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">{log.actor?.name || 'System'}</div>
                            <div className="text-[11px] text-slate-500 truncate">{log.actor?.email}</div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {formatRoleSlug(log.actor?.roleSlug)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="w-[120px] text-center">{getActionBadge(log.action)}</TableCell>

                      {/* Entity & ID */}
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 uppercase shrink-0">
                            {log.entity}
                          </span>
                          {log.entityId && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(log.entityId || '', `entity-${log._id}`)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 transition truncate max-w-[260px]"
                              title="Click to copy entity ID"
                            >
                              <span className="truncate">{log.entityId}</span>
                              {copiedField === `entity-${log._id}` ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {/* Client IP */}
                      <TableCell className="w-[130px] text-center text-xs text-slate-600">
                        <span className="font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-600">
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                      </TableCell>

                      {/* Inspect Button */}
                      <TableCell className="w-[120px] text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(log)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition border ${
                            hasPayload
                              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Showing {filteredLogs.length} of {totalCount} total audit records
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-semibold text-slate-700 px-2">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Event Payload Diff Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Event Details"
        description="Inspect actor payload, client user-agent metadata, and state change delta."
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Event Header Banner */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs">
                  {selectedLog.actor?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {selectedLog.actor?.name || 'System Actor'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedLog.actor?.email} • {formatRoleSlug(selectedLog.actor?.roleSlug)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getActionBadge(selectedLog.action)}
                <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedLog.ipAddress || '127.0.0.1'}
                </span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setModalTab('diff')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  modalTab === 'diff'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Structured Changes ({structuredDiff.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('raw')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  modalTab === 'raw'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Raw JSON Payload
              </button>
            </div>

            {/* Tab 1: Structured Diff Table */}
            {modalTab === 'diff' && (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {structuredDiff.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">
                    No state mutation payload recorded for this event.
                  </p>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-slate-700 w-1/3">Field</th>
                          <th className="px-3 py-2 font-semibold text-rose-700 w-1/3">Before</th>
                          <th className="px-3 py-2 font-semibold text-emerald-700 w-1/3">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {structuredDiff.map((row) => (
                          <tr
                            key={row.key}
                            className={row.isChanged ? 'bg-amber-50/40' : 'bg-white'}
                          >
                            <td className="px-3 py-2 font-sans font-medium text-slate-800">
                              {row.key}
                            </td>
                            <td className="px-3 py-2 text-rose-700 bg-rose-50/30 break-all">
                              {row.oldVal}
                            </td>
                            <td className="px-3 py-2 text-emerald-700 bg-emerald-50/30 break-all">
                              {row.newVal}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Raw JSON Payloads */}
            {modalTab === 'raw' && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {selectedLog.oldValues && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Previous Values (Pre-mutation)</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            JSON.stringify(selectedLog.oldValues, null, 2),
                            'raw-old'
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        {copiedField === 'raw-old' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'raw-old' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="rounded-lg bg-slate-900 p-3 text-[11px] font-mono text-slate-100 overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValues && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Mutated Values (Post-mutation)</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            JSON.stringify(selectedLog.newValues, null, 2),
                            'raw-new'
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        {copiedField === 'raw-new' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'raw-new' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="rounded-lg bg-slate-900 p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}

                {!selectedLog.oldValues && !selectedLog.newValues && (
                  <p className="text-xs text-slate-500 italic text-center py-6">
                    No payload metadata recorded for this event.
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Timestamp: {new Date(selectedLog.timestamp).toISOString()}
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
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
