'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
  Check,
  X,
  Info,
  CheckCircle2,
  Save,
  Users,
  ChevronRight,
  Layers,
  Filter,
  Search,
  RotateCcw,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import {
  CRMModule,
  PermissionAction,
  PERMISSION_ACTIONS,
  CRM_MODULES,
  SafeUser,
  IRole,
} from '@/types';
import { Alert } from '@/components/ui/Alert';
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface RolesClientProps {
  initialAdmins?: SafeUser[];
  initialSelectedAdminId?: string;
  initialSubRoleCategories?: { slug: string; name: string }[];
  initialSelectedSubRoleCategory?: string;
  initialStaffUsers?: SafeUser[];
  initialSelectedStaffUserId?: string;
  initialTargetUser?: any;
  initialUserPermissions?: Array<{ module: CRMModule; actions: PermissionAction[] }>;
  initialAdminCeiling?: Array<{ module: CRMModule; actions: PermissionAction[] }> | null;
  currentUserRoleSlug: string;
}

const MODULE_GROUPS: Record<string, CRMModule[]> = {
  core: ['dashboard', 'leads', 'enquiries', 'clients', 'owners', 'communications', 'notifications'],
  properties: [
    'properties',
    'residential_properties',
    'commercial_properties',
    'plots_land',
    'rental_leasing',
    'pre_leased_investment',
    'projects',
  ],
  sales: [
    'sales_pipeline',
    'rental_leasing_pipeline',
    'investment_pipeline',
    'bookings_transactions',
    'site_visits',
    'follow_ups',
    'tasks',
  ],
  operations: ['documents', 'campaigns_lead_sources', 'reports', 'website_cms', 'media_library'],
  system: [
    'staff_users',
    'integrations',
    'import_export',
    'audit_logs',
    'master_settings',
    'system_settings',
  ],
};

const MODULE_GROUP_LABELS: Record<string, string> = {
  all: 'All Modules',
  core: 'Core CRM',
  properties: 'Properties & Units',
  sales: 'Sales & Pipelines',
  operations: 'Operations & Content',
  system: 'System & Admin',
};

export function RolesClient({
  initialAdmins = [],
  initialSelectedAdminId = '',
  initialSubRoleCategories = [],
  initialSelectedSubRoleCategory = '',
  initialStaffUsers = [],
  initialSelectedStaffUserId = '',
  initialTargetUser = null,
  initialUserPermissions = [],
  initialAdminCeiling = null,
  currentUserRoleSlug = 'super_admin',
}: RolesClientProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Super Admin view state
  const [admins] = useState<SafeUser[]>(initialAdmins);
  const [selectedAdminId, setSelectedAdminId] = useState<string>(initialSelectedAdminId);

  // Admin view state
  const [subRoleCategories] = useState<{ slug: string; name: string }[]>(initialSubRoleCategories);
  const [selectedSubRoleCategory, setSelectedSubRoleCategory] = useState<string>(initialSelectedSubRoleCategory);
  const [staffUsers, setStaffUsers] = useState<SafeUser[]>(initialStaffUsers);
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>(initialSelectedStaffUserId);

  // Target User Permissions State
  const [targetUser, setTargetUser] = useState<any>(initialTargetUser);
  const [savedPermissions, setSavedPermissions] = useState<
    Array<{ module: CRMModule; actions: PermissionAction[] }>
  >(initialUserPermissions);
  const [userPermissions, setUserPermissions] = useState<
    Array<{ module: CRMModule; actions: PermissionAction[] }>
  >(initialUserPermissions);
  const [adminCeiling, setAdminCeiling] = useState<
    Array<{ module: CRMModule; actions: PermissionAction[] }> | null
  >(initialAdminCeiling);

  // Accidental Edit Protection State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');

  // For Admin: When selectedSubRoleCategory changes, load staff in that category
  useEffect(() => {
    if (currentUserRoleSlug === 'admin' && selectedSubRoleCategory) {
      const fetchStaffInCategory = async () => {
        try {
          const res = await fetch(`/api/staff?limit=100`);
          const data = await res.json();
          if (res.ok && data.success) {
            const filtered = (data.data || []).filter(
              (u: SafeUser) => (u.role as any)?.slug === selectedSubRoleCategory
            );
            setStaffUsers(filtered);
            if (filtered.length > 0) {
              setSelectedStaffUserId(filtered[0]._id);
            } else {
              setSelectedStaffUserId('');
              setTargetUser(null);
              setUserPermissions([]);
              setSavedPermissions([]);
            }
          }
        } catch (err) {
          console.error('Failed to fetch staff in category:', err);
        }
      };
      fetchStaffInCategory();
    }
  }, [currentUserRoleSlug, selectedSubRoleCategory]);

  // Load Permissions Matrix for active target user
  const activeUserIdToLoad = useMemo(() => {
    if (currentUserRoleSlug === 'super_admin') {
      return selectedAdminId;
    } else if (currentUserRoleSlug === 'admin') {
      return selectedStaffUserId;
    }
    return '';
  }, [currentUserRoleSlug, selectedAdminId, selectedStaffUserId]);

  const fetchTargetUserPermissions = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/permissions/user/${userId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTargetUser(data.data);
        const perms = data.data.permissions || [];
        setUserPermissions(perms);
        setSavedPermissions(perms);
        setAdminCeiling(data.data.ceilingPermissions || null);
        setIsEditMode(false);
      } else {
        throw new Error(data.error || 'Failed to load permissions');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching target permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  const prevLoadedUserIdRef = useRef(initialSelectedAdminId || initialSelectedStaffUserId);

  useEffect(() => {
    if (!activeUserIdToLoad) return;
    if (prevLoadedUserIdRef.current === activeUserIdToLoad) {
      return;
    }
    prevLoadedUserIdRef.current = activeUserIdToLoad;
    fetchTargetUserPermissions(activeUserIdToLoad);
  }, [activeUserIdToLoad, fetchTargetUserPermissions]);

  // Compute Diff between saved and pending permissions
  const permissionDiff = useMemo(() => {
    const added: Array<{ module: CRMModule; actions: PermissionAction[] }> = [];
    const removed: Array<{ module: CRMModule; actions: PermissionAction[] }> = [];
    let totalCount = 0;

    const allModules = Array.from(
      new Set([
        ...userPermissions.map((p) => p.module),
        ...savedPermissions.map((p) => p.module),
      ])
    ) as CRMModule[];

    for (const mod of allModules) {
      const currentMod = userPermissions.find((p) => p.module === mod);
      const savedMod = savedPermissions.find((p) => p.module === mod);

      const currentActions = currentMod?.actions || [];
      const savedActions = savedMod?.actions || [];

      const addedActions = currentActions.filter((a) => !savedActions.includes(a));
      const removedActions = savedActions.filter((a) => !currentActions.includes(a));

      if (addedActions.length > 0) {
        added.push({ module: mod, actions: addedActions });
        totalCount += addedActions.length;
      }
      if (removedActions.length > 0) {
        removed.push({ module: mod, actions: removedActions });
        totalCount += removedActions.length;
      }
    }

    return { added, removed, totalCount };
  }, [userPermissions, savedPermissions]);

  const hasUnsavedChanges = permissionDiff.totalCount > 0;

  // Safeguard when switching user with unsaved changes
  const handleSelectAdmin = (adminId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved permission changes. Discard them and switch user?')) {
        return;
      }
    }
    setSelectedAdminId(adminId);
    setIsEditMode(false);
  };

  const handleSelectStaff = (staffId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved permission changes. Discard them and switch user?')) {
        return;
      }
    }
    setSelectedStaffUserId(staffId);
    setIsEditMode(false);
  };

  // Determine which modules are available for assignment
  const visibleModules = useMemo(() => {
    let mods = currentUserRoleSlug === 'super_admin'
      ? CRM_MODULES
      : adminCeiling
      ? adminCeiling.map((p) => p.module)
      : [];

    if (activeGroup !== 'all' && MODULE_GROUPS[activeGroup]) {
      const groupMods = MODULE_GROUPS[activeGroup];
      mods = mods.filter((m) => groupMods.includes(m));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      mods = mods.filter((m) => m.toLowerCase().replace(/_/g, ' ').includes(q));
    }

    return mods;
  }, [currentUserRoleSlug, adminCeiling, activeGroup, searchQuery]);

  // Check if an action is assignable by the current user
  const isActionAllowedByCeiling = (module: CRMModule, action: PermissionAction): boolean => {
    if (currentUserRoleSlug === 'super_admin') {
      return true;
    }
    if (!adminCeiling) return false;
    const ceilingForMod = adminCeiling.find((p) => p.module === module);
    return ceilingForMod ? ceilingForMod.actions.includes(action) : false;
  };

  const handleTogglePermission = (module: CRMModule, action: PermissionAction) => {
    if (!isEditMode) return;
    if (!isActionAllowedByCeiling(module, action)) return;

    setUserPermissions((prev) => {
      const existing = prev.find((p) => p.module === module);
      if (!existing) {
        return [...prev, { module, actions: [action] }];
      }

      const actions = existing.actions.includes(action)
        ? existing.actions.filter((a) => a !== action)
        : [...existing.actions, action];

      return prev.map((p) => (p.module === module ? { ...p, actions } : p));
    });
  };

  const handleToggleAllForModule = (module: CRMModule) => {
    if (!isEditMode) return;
    const existing = userPermissions.find((p) => p.module === module);
    const availableActions = PERMISSION_ACTIONS.filter((act) => isActionAllowedByCeiling(module, act));

    const allSelected = existing && availableActions.every((a) => existing.actions.includes(a));

    setUserPermissions((prev) => {
      if (allSelected) {
        return prev.filter((p) => p.module !== module);
      } else {
        const withoutCurrent = prev.filter((p) => p.module !== module);
        return [...withoutCurrent, { module, actions: availableActions }];
      }
    });
  };

  const handleDiscardChanges = () => {
    setUserPermissions(savedPermissions);
    setIsEditMode(false);
  };

  const handleConfirmSave = async () => {
    if (!activeUserIdToLoad) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/permissions/user/${activeUserIdToLoad}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: userPermissions }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update permissions');
      }

      setSavedPermissions(userPermissions);
      setIsEditMode(false);
      setIsConfirmModalOpen(false);
      setSuccessMsg(`Permissions successfully updated for ${targetUser?.name}!`);
    } catch (err: any) {
      setError(err.message || 'Error updating permissions matrix');
      setIsConfirmModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Notifications */}
      {successMsg && (
        <Alert
          type="success"
          title="Permissions Updated"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}
      {error && (
        <Alert
          type="error"
          title="Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Target Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {currentUserRoleSlug === 'super_admin'
                  ? 'Admin Permission Matrix'
                  : 'Staff Role & Permission Matrix'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure module-level access and action authorities.
              </p>
            </div>
          </div>

          {/* Edit Mode Toggle / Protection Switch */}
          {targetUser && (
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                  <span>Unlock to Edit</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{hasUnsavedChanges ? 'Discard' : 'Lock Mode'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(true)}
                    disabled={!hasUnsavedChanges || saving}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Review & Save ({permissionDiff.totalCount})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Selection Controls */}
        <div className="pt-4">
          {currentUserRoleSlug === 'super_admin' ? (
            <div className="w-full sm:w-96">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Target Administrator
              </label>
              <SearchableSelect
                options={admins.map((admin) => ({
                  value: admin._id,
                  label: admin.name,
                  subLabel: admin.email,
                }))}
                value={selectedAdminId}
                onChange={handleSelectAdmin}
                placeholder="Search and select an Admin..."
                searchPlaceholder="Search by admin name or email..."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Sub-Role Category
                </label>
                <select
                  value={selectedSubRoleCategory}
                  onChange={(e) => {
                    if (hasUnsavedChanges) {
                      if (!confirm('You have unsaved changes. Discard them and switch category?')) {
                        return;
                      }
                    }
                    setSelectedSubRoleCategory(e.target.value);
                    setIsEditMode(false);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {subRoleCategories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Staff Member
                </label>
                <SearchableSelect
                  options={staffUsers.map((u) => ({
                    value: u._id,
                    label: u.name,
                    subLabel: u.email,
                  }))}
                  value={selectedStaffUserId}
                  onChange={handleSelectStaff}
                  disabled={staffUsers.length === 0}
                  placeholder={
                    staffUsers.length === 0
                      ? 'No staff in this category'
                      : 'Search and select staff member...'
                  }
                  searchPlaceholder="Search by staff name or email..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Selected Target Profile Strip */}
        {targetUser && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shadow-xs">
                {targetUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>{targetUser.name}</span>
                  <span className="text-xs text-slate-500 font-normal">({targetUser.email})</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {targetUser.role?.name || targetUser.role?.slug}
                  </span>
                  <span>•</span>
                  <span>
                    Granted modules: <strong>{userPermissions.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Mode & Protection Badge */}
            <div className="flex items-center gap-2 text-xs">
              {!isEditMode ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-700 font-medium border border-slate-200">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Protected View Mode (Accidental Clicks Disabled)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700 font-medium border border-blue-200">
                  <Unlock className="w-3 h-3 text-blue-600" />
                  Editing Mode Active (Click actions to toggle)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(MODULE_GROUP_LABELS).map(([key, label]) => {
              const active = activeGroup === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveGroup(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search module name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Module Action Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <LoadingOverlay message="Loading user permission matrix..." />
          </div>
        ) : !activeUserIdToLoad ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Please select a user above to view and configure their permissions.
          </div>
        ) : visibleModules.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No CRM modules match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead scope="col" className="px-6 py-3.5 text-xs font-semibold text-slate-700 w-1/4">
                    CRM Module ({visibleModules.length})
                  </TableHead>
                  {PERMISSION_ACTIONS.map((action) => (
                    <TableHead
                      key={action}
                      scope="col"
                      className="px-2.5 py-3.5 text-xs font-semibold text-slate-700 text-center capitalize"
                    >
                      {action}
                    </TableHead>
                  ))}
                  <TableHead scope="col" className="px-4 py-3.5 text-xs font-semibold text-slate-700 text-right">
                    Toggle All
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleModules.map((module) => {
                  const currentModConfig = userPermissions.find((p) => p.module === module);
                  const savedModConfig = savedPermissions.find((p) => p.module === module);

                  const availableActions = PERMISSION_ACTIONS.filter((act) =>
                    isActionAllowedByCeiling(module, act)
                  );
                  const isAllChecked =
                    currentModConfig &&
                    availableActions.length > 0 &&
                    availableActions.every((a) => currentModConfig.actions.includes(a));

                  return (
                    <TableRow key={module} className="hover:bg-slate-50/75 transition border-b border-slate-100">
                      <TableCell className="px-6 py-3.5 font-medium text-slate-900 text-sm">
                        <div className="capitalize">{module.replace(/_/g, ' ')}</div>
                      </TableCell>

                      {PERMISSION_ACTIONS.map((action) => {
                        const isGranted = currentModConfig?.actions.includes(action) || false;
                        const wasSaved = savedModConfig?.actions.includes(action) || false;
                        const isAdded = isGranted && !wasSaved;
                        const isRemoved = !isGranted && wasSaved;
                        const allowed = isActionAllowedByCeiling(module, action);

                        if (!allowed) {
                          return (
                            <TableCell key={action} className="px-2.5 py-3 text-center">
                              <span className="text-slate-300 text-xs font-medium select-none" title="Restricted by ceiling">
                                —
                              </span>
                            </TableCell>
                          );
                        }

                        // View Mode (Locked)
                        if (!isEditMode) {
                          return (
                            <TableCell key={action} className="px-2.5 py-3 text-center">
                              {isGranted ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs select-none">—</span>
                              )}
                            </TableCell>
                          );
                        }

                        // Edit Mode (Interactive)
                        return (
                          <TableCell key={action} className="px-2.5 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(module, action)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition border ${
                                isAdded
                                  ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-300'
                                  : isRemoved
                                  ? 'bg-rose-50 border-rose-300 text-rose-600 border-dashed'
                                  : isGranted
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-slate-300 hover:border-slate-400 text-transparent'
                              }`}
                              title={
                                isAdded
                                  ? 'Newly added (unsaved)'
                                  : isRemoved
                                  ? 'Newly revoked (unsaved)'
                                  : isGranted
                                  ? 'Granted (click to revoke)'
                                  : 'Not granted (click to grant)'
                              }
                            >
                              {isRemoved ? (
                                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : isGranted ? (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : null}
                            </button>
                          </TableCell>
                        );
                      })}

                      <TableCell className="px-4 py-3 text-right">
                        {isEditMode ? (
                          <button
                            type="button"
                            onClick={() => handleToggleAllForModule(module)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                          >
                            {isAllChecked ? 'Deselect All' : 'Select All'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 select-none">Locked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar for Unsaved Changes */}
      {isEditMode && hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-6 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>{permissionDiff.totalCount}</strong> pending changes for {targetUser?.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Review & Save</span>
            </button>
          </div>
        </div>
      )}

      {/* Review & Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Permission Changes"
        description={`Review all privilege updates before applying them to ${targetUser?.name}.`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Target User Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs">
              {targetUser?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{targetUser?.name}</div>
              <div className="text-xs text-slate-500">
                {targetUser?.email} • {targetUser?.role?.name || targetUser?.role?.slug}
              </div>
            </div>
          </div>

          {/* Diff Summary */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {permissionDiff.added.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Granted Permissions ({permissionDiff.added.reduce((acc, c) => acc + c.actions.length, 0)})</span>
                </div>
                <div className="space-y-1">
                  {permissionDiff.added.map((item) => (
                    <div
                      key={item.module}
                      className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 capitalize">
                        {item.module.replace(/_/g, ' ')}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.actions.map((act) => (
                          <span
                            key={act}
                            className="rounded bg-emerald-600 text-white px-2 py-0.5 text-xs font-medium"
                          >
                            +{act}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permissionDiff.removed.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-rose-800 mb-1 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Revoked Permissions ({permissionDiff.removed.reduce((acc, c) => acc + c.actions.length, 0)})</span>
                </div>
                <div className="space-y-1">
                  {permissionDiff.removed.map((item) => (
                    <div
                      key={item.module}
                      className="rounded-md border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 capitalize">
                        {item.module.replace(/_/g, ' ')}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.actions.map((act) => (
                          <span
                            key={act}
                            className="rounded bg-rose-600 text-white px-2 py-0.5 text-xs font-medium"
                          >
                            -{act}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permissionDiff.totalCount === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                No permission changes detected.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={() => setIsConfirmModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Back to Editing
            </button>
            <button
              type="button"
              disabled={saving || !hasUnsavedChanges}
              onClick={handleConfirmSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? <Spinner size="sm" className="text-white" /> : <Save className="w-4 h-4" />}
              <span>Confirm & Apply Changes</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
