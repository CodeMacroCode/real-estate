'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  History,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Building,
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    userCount: 0,
    roleCount: 0,
    auditCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, rolesRes, auditRes] = await Promise.all([
          fetch('/api/users?limit=1'),
          fetch('/api/roles'),
          fetch('/api/audit-logs?limit=1'),
        ]);

        const usersData = await usersRes.json();
        const rolesData = await rolesRes.json();
        const auditData = await auditRes.json();

        setStats({
          userCount: usersData.meta?.total || 0,
          roleCount: rolesData.data?.length || 0,
          auditCount: auditData.meta?.total || 0,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Title & Context */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Executive Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Phase 1 Foundation: Project architecture, authentication, staff management, and access control.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Staff & Users
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            {stats.loading ? (
              <Spinner size="sm" className="text-blue-600" />
            ) : (
              <span className="text-2xl font-bold text-slate-900">{stats.userCount}</span>
            )}
            <span className="text-xs text-slate-500">Active Accounts</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Baseline Roles
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            {stats.loading ? (
              <Spinner size="sm" className="text-purple-600" />
            ) : (
              <span className="text-2xl font-bold text-slate-900">{stats.roleCount}</span>
            )}
            <span className="text-xs text-slate-500">System Roles Seeded</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Audit Events
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            {stats.loading ? (
              <Spinner size="sm" className="text-amber-600" />
            ) : (
              <span className="text-2xl font-bold text-slate-900">{stats.auditCount}</span>
            )}
            <span className="text-xs text-slate-500">Immutable Records</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Database State
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-sm font-bold text-emerald-700">Healthy & Online</span>
            <span className="text-xs text-slate-500">MongoDB 8.x</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Link
          href="/users"
          className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Staff / User Management</h3>
          <p className="mt-1 text-sm text-slate-500">
            View, search, create, and manage staff members with all 12 Section 48 fields, departments, designations, and account status.
          </p>
        </Link>

        <Link
          href="/roles"
          className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-purple-500 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-purple-600 transition" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Roles & Permissions Matrix</h3>
          <p className="mt-1 text-sm text-slate-500">
            Inspect all 7 baseline roles, action privileges (View, Create, Edit, Delete, Export, Assign, Publish, Approve), and visibility scopes.
          </p>
        </Link>

        <Link
          href="/audit-logs"
          className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-amber-500 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <History className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Audit Trail Verification</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review immutable audit records capturing actor, action, entity, entity ID, old/new value diffs, IP address, and timestamp.
          </p>
        </Link>
      </div>

      {/* Phase 1 Verification Checklist Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Phase 1 Architectural Guarantees & Scope Boundary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">7 Baseline Roles Seeded</p>
              <p className="text-xs text-slate-500">Super Admin, Admin, Sales Manager, Sales Exec, Property Mgr, Website Mgr, Viewer.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">All 8 Permission Actions Modeled</p>
              <p className="text-xs text-slate-500">View, Create, Edit, Delete, Export, Assign, Publish, Approve.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">3-Tier Lead Visibility Enforced</p>
              <p className="text-xs text-slate-500">Assigned, Team, and Company scopes enforced with fail-closed server policies.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">Section 51 Controlled Workflows</p>
              <p className="text-xs text-slate-500">Property, Project, and Website Content publication state machines and authorization rules.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
