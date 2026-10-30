"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, X, ShieldAlert } from "lucide-react";

interface AdminImpactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  adminData: {
    adminId: string;
    adminName: string;
    formName: string;
    totalLeads: number;
    dynamicFormLeads: number;
    publicSlug?: string;
  } | null;
}

export function AdminImpactDialog({
  isOpen,
  onClose,
  onConfirmed,
  adminData,
}: AdminImpactDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen || !adminData) return null;

  const handleUnassign = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/custom-forms/unassign/${adminData.adminId}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json();
      if (json.success) {
        onConfirmed();
        onClose();
      } else {
        setError(json.error || "Failed to unassign form");
      }
    } catch (err: any) {
      setError(err.message || "Error communicating with server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmed = confirmText.trim().toLowerCase() === "unassign";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-md z-10 border border-rose-200 overflow-hidden">
          <div className="px-6 py-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-bold">
                Safety Impact & Unassign Warning
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-rose-100/50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to unassign{" "}
              <span className="font-bold text-slate-900">
                {adminData.formName}
              </span>{" "}
              from{" "}
              <span className="font-bold text-slate-900">
                {adminData.adminName}
              </span>
              .
            </p>

            {/* Metric impact card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Public Slug URL:</span>
                <span className="font-mono text-purple-700 font-semibold">
                  /forms/{adminData.publicSlug || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Inbound Leads Captured:</span>
                <span className="font-bold text-slate-900">
                  {adminData.dynamicFormLeads} Leads
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Org Leads:</span>
                <span className="font-semibold text-slate-700">
                  {adminData.totalLeads}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-normal flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Unassigning this form will immediately deactivate the public
                landing page. External ad campaigns directing to this URL will
                show a 404 until a new form is assigned.
              </span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type{" "}
                <span className="font-mono text-rose-600 font-bold">
                  unassign
                </span>{" "}
                to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="unassign"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isConfirmed || isSubmitting}
                onClick={handleUnassign}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-40 transition shadow-sm"
              >
                {isSubmitting ? "Unassigning..." : "Confirm Unassign"}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
