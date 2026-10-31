import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  Briefcase,
  ShieldCheck,
  History,
  CheckCircle2,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  User,
} from 'lucide-react';
import { getServerAuthContext } from '@/lib/auth/session';
import { listUsers } from '@/services/userService';
import { getAuditLogs } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect('/login');
  }

  const { user: currentUser, role } = authContext;
  const roleSlug = role?.slug || '';
  const userPermissions = (role?.permissions || []) as any[];

  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = roleSlug === 'admin';
  const isSubRole = !isSuperAdmin && !isAdmin;

  let adminCount = 0;
  let staffCount = 0;
  let auditCount = 0;

  try {
    if (isSuperAdmin) {
      const [adminsData, staffData, auditData] = await Promise.all([
        listUsers({ userType: 'admin', limit: 1 }),
        listUsers({ userType: 'staff', limit: 1 }),
        getAuditLogs({ limit: 1, excludeSuperAdmin: false }),
      ]);
      adminCount = adminsData.pagination.total;
      staffCount = staffData.pagination.total;
      auditCount = auditData.pagination.total;
    } else if (isAdmin) {
      const [staffData, auditData] = await Promise.all([
        listUsers({ userType: 'staff', limit: 1, parentAdminId: currentUser._id }),
        getAuditLogs({
          limit: 1,
          parentAdminId: currentUser._id?.toString(),
          excludeSuperAdmin: true,
        }),
      ]);
      staffCount = staffData.pagination.total;
      auditCount = auditData.pagination.total;
    } else {
      const auditData = await getAuditLogs({
        limit: 1,
        userId: currentUser._id?.toString(),
        excludeSuperAdmin: true,
      });
      auditCount = auditData.pagination.total;
    }
  } catch (err) {
    console.error('Failed to load dashboard metrics on server:', err);
  }

  const grantedModulesCount = isSuperAdmin ? 28 : userPermissions.length;

  return (
    <div className="space-y-8">
      {/* Role-Aware Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {isSuperAdmin
                ? 'Super Admin Executive Portal'
                : isAdmin
                ? 'Admin Management Portal'
                : `${currentUser?.role?.name || 'Staff Member'} Workspace`}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {currentUser?.name || 'User'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSuperAdmin
              ? 'Complete executive view: Oversee all Admins, delegated sub-roles, permission matrices, and organization-wide audit logs.'
              : isAdmin
              ? 'Admin control center: Manage your delegated sub-roles, team members, staff permissions, and activity logs.'
              : 'Welcome to your staff workspace. Below are your assigned role details and granted CRM permissions.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-semibold">Assigned Role</div>
            <div className="text-sm font-bold text-slate-900 capitalize">
              {currentUser?.role?.name || roleSlug?.replace(/_/g, ' ') || 'Staff'}
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>

      {/* VIEW A: Super Admin and Admin Dashboard Metrics & Management Cards */}
      {(isSuperAdmin || isAdmin) && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric 1 */}
            {isSuperAdmin ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Managed Admins
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{adminCount}</span>
                  <span className="text-xs text-slate-500">Admin Accounts</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assigned Sub-Roles
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {currentUser?.allowedSubRoles?.length || 0}
                  </span>
                  <span className="text-xs text-slate-500">Categories Authorized</span>
                </div>
              </div>
            )}

            {/* Metric 2: Staff Directory */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isSuperAdmin ? 'Total Staff' : 'My Staff Directory'}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{staffCount}</span>
                <span className="text-xs text-slate-500">Sub-Role Staff</span>
              </div>
            </div>

            {/* Metric 3: CRM Modules */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  CRM Modules
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {grantedModulesCount}
                </span>
                <span className="text-xs text-slate-500">
                  {isSuperAdmin ? 'Full System Modules' : 'Granted by Super Admin'}
                </span>
              </div>
            </div>

            {/* Metric 4: Audit Records */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Audit Events
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <History className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{auditCount}</span>
                <span className="text-xs text-slate-500">
                  {isSuperAdmin ? 'All System Logs' : 'Admin & Staff Logs'}
                </span>
              </div>
            </div>
          </div>

          {/* Management Modules (1 Row of Cards) */}
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Management Modules</h2>
            <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {/* Users: Admins (Only visible to Super Admin) */}
              {isSuperAdmin && (
                <Link
                  href="/users"
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">Admin Management</h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-3">
                      Create and manage Admin accounts, and delegate permitted sub-roles (Property Manager, Sales Executive, Sales Manager, Website Manager).
                    </p>
                  </div>
                </Link>
              )}

              {/* Staff Management */}
              <Link
                href="/staff"
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Staff Management</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-3">
                    {isSuperAdmin
                      ? 'Provision and manage staff members under selected Admin and permitted sub-roles.'
                      : 'Provision and manage staff members under your authorized sub-roles.'}
                  </p>
                </div>
              </Link>

              {/* Roles & Permissions Matrix */}
              <Link
                href="/roles"
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-purple-600 transition" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Roles & Permissions</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-3">
                    {isSuperAdmin
                      ? 'Configure module access and 8-Action privilege matrices for each Admin.'
                      : 'Customize module access for sub-role staff members within your authority.'}
                  </p>
                </div>
              </Link>

              {/* Audit Logs */}
              <Link
                href="/audit-logs"
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <History className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Audit Trail</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-3">
                    {isSuperAdmin
                      ? 'Inspect organization-wide audit events with Admin and sub-role drill-down.'
                      : 'Inspect your own actions and activity logs of staff in your directory.'}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* VIEW B: Sub-Role User Dashboard (Clean Welcome Workspace) */}
      {isSubRole && (
        <div className="space-y-6">
          {/* Sub-Role Welcome Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Your Staff Profile & Account Information</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 uppercase font-semibold">Full Name</span>
                <p className="mt-1 font-semibold text-slate-900">{currentUser?.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 uppercase font-semibold">Email (Login)</span>
                <p className="mt-1 font-semibold text-slate-900">{currentUser?.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 uppercase font-semibold">Mobile</span>
                <p className="mt-1 font-semibold text-slate-900">{currentUser?.mobile || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 uppercase font-semibold">Department</span>
                <p className="mt-1 font-semibold text-slate-900">{currentUser?.department || 'Operations'}</p>
              </div>
            </div>
          </div>

          {/* Sub-Role Granted Permissions Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>Your Granted CRM Modules & Action Privileges</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permissions delegated to you by your Administrator.
                </p>
              </div>
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                {userPermissions.length} Modules Active
              </span>
            </div>

            {userPermissions.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active CRM permissions have been granted yet. Please contact your Admin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {userPermissions.map((p: any) => (
                  <div
                    key={p.module}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition"
                  >
                    <div className="text-sm font-semibold text-slate-900 capitalize">
                      {p.module?.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.actions?.map((act: string) => (
                        <span
                          key={act}
                          className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structural Hierarchy Guarantee Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Enterprise Delegation Hierarchy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Super Admin</p>
              <p className="text-xs text-slate-500 mt-1">
                Highest authority. Manages all Admin accounts and defines their module and sub-role boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Admin</p>
              <p className="text-xs text-slate-500 mt-1">
                Manages their delegated sub-role staff (Property Manager, Sales Executive, Sales Manager, Website Manager).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Sub-Role Staff</p>
              <p className="text-xs text-slate-500 mt-1">
                Operates within their granted modules and customized 8-Action privilege matrices with full audit compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}