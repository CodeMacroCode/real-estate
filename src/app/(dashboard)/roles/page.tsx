'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Edit3,
  Check,
  X,
  Info,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { IRole, CRMModule, PermissionAction, PERMISSION_ACTIONS, CRM_MODULES } from '@/types';
import { RoleBadge, Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner, LoadingOverlay } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';

export default function RolesPage() {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Role Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<IRole['permissions']>([]);
  const [editingScope, setEditingScope] = useState<'assigned' | 'team' | 'company'>('assigned');
  const [editingDescription, setEditingDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (res.ok && data.success) {
        const rolesList = data.data || [];
        setRoles(rolesList);
        setSelectedRole((prev) => {
          if (!prev) return rolesList[0] || null;
          return rolesList.find((r: IRole) => r._id === prev._id) || rolesList[0] || null;
        });
      } else {
        throw new Error(data.error || 'Failed to fetch roles');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleOpenEdit = (role: IRole) => {
    setEditingPermissions(JSON.parse(JSON.stringify(role.permissions || [])));
    setEditingScope(role.leadVisibilityScope);
    setEditingDescription(role.description);
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleTogglePermission = (module: CRMModule, action: PermissionAction) => {
    if (selectedRole?.slug === 'super_admin') {
      return; // Protected
    }

    setEditingPermissions((prev) => {
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

  const handleSaveRole = async () => {
    if (!selectedRole?._id) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/roles/${selectedRole._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editingDescription,
          leadVisibilityScope: editingScope,
          permissions: editingPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update role');
      }

      setSuccessMsg(`Role '${selectedRole.name}' permissions updated successfully.`);
      setIsEditModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Error saving role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Roles & Permissions Matrix
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Section 49 Specification: 7 baseline roles, 8 permission actions (View, Create, Edit, Delete, Export, Assign, Publish, Approve), and lead visibility scopes.
        </p>
      </div>

      {successMsg && (
        <Alert
          type="success"
          title="Updated"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {error && !isEditModalOpen && (
        <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />
      )}

      {loading ? (
        <LoadingOverlay message="Loading access control policies..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Roles List Sidebar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-3">
              Baseline System Roles ({roles.length})
            </h3>
            <div className="space-y-1">
              {roles.map((role) => (
                <button
                  key={role._id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selectedRole?._id === role._id
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{role.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">{role.slug}</span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 ${
                      selectedRole?._id === role._id ? 'text-blue-600' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Selected Role Detail & Matrix */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3 space-y-6">
            {selectedRole && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{selectedRole.name}</h2>
                      <RoleBadge roleSlug={selectedRole.slug} roleName={selectedRole.name} />
                      {selectedRole.isSystem && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" />
                          System Role
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{selectedRole.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        Lead Visibility Scope:{' '}
                        <strong className="capitalize text-slate-800">
                          {selectedRole.leadVisibilityScope}
                        </strong>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Active Module Permissions:{' '}
                        <strong className="text-slate-800">
                          {selectedRole.permissions?.length || 0}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => handleOpenEdit(selectedRole)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Configure Permissions</span>
                    </button>
                  </div>
                </div>

                {/* Permissions Matrix */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Module Action Matrix (8 Required Actions)
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">CRM Module</th>
                          {PERMISSION_ACTIONS.map((action) => (
                            <th key={action} className="px-2 py-3 text-center capitalize">
                              {action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {CRM_MODULES.map((module) => {
                          const config = selectedRole.permissions?.find((p) => p.module === module);
                          return (
                            <tr key={module} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-900 capitalize">
                                {module.replace(/_/g, ' ')}
                              </td>
                              {PERMISSION_ACTIONS.map((action) => {
                                const isAllowed =
                                  selectedRole.slug === 'super_admin' ||
                                  Boolean(config?.actions?.includes(action));
                                return (
                                  <td key={action} className="px-2 py-2.5 text-center">
                                    {isAllowed ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                        <Check className="w-3 h-3" />
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-300">
                                        &bull;
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Configure Role: ${selectedRole?.name}`}
        description="Update lead visibility scope and action grants."
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {error && isEditModalOpen && (
            <Alert type="error" title="Failed to Update" message={error} onClose={() => setError(null)} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Role Description
            </label>
            <textarea
              rows={2}
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Default Lead Visibility Scope (Section 50)
            </label>
            <select
              value={editingScope}
              disabled={selectedRole?.slug === 'super_admin'}
              onChange={(e) => setEditingScope(e.target.value as any)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="assigned">Only Assigned Leads</option>
              <option value="team">Team Leads</option>
              <option value="company">All Company Leads</option>
            </select>
            {selectedRole?.slug === 'super_admin' && (
              <p className="mt-1 text-xs text-slate-400">Super Admin scope is locked to Company-wide.</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-2">
              Action Permissions Toggle Matrix
            </h4>
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Module</th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th key={action} className="px-2 py-2 text-center capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRM_MODULES.map((module) => {
                    const cfg = editingPermissions.find((p) => p.module === module);
                    return (
                      <tr key={module} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium capitalize">
                          {module.replace(/_/g, ' ')}
                        </td>
                        {PERMISSION_ACTIONS.map((action) => {
                          const checked =
                            selectedRole?.slug === 'super_admin' ||
                            Boolean(cfg?.actions?.includes(action));
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={selectedRole?.slug === 'super_admin'}
                                onChange={() => handleTogglePermission(module, action)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveRole}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Spinner size="sm" className="text-white" />}
              <span>Save Permissions</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
