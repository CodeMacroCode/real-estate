"use client";

import React, { useState, useMemo } from "react";
import {
  Settings,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Building,
  Layers,
  MapPin,
  Sparkles,
  Tag,
  Trash2,
  Edit2,
  RefreshCw,
  Globe,
  Sliders,
  ChevronLeft,
  ChevronRight,
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

const CATEGORIES = [
  { key: "property_types", label: "Property Types", icon: Building },
  { key: "transaction_types", label: "Transaction Types", icon: Sliders },
  { key: "property_statuses", label: "Property Statuses", icon: Tag },
  { key: "lead_sources", label: "Lead Sources", icon: Globe },
  { key: "lead_statuses", label: "Lead Statuses", icon: CheckCircle },
  { key: "amenities", label: "Amenities", icon: Sparkles },
  { key: "furnishing_options", label: "Furnishing Options", icon: Layers },
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
  const pageSize = 10;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New option form state
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDisplayOrder, setNewDisplayOrder] = useState(10);
  const [isUnpublishTrigger, setIsUnpublishTrigger] = useState(false);

  const isSuperAdmin = roleSlug === "super_admin";

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

  const totalPages = Math.ceil(filteredOptions.length / pageSize) || 1;
  const paginatedOptions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOptions.slice(start, start + pageSize);
  }, [filteredOptions, page, pageSize]);

  // Handle Create Custom Master
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim()) {
      toast.error("Please fill in both Label and System Value");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          label: newLabel.trim(),
          value: newValue.trim(),
          displayOrder: Number(newDisplayOrder) || 10,
          metadata: { isUnpublishTrigger },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create master option");
      }

      toast.success(`Created [${newLabel}] successfully`);
      setOptions((prev) => [...prev, json.data]);
      setIsCreateModalOpen(false);
      setNewLabel("");
      setNewValue("");
      setIsUnpublishTrigger(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create option");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (opt: SsrMasterOption) => {
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
      setOptions((prev) =>
        prev.map((item) => (item._id === opt._id ? { ...item, isActive: !item.isActive } : item))
      );
      toast.success(`Option updated`);
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
      setOptions((prev) => prev.filter((item) => item._id !== opt._id));
      toast.success("Option deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete option");
    }
  };

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
            SSR Pre-rendered dictionary values and website publishing rules across all real estate categories.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewLabel("");
            setNewValue("");
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
        >
          <Plus className="size-4" />
          Add Custom Option
        </button>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          const count = options.filter((o) => o.category === cat.key).length;

          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{cat.label}</span>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filteredOptions.length}</span>{" "}
          items
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
              paginatedOptions.map((opt, idx) => (
                <TableRow key={opt._id} className="hover:bg-slate-50/80 transition text-xs">
                  <TableCell className="text-center text-slate-400 font-mono text-[11px]">
                    {opt.displayOrder || idx + 1}
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
                      onClick={() => handleToggleActive(opt)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                        opt.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {opt.isActive ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    {!opt.isSystemDefault ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(opt)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Delete custom option"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Protected</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {filteredOptions.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold">{paginatedOptions.length}</span> of{" "}
              <span className="font-semibold">{filteredOptions.length}</span> total options
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800">
                Add Custom Option to {CATEGORIES.find((c) => c.key === selectedCategory)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penthouse Studio"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newValue) {
                      setNewValue(
                        e.target.value.toLowerCase().replace(/[\s-]+/g, "_")
                      );
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System Value (Slug) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. penthouse_studio"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={newDisplayOrder}
                  onChange={(e) => setNewDisplayOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedCategory === "property_statuses" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="unpublishTrigger"
                    checked={isUnpublishTrigger}
                    onChange={(e) => setIsUnpublishTrigger(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="unpublishTrigger" className="text-xs text-slate-700">
                    Automatically unpublish properties from website when this status is set
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Option"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

