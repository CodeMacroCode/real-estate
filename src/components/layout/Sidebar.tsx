"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Share2,
} from "lucide-react";
import { SafeUser } from "@/types";

interface SidebarProps {
  user?: SafeUser | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const roleSlug = user?.role?.slug || "";
  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";
  const isSubRole = !isSuperAdmin && !isAdmin;

  // Role-wise navigation items:
  // SuperAdmin sees: Dashboard, Users (Admins), Staff Management, Roles & Permissions, Audit Logs
  // Admin sees: Dashboard, Staff Management, Roles & Permissions, Audit Logs
  // Sub-Role staff sees: Dashboard only in Management (plus assigned CRM modules below)
  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      visible: true,
    },
    {
      name: "Users (Admins)",
      href: "/users",
      icon: Users,
      active: pathname === "/users",
      visible: isSuperAdmin,
    },
    {
      name: "Staff Management",
      href: "/staff",
      icon: Briefcase,
      active: pathname.startsWith("/staff"),
      visible: isSuperAdmin || isAdmin,
    },
    {
      name: "Roles & Permissions",
      href: "/roles",
      icon: ShieldCheck,
      active: pathname.startsWith("/roles"),
      visible: isSuperAdmin || isAdmin,
    },
    {
      name: "Audit Logs",
      href: "/audit-logs",
      icon: History,
      active: pathname.startsWith("/audit-logs"),
      visible: isSuperAdmin || isAdmin,
    },
    {
      name: "Admin Website Management",
      href: "/website-management",
      icon: Globe,
      active: pathname.startsWith("/website-management"),
      visible: true, // Visible to SuperAdmin (all URLs), Admin (their URLs), and Sub-roles
    },
  ].filter((item) => item.visible);

  // Leads & CRM Modules
  const leadCrmItems = [
    {
      name: "Dynamic Forms",
      href: "/custom-forms",
      icon: FileSpreadsheet,
      active: pathname.startsWith("/custom-forms"),
      visible: isSuperAdmin, // Form Builder owned exclusively by SuperAdmin
    },
    {
      name: "Leads & Enquiries",
      href: "/leads",
      icon: PhoneIncoming,
      active: pathname.startsWith("/leads"),
      visible: !isSuperAdmin, // Admin & Sub-Roles
    },
    {
      name: "Appointments & Meetings",
      href: "/appointments",
      icon: Calendar,
      active: pathname.startsWith("/appointments"),
      visible: !isSuperAdmin, // Admin & Sub-Roles
    },
    {
      name: "Client Confirmations",
      href: "/client-confirmations",
      icon: CheckCircle,
      active: pathname.startsWith("/client-confirmations"),
      visible: !isSuperAdmin, // Admin & Sub-Roles
    },
    {
      name: "Client Information (CRM)",
      href: "/client-information",
      icon: Users,
      active: pathname.startsWith("/client-information"),
      visible: !isSuperAdmin, // Admin & Sub-Roles
    },
    {
      name: "Connect Social Media",
      href: "/connect-social-media",
      icon: Share2,
      active: pathname.startsWith("/connect-social-media"),
      visible: isAdmin, // Connected at Admin organization level
    },
  ].filter((item) => item.visible);

  // Properties & Real Estate Engine Modules
  const propertiesCrmItems = [
    {
      name: "Properties Inventory",
      href: "/properties",
      icon: Building2,
      active: pathname.startsWith("/properties"),
      visible: true,
    },
    {
      name: "Projects & Units",
      href: "/projects",
      icon: Layers,
      active: pathname.startsWith("/projects"),
      visible: true,
    },
    {
      name: "Property Owners",
      href: "/owners",
      icon: Briefcase,
      active: pathname.startsWith("/owners"),
      visible: true,
    },
    {
      name: "Website Inquiries",
      href: "/inquiries",
      icon: PhoneIncoming,
      active: pathname.startsWith("/inquiries"),
      visible: !isSuperAdmin,
    },
    {
      name: "Master Settings",
      href: "/master-settings",
      icon: Settings,
      active: pathname.startsWith("/master-settings"),
      visible: isSuperAdmin || isAdmin,
    },
  ].filter((item) => item.visible);

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
              ? "Super Admin Portal"
              : isAdmin
                ? "Admin Portal"
                : `${user?.role?.name || "Staff"} Workspace`}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isSubRole ? "Staff Workspace" : "Management Modules"}
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
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${item.active ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Leads & CRM Navigation */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Leads & CRM</span>
            <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
              Leads
            </span>
          </div>
          <nav className="space-y-1">
            {leadCrmItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    item.active
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${item.active ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Properties & Real Estate Engine Navigation */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Properties & Inventory</span>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
              Properties
            </span>
          </div>
          <nav className="space-y-1">
            {propertiesCrmItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    item.active
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${item.active ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
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
              <span className="text-xs font-semibold text-slate-900 truncate">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-500 truncate capitalize">
                {user.role?.name ||
                  user.role?.slug?.replace(/_/g, " ") ||
                  "Staff Member"}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
