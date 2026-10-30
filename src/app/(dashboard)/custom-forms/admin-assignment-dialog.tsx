"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Link2, Globe, Check, AlertCircle } from "lucide-react";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/SearchableSelect";
import { FormTemplate } from "./frombuild";

interface AdminAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  selectedForm?: FormTemplate | null;
  forms: FormTemplate[];
}

export function AdminAssignmentDialog({
  isOpen,
  onClose,
  onAssigned,
  selectedForm,
  forms,
}: AdminAssignmentDialogProps) {
  const [formId, setFormId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminOptions, setAdminOptions] = useState<SearchableSelectOption[]>(
    [],
  );

  useEffect(() => {
    if (selectedForm) {
      setFormId(selectedForm._id);
      // Auto-generate preliminary slug
      const slugBase = selectedForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      setPublicSlug(`${slugBase}-leads`);
    } else if (forms.length > 0) {
      setFormId(forms[0]._id);
    }
  }, [selectedForm, forms, isOpen]);

  // Fetch admin options
  const fetchAdmins = useCallback(async (query: string = '') => {
    try {
      const res = await fetch(
        `/api/users?role=admin&search=${encodeURIComponent(query)}&limit=25`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setAdminOptions(
          json.data.map((u: any) => ({
            value: u._id,
            label: `${u.name} (${u.email})`,
            subLabel: u.designation || 'Admin Organization',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch admin users', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAdmins();
    }
  }, [isOpen]); // Safe trigger once when dialog opens

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formId || !adminId || !publicSlug.trim()) {
      setError(
        "Form Template, Admin Organization, and Public Slug are required.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/custom-forms/assign-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          adminId,
          publicSlug: publicSlug.trim(),
          isActive,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onAssigned();
        onClose();
      } else {
        setError(json.error || "Failed to assign form to admin");
      }
    } catch (err: any) {
      setError(err.message || "Error communicating with server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-lg z-10 border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-2xl flex-shrink-0">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-600" />
              <span>Assign Form to Admin Organization</span>
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 pb-28 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Form */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Form Template *
              </label>
              <select
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {forms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} (v{f.version}) - {f.fields.length} fields
                  </option>
                ))}
              </select>
            </div>

            {/* Select Admin */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Admin Organization *
              </label>
              <SearchableSelect
                placeholder="Search Admin organization..."
                options={adminOptions}
                value={adminId}
                onChange={setAdminId}
                onSearchChange={fetchAdmins}
              />
            </div>

            {/* Custom Public URL Slug */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Public URL Slug *
              </label>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
                <span className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-r border-slate-200">
                  /forms/
                </span>
                <input
                  type="text"
                  required
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value)}
                  placeholder="apex-luxury-leads"
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Public Link:{" "}
                <span className="text-purple-600 font-medium">
                  https://yourdomain.com/forms/{publicSlug || ":slug"}
                </span>
              </p>
            </div>

            {/* Toggle Active */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <span>Activate Immediately (Public URL Live)</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm transition"
              >
                {isSubmitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
