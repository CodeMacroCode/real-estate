"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  DollarSign,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    _id: string;
    clientName: string;
    quotationTitle?: string;
    quotationAmount?: number;
    quotationUrl?: string;
  } | null;
  onSuccess: () => void;
}

const TEMPLATES = [
  {
    title: "Standard Residential Purchase Agreement",
    amount: 7500000,
    url: "https://example.com/proposals/std-res-agreement.pdf",
  },
  {
    title: "Luxury Villa Booking & Quotation",
    amount: 14500000,
    url: "https://example.com/proposals/luxury-villa-quotation.pdf",
  },
  {
    title: "Commercial Retail Lease Proposal",
    amount: 3200000,
    url: "https://example.com/proposals/commercial-lease-proposal.pdf",
  },
];

export default function QuotationModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: QuotationModalProps) {
  const [title, setTitle] = useState(appointment?.quotationTitle || "");
  const [amount, setAmount] = useState(
    appointment?.quotationAmount ? String(appointment.quotationAmount) : "",
  );
  const [url, setUrl] = useState(appointment?.quotationUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleApplyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setTitle(tpl.title);
    setAmount(String(tpl.amount));
    setUrl(tpl.url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter proposal/quotation title");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationTitle: title.trim(),
          quotationAmount: Number(amount) || 0,
          quotationUrl: url.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.message || json.error || "Failed to update quotation",
        );

      toast.success("Quotation / Proposal attached successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to detach this quotation?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationTitle: "",
          quotationAmount: 0,
          quotationUrl: "",
        }),
      });

      if (!res.ok) throw new Error("Failed to detach quotation");
      toast.success("Quotation detached");
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

        <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-lg z-10 border border-slate-200 overflow-hidden">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-md">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Quotation & Proposal Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach or swap proposal template for {appointment.clientName}
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
            {/* Template Presets */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <Sparkles className="size-3.5 text-violet-600" />
                <span>Pre-built Proposal Templates</span>
              </div>
              <div className="space-y-1.5">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 text-xs transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-violet-700">
                        {tpl.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Estimated: ₹{tpl.amount.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] text-violet-600 font-semibold uppercase">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quotation / Proposal Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 BHK Luxury Apartment Offer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 7500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposal PDF / Document URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {appointment.quotationTitle ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <Trash2 className="size-3.5" />
                  <span>Detach</span>
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Proposal"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
