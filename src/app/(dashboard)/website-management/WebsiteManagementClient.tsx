"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Layers,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { SsrWebsiteManagementPortalItem } from "@/services/websiteManagementService";

interface WebsiteManagementClientProps {
  initialData: {
    adminPortals: SsrWebsiteManagementPortalItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    meta: {
      currentUserRole: string;
      isSuperAdmin: boolean;
      isAdmin: boolean;
    };
  };
  roleSlug: string;
}

export function WebsiteManagementClient({
  initialData,
  roleSlug,
}: WebsiteManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Edit slug / domain modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SsrWebsiteManagementPortalItem | null>(null);
  const [configForm, setConfigForm] = useState({
    agencyName: "",
    agencySlug: "",
    customDomain: "",
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [resettingAdminId, setResettingAdminId] = useState<string | null>(null);

  const { adminPortals, pagination, meta } = initialData;
  const isSuperAdmin = meta.isSuperAdmin;

  const handleResetUrl = async (admin: SsrWebsiteManagementPortalItem) => {
    const defaultSlug = (admin.agencyName || admin.adminName || "agency")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");

    const confirmed = window.confirm(
      `Are you sure you want to reset the website URL for "${admin.agencyName}"?\n\n` +
      `This will:\n` +
      `• Clear any non-working custom domain\n` +
      `• Reset agency slug back to "${defaultSlug}"\n` +
      `• Restore the default working agency portal link`
    );

    if (!confirmed) return;

    try {
      setResettingAdminId(admin.adminId);
      const res = await fetch("/api/website-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId: admin.adminId,
          agencyName: admin.agencyName || admin.adminName,
          agencySlug: defaultSlug,
          customDomain: "", // Clears custom domain
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset URL");

      toast.success(`URL for "${admin.agencyName}" reset to default successfully!`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Could not reset URL");
    } finally {
      setResettingAdminId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("page", "1");
    startTransition(() => {
      router.push(`/website-management?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`/website-management?${params.toString()}`);
    });
  };

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleOpenConfig = (admin: SsrWebsiteManagementPortalItem) => {
    setSelectedAdmin(admin);
    setConfigForm({
      agencyName: admin.agencyName || "",
      agencySlug: admin.agencySlug || "",
      customDomain: admin.customDomain || "",
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      setSavingConfig(true);
      const res = await fetch("/api/website-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId: selectedAdmin.adminId,
          agencyName: configForm.agencyName,
          agencySlug: configForm.agencySlug,
          customDomain: configForm.customDomain,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update domain settings");

      toast.success("Agency domain & slug settings updated successfully!");
      setIsConfigModalOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Could not save domain settings");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            <Globe className="size-3.5" />
            <span>Multi-Tenant Public Portals</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Admin Website Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isSuperAdmin
              ? `SuperAdmin Master Directory: Monitoring ${pagination.total} active agency portals.`
              : meta.isAdmin
                ? "Manage your agency's public website URLs, custom domains, and shareable links."
                : "Your agency's public website URLs. Share these verified links directly with customers."}
          </p>
        </div>
      </div>

      {/* SuperAdmin Filter / Search Bar */}
      {isSuperAdmin && (
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by agency, admin name, slug or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
          >
            Search
          </button>
        </form>
      )}

      {/* Portals Cards Grid */}
      {adminPortals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Globe className="size-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No agency portals found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Ensure Admin accounts are created and configured.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {adminPortals.map((portal) => (
            <div
              key={portal.adminId}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {portal.agencyName}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Admin Organization
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Admin: <span className="font-semibold text-slate-700">{portal.adminName}</span> • {portal.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Reset URL button - Exclusively available to SuperAdmin */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleResetUrl(portal)}
                        disabled={resettingAdminId === portal.adminId}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                        title="Reset URL back to default agency link and remove custom domain"
                      >
                        <RotateCcw className={`size-3.5 ${resettingAdminId === portal.adminId ? "animate-spin" : ""}`} />
                        <span>{resettingAdminId === portal.adminId ? "Resetting..." : "Reset URL"}</span>
                      </button>
                    )}

                    {(isSuperAdmin || meta.isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleOpenConfig(portal)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition shadow-xs cursor-pointer"
                        title="Configure Agency Slug & Custom Domain"
                      >
                        <Settings className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Published Inventory Counters */}
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    <Building2 className="size-3.5" />
                    {portal.publishedPropertiesCount} Live Properties
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    <Layers className="size-3.5" />
                    {portal.publishedProjectsCount} Live Projects
                  </span>
                </div>
              </div>

              {/* URL Portals List */}
              <div className="p-5 space-y-3.5 flex-1 text-xs">
                {/* Single Unified Global Agency Portal URL */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Globe className="size-4 text-blue-600" />
                      Agency Public Website Portal Link
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Live for Public
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Share this single URL with your clients, WhatsApp bio, and advertisements. Buyers can explore all your verified properties and developments in one place.
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="text"
                      readOnly
                      value={portal.urls.customPortalUrl || portal.urls.propertiesUrl}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800 select-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          portal.urls.customPortalUrl || portal.urls.propertiesUrl,
                          "Agency Public Portal URL"
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer text-xs"
                      title="Copy URL"
                    >
                      {copiedUrl === (portal.urls.customPortalUrl || portal.urls.propertiesUrl) ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href={portal.urls.customPortalUrl || portal.urls.propertiesUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                      title="Open in new tab"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </div>

                {/* Optional Subdomain / Custom Domain Status */}
                {portal.customDomain && (
                  <div className="px-3.5 py-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-700 font-medium">Custom Domain Connected:</span>
                      <span className="font-mono font-bold text-emerald-800">{portal.customDomain}</span>
                    </div>
                    <a
                      href={`https://${portal.customDomain}/portal-properties`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] inline-flex items-center gap-1"
                    >
                      Visit Domain <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Agency Slug: &quot;{portal.agencySlug}&quot;</span>
                <span>ID: {portal.adminId.slice(-6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SSR Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600">
          <div>
            Showing Page <span className="font-bold text-slate-900">{pagination.page}</span> of{" "}
            <span className="font-bold text-slate-900">{pagination.totalPages}</span> ({pagination.total} total portals)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || isPending}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isPending}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Domain / Slug Modal */}
      {isConfigModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Settings className="size-4 text-blue-600" />
                Configure Agency Portal & Domain
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agency Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Realty Partners"
                  value={configForm.agencyName}
                  onChange={(e) => setConfigForm({ ...configForm, agencyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agency Unique URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 font-mono text-xs">
                    /portal-properties?agency=
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="apex-realty"
                    value={configForm.agencySlug}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        agencySlug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs lowercase"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Used for clean shareable query links and subdomains (e.g. {configForm.agencySlug || "youragency"}.localhost:3000)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Domain Pointer (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. apexrealty.com or properties.apexrealty.in"
                  value={configForm.customDomain}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      customDomain: e.target.value.toLowerCase().replace(/^https?:\/\//, ""),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  When a visitor opens this domain, the system automatically detects the agency and shows only their properties.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-50"
                >
                  {savingConfig ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
