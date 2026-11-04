"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  Building,
  Phone,
  Mail,
  FileText,
  Eye,
  Trash2,
  Edit2,
  ShieldCheck,
  CheckCircle,
  Briefcase,
  ExternalLink,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SsrOwnerItem } from "@/services/ownerService";
import { SafeUser } from "@/types";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface OwnersClientProps {
  initialOwners: SsrOwnerItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentUser: SafeUser;
  roleSlug: string;
}

export function OwnersClient({
  initialOwners,
  pagination,
  currentUser,
  roleSlug,
}: OwnersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [owners, setOwners] = useState<SsrOwnerItem[]>(initialOwners);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [ownershipFilter, setOwnershipFilter] = useState(
    searchParams.get("ownershipType") || "ALL"
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [selected360Data, setSelected360Data] = useState<any>(null);
  const [loading360, setLoading360] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    whatsApp: "",
    email: "",
    company: "",
    address: "",
    panGstNumber: "",
    ownershipType: "Individual",
    preferredContactMethod: "Call",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply filters via SSR URL params
  const handleFilterChange = (newSearch?: string, newOwnership?: string) => {
    const s = newSearch !== undefined ? newSearch : search;
    const o = newOwnership !== undefined ? newOwnership : ownershipFilter;

    const params = new URLSearchParams();
    if (s.trim()) params.set("search", s.trim());
    if (o && o !== "ALL") params.set("ownershipType", o);
    params.set("page", "1");

    startTransition(() => {
      router.push(`/owners?${params.toString()}`);
    });
  };

  // Open 360-degree aggregated portfolio view
  const handleOpen360 = async (owner: SsrOwnerItem) => {
    try {
      setLoading360(true);
      setIs360ModalOpen(true);
      const res = await fetch(`/api/owners/${owner._id}?view=360`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load Owner 360 data");
      setSelected360Data(json.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load Owner 360 view");
      setIs360ModalOpen(false);
    } finally {
      setLoading360(false);
    }
  };

  // Create new owner
  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      toast.error("Owner name and mobile are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to register owner");

      toast.success(`Owner ${json.data.ownerId} registered successfully`);
      setIsCreateModalOpen(false);
      setFormData({
        name: "",
        mobile: "",
        whatsApp: "",
        email: "",
        company: "",
        address: "",
        panGstNumber: "",
        ownershipType: "Individual",
        preferredContactMethod: "Call",
        notes: "",
      });

      // Refresh SSR list
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create owner");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete owner (enforcing guard on active properties)
  const handleDeleteOwner = async (owner: SsrOwnerItem) => {
    if (!confirm(`Are you sure you want to delete Owner ${owner.name} (${owner.ownerId})?`)) return;

    try {
      const res = await fetch(`/api/owners/${owner._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete owner");

      toast.success("Owner deleted successfully");
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete owner");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="size-6 text-blue-600" />
            Property Owners Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SSR Pre-rendered landlord and seller portfolios, documents, and 360° asset overviews.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus className="size-4" />
          Register New Owner
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search owners by name, mobile, email, PAN, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFilterChange(search);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={ownershipFilter}
            onChange={(e) => {
              setOwnershipFilter(e.target.value);
              handleFilterChange(undefined, e.target.value);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Ownership Types</option>
            <option value="Individual">Individual</option>
            <option value="Joint">Joint Ownership</option>
            <option value="Corporate">Corporate / Entity</option>
            <option value="NRI">NRI (Non-Resident Indian)</option>
          </select>

          <button
            type="button"
            onClick={() => handleFilterChange(search, ownershipFilter)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* Owners Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <TableHead>Owner ID</TableHead>
              <TableHead>Owner Name & Contact</TableHead>
              <TableHead>Ownership Type</TableHead>
              <TableHead>PAN / GST</TableHead>
              <TableHead className="text-center">Properties Owned</TableHead>
              <TableHead className="text-center">KYC Docs</TableHead>
              <TableHead className="text-right">360° Portfolio & Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialOwners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400">
                  No property owners registered matching the query.
                </TableCell>
              </TableRow>
            ) : (
              initialOwners.map((owner) => (
                <TableRow key={owner._id} className="hover:bg-slate-50/80 transition text-xs">
                  <TableCell className="font-mono font-bold text-blue-600">
                    {owner.ownerId}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{owner.name}</div>
                    <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-slate-400" />
                        {owner.mobile}
                      </span>
                      {owner.email && (
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <Mail className="size-3 text-slate-400" />
                          {owner.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {owner.ownershipType}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-slate-600">
                    {owner.panGstNumber || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-xs">
                      <Building className="size-3 text-blue-600" />
                      {owner.totalPropertiesOwned}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] font-medium text-slate-600">
                      {owner.documentsCount} files
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpen360(owner)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition cursor-pointer"
                        title="Open Owner 360° Portfolio View"
                      >
                        <Eye className="size-3.5" />
                        360° View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOwner(owner)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Delete Owner"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{owners.length}</span> of{" "}
            <span className="font-semibold">{pagination.total}</span> total owners
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, pagination.page - 1)));
                startTransition(() => {
                  router.push(`/owners?${params.toString()}`);
                });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(pagination.totalPages, pagination.page + 1)));
                startTransition(() => {
                  router.push(`/owners?${params.toString()}`);
                });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Owner 360° Portfolio Modal */}
      {is360ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Eye className="size-5 text-indigo-600" />
                  Owner 360° Portfolio View
                </h3>
                {selected360Data?.owner && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selected360Data.owner.name} ({selected360Data.owner.ownerId}) •{" "}
                    {selected360Data.owner.ownershipType} • Mobile: {selected360Data.owner.mobile}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIs360ModalOpen(false);
                  setSelected360Data(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {loading360 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  Loading aggregated portfolio metrics...
                </div>
              ) : selected360Data ? (
                <>
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-blue-600">Total Properties</div>
                      <div className="text-2xl font-black text-blue-900 mt-1">
                        {selected360Data.metrics?.totalProperties || 0}
                      </div>
                    </div>
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-emerald-600">Available / Active</div>
                      <div className="text-2xl font-black text-emerald-900 mt-1">
                        {selected360Data.metrics?.availableCount || 0}
                      </div>
                    </div>
                    <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-purple-600">Sold / Completed</div>
                      <div className="text-2xl font-black text-purple-900 mt-1">
                        {selected360Data.metrics?.soldCount || 0}
                      </div>
                    </div>
                    <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                      <div className="text-[11px] font-bold uppercase text-amber-600">Rented / Leased</div>
                      <div className="text-2xl font-black text-amber-900 mt-1">
                        {selected360Data.metrics?.rentedLeasedCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Valuation Stats */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Estimated Asset Valuation</div>
                      <div className="text-xl font-bold text-slate-900">
                        ₹{(selected360Data.metrics?.totalPortfolioValue || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Monthly Rental Cashflow</div>
                      <div className="text-xl font-bold text-emerald-600">
                        ₹{(selected360Data.metrics?.totalMonthlyRentalIncome || 0).toLocaleString("en-IN")} /mo
                      </div>
                    </div>
                  </div>

                  {/* Properties Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Linked Property Inventory
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 text-[11px]">
                            <TableHead>Property ID</TableHead>
                            <TableHead>Title & Location</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Price / Rent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected360Data.properties?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-xs py-6 text-slate-400">
                                No properties linked to this owner yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selected360Data.properties?.map((p: any) => (
                              <TableRow key={p._id} className="text-xs">
                                <TableCell className="font-mono font-semibold text-blue-600">
                                  {p.propertyId}
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold text-slate-800">{p.title}</div>
                                  <div className="text-[11px] text-slate-400">{p.location?.city}</div>
                                </TableCell>
                                <TableCell>{p.propertyCategory}</TableCell>
                                <TableCell>{p.transactionType}</TableCell>
                                <TableCell>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {p.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {p.pricing?.price
                                    ? `₹${p.pricing.price.toLocaleString("en-IN")}`
                                    : p.pricing?.monthlyRent
                                    ? `₹${p.pricing.monthlyRent.toLocaleString("en-IN")}/mo`
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Register Owner Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="size-4 text-blue-600" />
                Register Property Owner / Landlord
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOwner} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. owner@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN / GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={formData.panGstNumber}
                    onChange={(e) => setFormData({ ...formData, panGstNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ownership Type
                  </label>
                  <select
                    value={formData.ownershipType}
                    onChange={(e) => setFormData({ ...formData, ownershipType: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Joint">Joint Ownership</option>
                    <option value="Corporate">Corporate / Entity</option>
                    <option value="NRI">NRI (Non-Resident Indian)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Contact
                  </label>
                  <select
                    value={formData.preferredContactMethod}
                    onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104 Prestige Towers, MG Road, Bengaluru"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional owner preferences, bank details, or title deeds summary..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Registering..." : "Register Owner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

