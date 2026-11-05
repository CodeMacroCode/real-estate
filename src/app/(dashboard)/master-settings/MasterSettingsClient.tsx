"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Settings,
  Plus,
  Search,
  CheckCircle,
  ShieldCheck,
  Building,
  Layers,
  Sparkles,
  Tag,
  Trash2,
  Edit2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Globe,
  MapPin,
  Lock,
  RefreshCw,
} from "lucide-react";
import { SsrMasterOption } from "@/services/masterService";
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

interface MasterSettingsClientProps {
  initialOptions: SsrMasterOption[];
  currentUser: SafeUser;
  roleSlug: string;
}

// All 8 categories are visible to browse and inspect
// Only the 5 property categories allow Add / Edit for tenant admins
const EDITABLE_CATEGORIES = [
  "property_types",
  "transaction_types",
  "property_statuses",
  "amenities",
  "furnishing_options",
];

const CATEGORIES = [
  { key: "property_types", label: "Property Types", icon: Building },
  { key: "transaction_types", label: "Transaction Types", icon: Sliders },
  { key: "property_statuses", label: "Property Statuses", icon: Tag },
  { key: "amenities", label: "Amenities", icon: Sparkles },
  { key: "furnishing_options", label: "Furnishing Options", icon: Layers },
  { key: "lead_sources", label: "Lead Sources", icon: Globe },
  { key: "lead_statuses", label: "Lead Statuses", icon: CheckCircle },
  { key: "locations", label: "Locations", icon: MapPin },
];

export function MasterSettingsClient({
  initialOptions,
  currentUser,
  roleSlug,
}: MasterSettingsClientProps) {
  const [options, setOptions] = useState<SsrMasterOption[]>(initialOptions);
  const [selectedCategory, setSelectedCategory] = useState<string>("property_types");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const pageSize = limit; // Alias for backward compatibility
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string>("property_types");
  const [newLabel, setNewLabel] = useState("");
  const [isUnpublishTrigger, setIsUnpublishTrigger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SsrMasterOption | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsUnpublishTrigger, setEditIsUnpublishTrigger] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const isSuperAdmin = roleSlug === "super_admin";

  // Check if current category is editable by tenant admin
  const isSelectedCategoryEditable = isSuperAdmin || EDITABLE_CATEGORIES.includes(selectedCategory);

  // GET API fetcher to re-synchronize latest state from server with limit param
  const refetchMasters = useCallback(async () => {
    try {
      setIsRefreshing(true);
      // Fetch with limit=1000 so all categories are fully loaded into client memory
      const res = await fetch(`/api/masters?includeInactive=true&limit=1000`);
      if (!res.ok) throw new Error("Failed to fetch latest options");
      const json = await res.json();
      const newItems: SsrMasterOption[] = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      setOptions(newItems);
      toast.success("Options refreshed successfully");
    } catch (err: any) {
      console.error("Error refreshing master options:", err);
      toast.error("Failed to refresh options");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Compute automatic slug from label
  const autoSlug = useMemo(() => {
    return newLabel
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }, [newLabel]);

  // Filter options by category and search query
  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      const matchCat = opt.category === selectedCategory;
      const matchQuery =
        !searchQuery ||
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [options, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredOptions.length / limit) || 1;
  const paginatedOptions = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredOptions.slice(start, start + limit);
  }, [filteredOptions, page, limit]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  // Open Create Modal (defaulting to current category if editable, else first editable category)
  const openCreateModal = (catKey?: string) => {
    const preferred = catKey || selectedCategory;
    const cat = EDITABLE_CATEGORIES.includes(preferred) || isSuperAdmin
      ? preferred
      : EDITABLE_CATEGORIES[0];
    setTargetCategory(cat);
    setNewLabel("");
    setIsUnpublishTrigger(false);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (opt: SsrMasterOption) => {
    setEditingOption(opt);
    setEditLabel(opt.label);
    setEditIsActive(opt.isActive);
    setEditIsUnpublishTrigger(Boolean(opt.metadata?.isUnpublishTrigger));
    setIsEditModalOpen(true);
  };

  // Handle Create Custom Master
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      toast.error("Please enter a Label");
      return;
    }
    const computedSlug = autoSlug || newLabel.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
    if (!computedSlug) {
      toast.error("Please enter a valid Label to generate system value");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: targetCategory,
          label: newLabel.trim(),
          value: computedSlug,
          displayOrder: 10,
          metadata: { isUnpublishTrigger },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create master option");
      }

      toast.success(`Created [${newLabel}] successfully`);
      setSelectedCategory(targetCategory);
      setIsCreateModalOpen(false);
      setNewLabel("");
      setIsUnpublishTrigger(false);

      // Hit GET API to sync full state
      await refetchMasters();
    } catch (err: any) {
      toast.error(err.message || "Failed to create option");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Option
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOption) return;
    if (!editLabel.trim()) {
      toast.error("Label cannot be empty");
      return;
    }

    try {
      setIsEditingSubmitting(true);
      const res = await fetch(`/api/masters/${editingOption._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim(),
          isActive: editIsActive,
          metadata: { isUnpublishTrigger: editIsUnpublishTrigger },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update option");
      }

      toast.success(`Updated [${editLabel}] successfully`);
      setIsEditModalOpen(false);
      setEditingOption(null);

      // Hit GET API immediately after update
      await refetchMasters();
    } catch (err: any) {
      toast.error(err.message || "Failed to update option");
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (opt: SsrMasterOption) => {
    // Only allow toggle if the category is editable or user is super admin
    if (!isSuperAdmin && !EDITABLE_CATEGORIES.includes(opt.category)) {
      toast.error("This section is read-only for system integrity");
      return;
    }

    try {
      const res = await fetch(`/api/masters/${opt._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !opt.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update option");
      }
      toast.success(`Option updated`);

      // Hit GET API immediately after toggle
      await refetchMasters();
    } catch (err: any) {
      toast.error(err.message || "Failed to update option");
    }
  };

  // Handle Delete Custom Master
  const handleDelete = async (opt: SsrMasterOption) => {
    if (opt.isSystemDefault) {
      toast.error("System default master options cannot be deleted");
      return;
    }
    if (!confirm(`Are you sure you want to delete '${opt.label}'?`)) return;

    try {
      const res = await fetch(`/api/masters/${opt._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete option");
      }
      toast.success("Option deleted successfully");

      // Hit GET API immediately after delete
      await refetchMasters();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete option");
    }
  };

  // Allowed categories for Add form (only the 5 property categories for tenant admin, or all for super admin)
  const availableModalCategories = CATEGORIES.filter(
    (c) => isSuperAdmin || EDITABLE_CATEGORIES.includes(c.key)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Settings className="size-6 text-blue-600" />
            Master Settings & Catalogs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage Property Types, Transaction Types, Statuses, Amenities, and Furnishing Options. Lead Sources, Lead Statuses, and Locations are view-only system catalogs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetchMasters()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Refresh from server"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="size-4" />
            Add Custom Option
          </button>
        </div>
      </div>

      {/* Category Pills Navigation (All 8 categories visible) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          const isReadOnly = !isSuperAdmin && !EDITABLE_CATEGORIES.includes(cat.key);
          const count = options.filter((o) => o.category === cat.key).length;

          return (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{cat.label}</span>
              {isReadOnly && (
                <Lock className={`size-3 ${isActive ? "text-blue-200" : "text-slate-400"}`} />
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? "bg-blue-500/40 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search options by label or value..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredOptions.length}</span>{" "}
            options
          </div>
          {isSelectedCategoryEditable ? (
            <button
              type="button"
              onClick={() => openCreateModal(selectedCategory)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
            >
              <Plus className="size-3.5" />
              Add to this section
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
              <Lock className="size-3 text-slate-400" />
              View Only
            </div>
          )}
        </div>
      </div>

      {/* Master Options Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>System Value (Slug)</TableHead>
              <TableHead>Scope / Origin</TableHead>
              {selectedCategory === "property_statuses" && (
                <TableHead>Website Auto-Unpublish</TableHead>
              )}
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectedCategory === "property_statuses" ? 7 : 6}
                  className="h-32 text-center text-xs text-slate-400"
                >
                  No options found in this category.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOptions.map((opt, idx) => {
                const canModify =
                  isSuperAdmin ||
                  (EDITABLE_CATEGORIES.includes(opt.category) && !opt.isSystemDefault);

                return (
                  <TableRow key={opt._id} className="hover:bg-slate-50/80 transition text-xs">
                    <TableCell className="text-center text-slate-400 font-mono text-[11px]">
                      {(page - 1) * limit + idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{opt.label}</TableCell>
                    <TableCell className="font-mono text-slate-500 text-[11px]">{opt.value}</TableCell>
                    <TableCell>
                      {opt.isSystemDefault ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="size-3" />
                          Global Default
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building className="size-3" />
                          Custom Org
                        </span>
                      )}
                    </TableCell>
                    {selectedCategory === "property_statuses" && (
                      <TableCell>
                        {opt.metadata?.isUnpublishTrigger ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            Auto-Hides from Website
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Normal Active</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <button
                        type="button"
                        disabled={!isSelectedCategoryEditable}
                        onClick={() => handleToggleActive(opt)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                          !isSelectedCategoryEditable
                            ? "cursor-not-allowed opacity-75"
                            : "cursor-pointer"
                        } ${
                          opt.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {opt.isActive ? "Active" : "Inactive"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Button: allowed for editable categories (or super admin) */}
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => openEditModal(opt)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                            title="Edit option"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                        )}

                        {/* Delete Button: custom options in editable categories */}
                        {!opt.isSystemDefault && (isSuperAdmin || EDITABLE_CATEGORIES.includes(opt.category)) ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(opt)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Delete custom option"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : (
                          !canModify && (
                            <span className="text-[10px] text-slate-400 italic px-1 flex items-center gap-1">
                              <Lock className="size-3" />
                              View only
                            </span>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {filteredOptions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-800">{paginatedOptions.length}</span> of{" "}
                <span className="font-semibold text-slate-800">{filteredOptions.length}</span> total options
              </div>

              {/* Rows Per Page Limit Selector */}
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-slate-600">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2">
                Page {page} of {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Option Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Add Custom Option
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Category Selector (Only editable categories shown for tenant admins) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Category (Section) *
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setTargetCategory(cat);
                    setSelectedCategory(cat);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 cursor-pointer"
                >
                  {availableModalCategories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecting a category will automatically place this option into that section.
                </p>
              </div>

              {/* Option Label */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Duplex Villa, Under Construction, Swimming Pool"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Property Status extra options */}
              {targetCategory === "property_statuses" && (
                <div className="flex items-center gap-2 pt-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                  <input
                    type="checkbox"
                    id="unpublishTrigger"
                    checked={isUnpublishTrigger}
                    onChange={(e) => setIsUnpublishTrigger(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="unpublishTrigger" className="text-xs text-slate-700 cursor-pointer">
                    Automatically unpublish properties from website when this status is set (e.g. Sold / Inactive)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newLabel.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Option"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Option Modal */}
      {isEditModalOpen && editingOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="size-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Edit Master Option ({CATEGORIES.find((c) => c.key === editingOption.category)?.label || editingOption.category})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingOption(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              {/* System Value is Read-only to avoid breaking foreign keys */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System Value (Slug)
                </label>
                <input
                  type="text"
                  value={editingOption.value}
                  disabled
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 text-slate-500 rounded-lg font-mono cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  System slug cannot be modified once created to maintain database integrity across properties.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editIsActive" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Active (show in drop-downs and selection lists)
                </label>
              </div>

              {editingOption.category === "property_statuses" && (
                <div className="flex items-center gap-2 pt-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                  <input
                    type="checkbox"
                    id="editUnpublishTrigger"
                    checked={editIsUnpublishTrigger}
                    onChange={(e) => setEditIsUnpublishTrigger(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="editUnpublishTrigger" className="text-xs text-slate-700 cursor-pointer">
                    Automatically unpublish properties from website when this status is set
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingOption(null);
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting || !editLabel.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isEditingSubmitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
