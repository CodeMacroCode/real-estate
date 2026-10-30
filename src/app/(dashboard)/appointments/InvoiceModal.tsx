"use client";

import React, { useState } from "react";
import {
  X,
  Receipt,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    _id: string;
    clientName: string;
    invoiceUrl?: string;
    invoiceName?: string;
    invoiceUploadedAt?: string;
  } | null;
  onSuccess: () => void;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: InvoiceModalProps) {
  const [invoiceUrl, setInvoiceUrl] = useState(appointment?.invoiceUrl || "");
  const [invoiceName, setInvoiceName] = useState(
    appointment?.invoiceName ||
      `Invoice - ${appointment?.clientName || "Client"}`,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceUrl.trim()) {
      toast.error("Please provide invoice file URL");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceUrl: invoiceUrl.trim(),
          invoiceName: invoiceName.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.message || json.error || "Failed to update invoice",
        );

      toast.success("Invoice uploaded / saved successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this invoice receipt?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceUrl: "",
          invoiceName: "",
        }),
      });

      if (!res.ok) throw new Error("Failed to delete invoice");
      toast.success("Invoice removed");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-md z-10 border border-slate-200 overflow-hidden">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md">
                <Receipt className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Invoice & Billing Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deal Won invoice receipt for {appointment.clientName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            {appointment.invoiceUrl && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold truncate mr-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    {appointment.invoiceName || "Signed Invoice PDF"}
                  </span>
                </div>
                <a
                  href={appointment.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold shrink-0"
                >
                  <span>Preview</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Name / Description *
              </label>
              <input
                type="text"
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice File URL (PDF / Receipt Image) *
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={invoiceUrl}
                onChange={(e) => setInvoiceUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {appointment.invoiceUrl ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Invoice</span>
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Invoice"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
