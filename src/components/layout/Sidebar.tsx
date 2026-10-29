'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  History,
  Building2,
  PhoneIncoming,
  Briefcase,
  Layers,
  Globe,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { SafeUser } from '@/types';

interface SidebarProps {
  user?: SafeUser | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const roleSlug = user?.role?.slug || '';
  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = roleSlug === 'admin';
  const isSubRole = !isSuperAdmin && !isAdmin;

  // Role-wise navigation items:
  // SuperAdmin sees: Dashboard, Users (Admins), Staff Management, Roles & Permissions, Audit Logs
  // Admin sees: Dashboard, Staff Management, Roles & Permissions, Audit Logs
  // Sub-Role staff sees: Dashboard only (with welcome / personalized overview)
  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
      visible: true,
    },
    {
      name: 'Users (Admins)',
      href: '/users',
      icon: Users,
      active: pathname === '/users',
      visible: isSuperAdmin,
    },
    {
      name: 'Staff Management',
      href: '/staff',
      icon: Briefcase,
      active: pathname.startsWith('/staff'),
      visible: isSuperAdmin || isAdmin,
    },
    {
      name: 'Roles & Permissions',
      href: '/roles',
      icon: ShieldCheck,
      active: pathname.startsWith('/roles'),
      visible: isSuperAdmin || isAdmin,
    },
    {
      name: 'Audit Logs',
      href: '/audit-logs',
      icon: History,
      active: pathname.startsWith('/audit-logs'),
      visible: isSuperAdmin || isAdmin,
    },
  ].filter((item) => item.visible);

  const laterPhaseModules = [
    { name: 'Leads & Enquiries', icon: PhoneIncoming },
    { name: 'Properties Inventory', icon: Building2 },
    { name: 'Projects', icon: Layers },
    { name: 'Clients & Owners', icon: Briefcase },
    { name: 'Website CMS', icon: Globe },
    { name: 'Master Settings', icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg shadow-sm">
          RE
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-slate-900">
            Real Estate CRM
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
            {isSuperAdmin
              ? 'Super Admin Portal'
              : isAdmin
              ? 'Admin Portal'
              : `${user?.role?.name || 'Staff'} Workspace`}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isSubRole ? 'Staff Workspace' : 'Management Modules'}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    item.active
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.active ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-2 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>CRM Modules</span>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal">
              Phase 2+
            </span>
          </div>
          <div className="space-y-1">
            {laterPhaseModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed opacity-75 hover:bg-slate-50/50"
                  title="Scheduled for implementation in later phases per specification"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-300" />
                    <span>{module.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Footer Summary */}
      {user && (
        <div className="border-t border-slate-200 p-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-900 truncate">{user.name}</span>
              <span className="text-[11px] text-slate-500 truncate capitalize">
                {user.role?.name || user.role?.slug?.replace(/_/g, ' ') || 'Staff Member'}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
