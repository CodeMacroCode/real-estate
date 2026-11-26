"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Globe,
  Link2,
  Plus,
  Search,
  Star,
  Power,
  Trash2,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Loader2,
  HelpCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";

export interface DomainItem {
  _id: string;
  id?: string;
  agencyId:
    | string
    | {
        _id: string;
        name?: string;
        email?: string;
        agencyName?: string;
        agencySlug?: string;
      };
  agency?: {
    id?: string;
    name?: string;
    email?: string;
    agencyName?: string;
    agencySlug?: string;
  } | null;
  agencyName?: string;
  agencySlug?: string;
  hostname: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AgencyOption {
  _id: string;
  name: string;
  agencyName: string;
  agencySlug?: string;
  email?: string;
}

interface DomainsClientProps {
  roleSlug: string;
  currentUserId: string;
  currentAgencyName: string;
}

function validateDomainInput(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "Please enter a domain or subdomain.";
  }
  if (/\s/.test(trimmed)) {
    return "Domain cannot contain spaces.";
  }

  const normalized = normalizeHostname(trimmed);
  if (!normalized) {
    return "Please enter a valid domain name.";
  }

  const isCurrentPlatformHost =
    isPlatformHost(normalized) ||
    (typeof window !== "undefined" &&
      normalizeHostname(window.location.hostname) === normalized);

  if (isCurrentPlatformHost) {
    return `"${normalized}" is a reserved platform host and cannot be added as a custom domain.`;
  }

  // Reject IPv4 addresses
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    return "IP addresses are not allowed. Enter a domain name such as portal.youragency.com.";
  }

  // Must contain at least one dot
  const labels = normalized.split(".");
  if (labels.length < 2) {
    return "Enter a full domain with a TLD (e.g., portal.youragency.com).";
  }

  const labelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  for (const label of labels) {
    if (!labelRegex.test(label)) {
      return "Domain labels may only contain letters, numbers, and hyphens, and cannot start or end with a hyphen.";
    }
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return "Top-level domain must be at least 2 letters (e.g., .com, .in, .realestate).";
  }

  if (normalized.length > 253) {
    return "Domain name cannot exceed 253 characters.";
  }

  return null;
}

function extractAgencyInfo(domain: DomainItem): {
  id: string;
  name: string;
  slug?: string;
} {
  if (domain.agency) {
    return {
      id: domain.agency.id || (typeof domain.agencyId === "string" ? domain.agencyId : domain.agencyId?._id || ""),
      name:
        domain.agency.agencyName ||
        domain.agency.name ||
        domain.agencyName ||
        "Unknown Agency",
      slug: domain.agency.agencySlug || domain.agencySlug,
    };
  }
  if (typeof domain.agencyId === "object" && domain.agencyId !== null) {
    return {
      id: domain.agencyId._id,
      name:
        domain.agencyName ||
        domain.agencyId.agencyName ||
        domain.agencyId.name ||
        "Unknown Agency",
      slug: domain.agencySlug || domain.agencyId.agencySlug,
    };
  }
  return {
    id: String(domain.agencyId || ""),
    name: domain.agencyName || "Unknown Agency",
    slug: domain.agencySlug,
  };
}

export function DomainsClient({
  roleSlug,
  currentUserId,
  currentAgencyName,
}: DomainsClientProps) {
  const isSuperAdmin = roleSlug === "super_admin";

  // Unique IDs for accessible form linking
  const hostnameInputId = useId();
  const hostnameHintId = useId();
  const hostnameErrorId = useId();
  const agencySelectId = useId();
  const filterAgencyId = useId();
  const searchInputId = useId();
  const statusFilterId = useId();
  const infoPopupId = useId();

  // In-page help popup state
  const [activeInfoPopup, setActiveInfoPopup] = useState<"how-it-works" | "primary" | null>(null);

  // List state
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");

  // Add domain form state
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(
    isSuperAdmin ? "" : currentUserId
  );
  const [hostname, setHostname] = useState("");
  const [isPrimaryNew, setIsPrimaryNew] = useState(false);
  const [hostnameTouched, setHostnameTouched] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Row action state
  const [busyDomainId, setBusyDomainId] = useState<string | null>(null);
  const [confirmDeleteDomain, setConfirmDeleteDomain] = useState<DomainItem | null>(null);
  const [copiedHost, setCopiedHost] = useState<string | null>(null);

  const clientValidationError = useMemo(
    () => validateDomainInput(hostname),
    [hostname]
  );
  const showHostnameError =
    (hostnameTouched || formSubmitted) && Boolean(clientValidationError);

  const fetchDomainsAndAgencies = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (statusFilter === "active") params.set("isActive", "true");
        if (statusFilter === "inactive") params.set("isActive", "false");
        if (isSuperAdmin && agencyFilter !== "all") {
          params.set("agencyId", agencyFilter);
        }
        if (isSuperAdmin) {
          params.set("includeAgencies", "true");
        }
        params.set("limit", "100");

        const res = await fetch(`/api/domains?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load custom domains");
        }

        const payload = json.data;
        const domainList: DomainItem[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.domains)
            ? payload.domains
            : Array.isArray(payload?.items)
              ? payload.items
              : [];

        setDomains(domainList);

        if (isSuperAdmin) {
          const rawAgencies =
            payload?.agencies || json.meta?.agencies || json.pagination?.agencies;
          if (Array.isArray(rawAgencies) && rawAgencies.length > 0) {
            const normalizedAgencies: AgencyOption[] = rawAgencies.map((a: any) => ({
              _id: String(a._id || a.adminId || a.id),
              name: a.name || a.adminName || a.agencyName || "Agency",
              agencyName: a.agencyName || a.name || a.adminName || "Agency",
              agencySlug: a.agencySlug,
              email: a.email || a.adminEmail,
            }));
            setAgencies(normalizedAgencies);
            setSelectedAgencyId((prev) =>
              prev || normalizedAgencies[0]?._id || ""
            );
          } else if (agencies.length === 0) {
            // Fallback to /api/website-management if agencies weren't included
            try {
              const wmRes = await fetch("/api/website-management?limit=100", {
                cache: "no-store",
              });
              const wmJson = await wmRes.json();
              if (wmRes.ok && wmJson.success && Array.isArray(wmJson.data?.adminPortals)) {
                const portalAgencies: AgencyOption[] = wmJson.data.adminPortals.map(
                  (p: any) => ({
                    _id: String(p.adminId),
                    name: p.adminName || p.agencyName || "Agency",
                    agencyName: p.agencyName || p.adminName || "Agency",
                    agencySlug: p.agencySlug,
                    email: p.adminEmail,
                  })
                );
                setAgencies(portalAgencies);
                setSelectedAgencyId((prev) =>
                  prev || portalAgencies[0]?._id || ""
                );
              }
            } catch {
              // Ignore fallback error
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch domains:", err);
        toast.error(err.message || "Failed to load custom domains");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, statusFilter, agencyFilter, isSuperAdmin, agencies.length]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDomainsAndAgencies(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchDomainsAndAgencies]);

  useEffect(() => {
    if (!activeInfoPopup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveInfoPopup(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeInfoPopup]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (clientValidationError) {
      toast.error(clientValidationError);
      return;
    }

    if (isSuperAdmin && !selectedAgencyId) {
      toast.error("Please select an agency for this custom domain.");
      return;
    }

    setSubmitting(true);
    try {
      const normalized = normalizeHostname(hostname);
      const body: Record<string, any> = {
        hostname: normalized,
        isPrimary: isPrimaryNew,
      };
      if (isSuperAdmin && selectedAgencyId) {
        body.agencyId = selectedAgencyId;
      }

      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to add custom domain");
      }

      toast.success(`Custom domain "${normalized}" added successfully.`);
      setHostname("");
      setIsPrimaryNew(false);
      setHostnameTouched(false);
      setFormSubmitted(false);
      await fetchDomainsAndAgencies(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to add custom domain");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (domain: DomainItem) => {
    setBusyDomainId(domain._id);
    try {
      const res = await fetch(`/api/domains/${domain._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to set primary domain");
      }

      toast.success(`"${domain.hostname}" is now the primary domain.`);
      await fetchDomainsAndAgencies(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to set primary domain");
    } finally {
      setBusyDomainId(null);
    }
  };

  const handleToggleActive = async (domain: DomainItem) => {
    const nextActive = !domain.isActive;
    setBusyDomainId(domain._id);
    try {
      const res = await fetch(`/api/domains/${domain._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update domain status");
      }

      toast.success(
        `"${domain.hostname}" ${nextActive ? "activated" : "deactivated"}.`
      );
      await fetchDomainsAndAgencies(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to update domain status");
    } finally {
      setBusyDomainId(null);
    }
  };

  const handleDeleteDomain = async (domain: DomainItem) => {
    setBusyDomainId(domain._id);
    try {
      const res = await fetch(`/api/domains/${domain._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to remove domain");
      }

      toast.success(`Custom domain "${domain.hostname}" removed.`);
      setConfirmDeleteDomain(null);
      await fetchDomainsAndAgencies(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove domain");
    } finally {
      setBusyDomainId(null);
    }
  };

  const handleCopyHost = (host: string) => {
    navigator.clipboard.writeText(host);
    setCopiedHost(host);
    toast.success(`Copied "${host}" to clipboard`);
    setTimeout(() => setCopiedHost(null), 2000);
  };

  const stats = useMemo(() => {
    const total = domains.length;
    const active = domains.filter((d) => d.isActive).length;
    const primary = domains.filter((d) => d.isPrimary).length;
    return { total, active, primary };
  }, [domains]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Link2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Custom Domains
              </h1>
              <p className="text-sm text-slate-500">
                Bind custom domains and subdomains to serve agency property portals directly.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setActiveInfoPopup("how-it-works")}
            aria-expanded={activeInfoPopup === "how-it-works"}
            aria-controls={infoPopupId}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              activeInfoPopup === "how-it-works"
                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>How it works</span>
          </button>

          <button
            type="button"
            onClick={() => fetchDomainsAndAgencies(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Domains
            </span>
            <Globe className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Domains
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Primary Domains
            </span>
            <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.primary}</p>
        </div>
      </div>

      {/* Add Custom Domain Card */}
      <section
        aria-labelledby="add-domain-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2
              id="add-domain-heading"
              className="text-base font-semibold text-slate-900"
            >
              Add Custom Domain
            </h2>
          </div>
          {!isSuperAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              {currentAgencyName}
            </span>
          )}
        </div>

        <form
          onSubmit={handleAddDomain}
          noValidate
          aria-labelledby="add-domain-heading"
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-[auto_auto_auto] md:gap-x-4 md:gap-y-1.5">
            {/* Agency Selector (SuperAdmin) */}
            {isSuperAdmin && (
              <div className="flex flex-col md:col-span-4 md:row-span-3 md:grid md:grid-rows-subgrid">
                <div className="mb-1.5 md:mb-0 md:self-end">
                  <label
                    htmlFor={agencySelectId}
                    className="block text-sm font-medium text-slate-700"
                  >
                    Agency
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Agency portal served on this domain.
                  </p>
                </div>
                <select
                  id={agencySelectId}
                  name="agencyId"
                  value={selectedAgencyId}
                  onChange={(e) => setSelectedAgencyId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="" disabled>
                    Select an agency...
                  </option>
                  {agencies.map((agency) => (
                    <option key={agency._id} value={agency._id}>
                      {agency.agencyName}
                      {agency.email ? ` (${agency.email})` : ""}
                    </option>
                  ))}
                </select>
                <div className="hidden md:block" aria-hidden="true" />
              </div>
            )}

            {/* Hostname Input */}
            <div
              className={`flex flex-col md:row-span-3 md:grid md:grid-rows-subgrid ${
                isSuperAdmin ? "md:col-span-6" : "md:col-span-10"
              }`}
            >
              <div className="mb-1.5 md:mb-0 md:self-end">
                <label
                  htmlFor={hostnameInputId}
                  className="block text-sm font-medium text-slate-700"
                >
                  Domain Hostname
                </label>
                {/* Client-side format hint placed above the input */}
                <p id={hostnameHintId} className="mt-0.5 text-xs text-slate-500">
                  Without <span className="font-mono text-slate-700">https://</span> or paths (e.g.,{" "}
                  <span className="font-mono text-slate-700">portal.youragency.com</span>).
                </p>
              </div>
              <input
                id={hostnameInputId}
                name="hostname"
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                onBlur={() => setHostnameTouched(true)}
                placeholder="portal.youragency.com"
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                aria-invalid={showHostnameError ? "true" : "false"}
                aria-describedby={
                  showHostnameError
                    ? `${hostnameHintId} ${hostnameErrorId}`
                    : hostnameHintId
                }
                className={`h-10 w-full rounded-lg border px-3 text-sm text-slate-900 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 focus:outline-none focus:ring-2 user-invalid:border-red-500 user-invalid:ring-red-500/20 ${
                  showHostnameError
                    ? "border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
              {showHostnameError ? (
                <p
                  id={hostnameErrorId}
                  role="alert"
                  className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-600 md:mt-0.5"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{clientValidationError}</span>
                </p>
              ) : (
                <div className="hidden md:block" aria-hidden="true" />
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col md:col-span-2 md:row-span-3 md:grid md:grid-rows-subgrid">
              <div className="hidden md:block" aria-hidden="true" />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add Domain</span>
                  </>
                )}
              </button>
              <div className="hidden md:block" aria-hidden="true" />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center gap-2">
              <input
                id="is-primary-new"
                type="checkbox"
                checked={isPrimaryNew}
                onChange={(e) => setIsPrimaryNew(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="is-primary-new"
                className="text-sm text-slate-700 select-none"
              >
                Set as primary domain for this agency
              </label>
              <button
                type="button"
                onClick={() => setActiveInfoPopup("primary")}
                aria-expanded={activeInfoPopup === "primary"}
                aria-controls={infoPopupId}
                aria-label="What does primary domain mean?"
                title="What does primary domain mean?"
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  activeInfoPopup === "primary"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Domains Table Card */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar: Search & Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <label htmlFor={searchInputId} className="sr-only">
              Search domains by hostname or agency
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hostname or agency..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <label htmlFor={filterAgencyId} className="sr-only">
                  Filter by agency
                </label>
                <select
                  id={filterAgencyId}
                  value={agencyFilter}
                  onChange={(e) => setAgencyFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Agencies</option>
                  {agencies.map((agency) => (
                    <option key={agency._id} value={agency._id}>
                      {agency.agencyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <label htmlFor={statusFilterId} className="sr-only">
                Filter by active status
              </label>
              <select
                id={statusFilterId}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "inactive")
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Semantic Table Region */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Custom domains table"
          className="overflow-x-auto max-h-[560px] custom-table-scroll focus:outline-none"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium">Loading custom domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <Globe className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                No custom domains found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {searchQuery || statusFilter !== "all" || agencyFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Add a custom domain above to serve your agency property portal on your own hostname."}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Agency Name
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Hostname
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Primary Status</span>
                      <button
                        type="button"
                        onClick={() => setActiveInfoPopup("primary")}
                        aria-expanded={activeInfoPopup === "primary"}
                        aria-controls={infoPopupId}
                        aria-label="Explain Primary Status"
                        title="Explain Primary Status"
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                          activeInfoPopup === "primary"
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        }`}
                      >
                        <HelpCircle className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Active Status
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {domains.map((domain) => {
                  const agency = extractAgencyInfo(domain);
                  const isBusy = busyDomainId === domain._id;
                  const createdDate = domain.createdAt
                    ? new Date(domain.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={domain._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2
                            className="h-4 w-4 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{agency.name}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {domain.hostname}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyHost(domain.hostname)}
                            title={`Copy ${domain.hostname}`}
                            aria-label={`Copy ${domain.hostname}`}
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            {copiedHost === domain.hostname ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <a
                            href={`https://${domain.hostname}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open https://${domain.hostname}`}
                            aria-label={`Open ${domain.hostname} in new tab`}
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {domain.isPrimary ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                            <Star
                              className="h-3 w-3 fill-amber-500 text-amber-500"
                              aria-hidden="true"
                            />
                            Primary
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Secondary
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        {domain.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                            <XCircle className="h-3 w-3 text-slate-400" aria-hidden="true" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                        {createdDate}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {!domain.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(domain)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                            >
                              <Star className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Set Primary</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleActive(domain)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                              domain.isActive
                                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {domain.isActive ? "Deactivate" : "Activate"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDomain(domain)}
                            disabled={isBusy}
                            aria-label={`Remove ${domain.hostname}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* In-Page Help Popup Modal */}
      {activeInfoPopup && (
        <div
          id={infoPopupId}
          role="dialog"
          aria-modal="true"
          aria-labelledby="domain-help-popup-title"
          onClick={() => setActiveInfoPopup(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full rounded-xl border border-slate-200 bg-white p-6 shadow-xl ${
              activeInfoPopup === "how-it-works" ? "max-w-2xl" : "max-w-md"
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="domain-help-popup-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    {activeInfoPopup === "how-it-works"
                      ? "How Custom Domains Work"
                      : "Primary vs Secondary Domain"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeInfoPopup === "how-it-works"
                      ? "Quick guide to binding, managing, and launching agency portals."
                      : "How primary and secondary domains work for an agency."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfoPopup(null)}
                aria-label="Close help popup"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {activeInfoPopup === "primary" ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
                  <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                    Primary Domain
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    The agency&apos;s main/canonical domain. Only{" "}
                    <span className="font-semibold text-slate-900">one domain per agency</span>{" "}
                    can be marked Primary. Clicking{" "}
                    <span className="font-semibold text-slate-900">Set Primary</span> promotes a
                    domain and automatically demotes the previous Primary to Secondary.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                    Secondary Domains
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    Additional domains assigned to the same agency (e.g.{" "}
                    <span className="font-mono text-slate-800">www.</span> or alternate URLs). Both
                    Primary and Secondary domains serve the agency&apos;s published listings as long
                    as they are <span className="font-semibold text-slate-900">Active</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    What Custom Domains Do
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Serve an agency&apos;s published property listings directly on their own domain
                    (e.g., <span className="font-mono text-slate-800">www.abcrealty.in</span>)
                    without redirecting to the platform URL, with strict tenant isolation.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Primary vs Secondary
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    An agency can have multiple domains, with one{" "}
                    <span className="font-semibold text-slate-800">Primary</span> domain.
                    Secondary domains still serve listings;{" "}
                    <span className="font-semibold text-slate-800">Set Primary</span> promotes one
                    and demotes the previous.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Active vs Inactive
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Only <span className="font-semibold text-slate-800">Active</span> domains
                    resolve for visitors. <span className="font-semibold text-slate-800">Deactivate</span>{" "}
                    pauses a domain without deleting it.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Setup Steps
                  </h4>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
                    <li>Assign the domain to an agency here.</li>
                    <li>Ensure properties are Available &amp; Published on Website.</li>
                    <li>
                      Infra points DNS + reverse proxy (
                      <span className="font-mono text-slate-800">Host</span> /{" "}
                      <span className="font-mono text-slate-800">X-Forwarded-Host</span>) + SSL.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveInfoPopup(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteDomain && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-domain-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="delete-domain-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Remove Custom Domain
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Are you sure you want to remove{" "}
                  <span className="font-mono font-semibold text-slate-900">
                    {confirmDeleteDomain.hostname}
                  </span>
                  ? Visitors using this domain will no longer reach the agency
                  portal.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteDomain(null)}
                disabled={busyDomainId === confirmDeleteDomain._id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDomain(confirmDeleteDomain)}
                disabled={busyDomainId === confirmDeleteDomain._id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {busyDomainId === confirmDeleteDomain._id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove Domain</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
