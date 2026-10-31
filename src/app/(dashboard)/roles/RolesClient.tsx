'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Shield,
  Lock,
  Check,
  X,
  Info,
  CheckCircle2,
  Save,
  Users,
  ChevronRight,
  Layers,
  Filter,
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
import { useAuth } from '@/components/providers/AuthProvider';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
  const [currentUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Super Admin view state
  const [admins, setAdmins] = useState<SafeUser[]>(initialAdmins);
  const [selectedAdminId, setSelectedAdminId] = useState<string>(initialSelectedAdminId);

  // Admin view state
  const [subRoleCategories, setSubRoleCategories] = useState<{ slug: string; name: string }[]>(initialSubRoleCategories);
  const [selectedSubRoleCategory, setSelectedSubRoleCategory] = useState<string>(initialSelectedSubRoleCategory);
  const [staffUsers, setStaffUsers] = useState<SafeUser[]>(initialStaffUsers);
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string>(initialSelectedStaffUserId);

  // Target User Permissions State
  const [targetUser, setTargetUser] = useState<any>(initialTargetUser);
  const [userPermissions, setUserPermissions] = useState<
    Array<{ module: CRMModule; actions: PermissionAction[] }>
  >(initialUserPermissions);
  const [adminCeiling, setAdminCeiling] = useState<
    Array<{ module: CRMModule; actions: PermissionAction[] }> | null
  >(initialAdminCeiling);

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
        setUserPermissions(data.data.permissions || []);
        setAdminCeiling(data.data.ceilingPermissions || null);
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

  // Determine which modules are available for assignment
  const visibleModules = useMemo(() => {
    if (currentUserRoleSlug === 'super_admin') {
      return CRM_MODULES;
    }
    // Admin only sees modules present in adminCeiling
    if (adminCeiling) {
      return adminCeiling.map((p) => p.module);
    }
    return [];
  }, [currentUserRoleSlug, adminCeiling]);

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

  const handleSavePermissions = async () => {
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

      setSuccessMsg(`Permissions matrix successfully updated for ${targetUser?.name}!`);
    } catch (err: any) {
      setError(err.message || 'Error updating permissions matrix');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Roles & Permission Matrix
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentUserRoleSlug === 'super_admin'
              ? 'Select an Admin user to grant/revoke allowed sub-roles and 8-Action privilege matrices.'
              : 'Configure personalized module permissions for staff users within your authorized sub-roles.'}
          </p>
        </div>

        {activeUserIdToLoad && (
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? <Spinner size="sm" className="text-white" /> : <Save className="w-4 h-4" />}
            <span>Save Permission Matrix</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <Alert
          type="success"
          title="Updated Successfully"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}
      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Controls & User Selection Area */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        {currentUserRoleSlug === 'super_admin' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Admin User To Configure *
            </label>
            <div className="w-full sm:w-96">
              <SearchableSelect
                options={admins.map((admin) => ({
                  value: admin._id,
                  label: admin.name,
                  subLabel: admin.email,
                }))}
                value={selectedAdminId}
                onChange={(val) => setSelectedAdminId(val)}
                placeholder="Search and select an Admin..."
                searchPlaceholder="Search by admin name or email..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Sub-Role Category
              </label>
              <select
                value={selectedSubRoleCategory}
                onChange={(e) => setSelectedSubRoleCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {subRoleCategories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                2. Select Staff Member
              </label>
              <SearchableSelect
                options={staffUsers.map((u) => ({
                  value: u._id,
                  label: u.name,
                  subLabel: u.email,
                }))}
                value={selectedStaffUserId}
                onChange={(val) => setSelectedStaffUserId(val)}
                disabled={staffUsers.length === 0}
                placeholder={staffUsers.length === 0 ? "No staff in this category" : "Search and select staff member..."}
                searchPlaceholder="Search by staff name or email..."
              />
            </div>
          </div>
        )}

        {/* Selected User Details Banner */}
        {targetUser && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {targetUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {targetUser.name}{' '}
                  <span className="text-xs font-normal text-slate-500">({targetUser.email})</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Role: {targetUser.role?.name || targetUser.role?.slug}
                  </span>
                  <span>•</span>
                  <span>
                    Active Granted Modules: <strong>{userPermissions.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              {currentUserRoleSlug === 'super_admin' ? (
                <span className="text-blue-600 font-medium">
                  Full Authority: You can grant any of the 10+ CRM Modules
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  Privilege Ceiling: Restricted to your assigned modules ({visibleModules.length})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Module Action Matrix (8 Required Actions) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Module Action Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Check actions to grant permissions across CRM modules.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <LoadingOverlay message="Loading user permission matrix..." />
          </div>
        ) : !activeUserIdToLoad ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Please select a user above to configure their permissions.
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="px-6 py-3.5 font-semibold w-1/4">
                    CRM Module
                  </TableHead>
                  {PERMISSION_ACTIONS.map((action) => (
                    <TableHead key={action} scope="col" className="px-3 py-3.5 font-semibold text-center">
                      {action}
                    </TableHead>
                  ))}
                  <TableHead scope="col" className="px-4 py-3.5 font-semibold text-right">
                    Toggle All
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleModules.map((module) => {
                  const modConfig = userPermissions.find((p) => p.module === module);
                  const isAllChecked =
                    modConfig &&
                    PERMISSION_ACTIONS.filter((act) => isActionAllowedByCeiling(module, act)).every((a) =>
                      modConfig.actions.includes(a)
                    );

                  return (
                    <TableRow key={module} className="hover:bg-slate-50/75 transition">
                      <TableCell className="px-6 py-3.5 font-medium text-slate-800">
                        <div className="capitalize">{module.replace(/_/g, ' ')}</div>
                      </TableCell>

                      {PERMISSION_ACTIONS.map((action) => {
                        const isGranted = modConfig?.actions.includes(action) || false;
                        const allowed = isActionAllowedByCeiling(module, action);

                        return (
                          <TableCell key={action} className="px-3 py-3.5 text-center">
                            {allowed ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(module, action)}
                                className={`w-6 h-6 rounded flex items-center justify-center transition border ${
                                  isGranted
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 hover:border-blue-400 bg-white'
                                }`}
                              >
                                {isGranted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            ) : (
                              <span className="text-slate-200 text-xs">—</span>
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleAllForModule(module)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                        >
                          {isAllChecked ? 'Deselect All' : 'Select All'}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
