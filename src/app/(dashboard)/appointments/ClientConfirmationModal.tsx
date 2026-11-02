"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  Loader2,
  File,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface ClientConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    _id: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    agenda?: string;
    meetingType?: string;
    meetingDate?: string;
    meetingLocation?: string;
    assignedSubRoleId?: { name?: string };
    leadId?: { _id: string; leadTitle?: string; clientAddress?: string };
  } | null;
  onSuccess: () => void;
}

export default function ClientConfirmationModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: ClientConfirmationModalProps) {
  const [outcome, setOutcome] = useState<"YES" | "NO" | "MAYBE">("YES");
  const [feedback, setFeedback] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [quotationAmount, setQuotationAmount] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [isInvoiceUploading, setIsInvoiceUploading] = useState(false);
  const invoiceFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleInvoiceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsInvoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Failed to upload file");
      }

      setInvoiceUrl(json.data.fileUrl);
      toast.success("Invoice uploaded to server!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsInvoiceUploading(false);
    }
  };
  const [siteAddress, setSiteAddress] = useState(
    appointment?.meetingLocation || appointment?.leadId?.clientAddress || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) {
      toast.error("Please choose a confirmation outcome");
      return;
    }

    if (outcome === "YES" && !deliveryDate) {
      toast.error("Please select an agreed delivery / site handover date");
      return;
    }

    if (outcome === "MAYBE" && !followUpDate) {
      toast.error("Please select a follow-up appointment date");
      return;
    }

    if (outcome === "NO" && !rejectionReason.trim()) {
      toast.error("Please provide the rejection or lost reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        appointmentId: appointment._id,
        clientConfirmation: outcome,
        clientFeedback: feedback.trim(),
        deliveryOrSiteAddress: siteAddress.trim(),
      };

      if (outcome === "YES") {
        payload.agreedDeliveryDate = deliveryDate;
        if (quotationAmount) payload.quotationAmount = Number(quotationAmount);
        if (quotationNumber) payload.quotationNumber = quotationNumber.trim();
        if (invoiceUrl) payload.invoiceUrl = invoiceUrl.trim();
      } else if (outcome === "MAYBE") {
        payload.followUpDate = followUpDate;
      } else if (outcome === "NO") {
        payload.rejectionReason = rejectionReason.trim();
      }

      const res = await fetch("/api/client-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || data.error || "Failed to record confirmation",
        );
      }

      toast.success(
        outcome === "YES"
          ? "Deal! Client graduated to CRM Directory."
          : outcome === "MAYBE"
            ? "Follow-up appointment chained successfully!"
            : "Appointment marked as Closed (Lost).",
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record confirmation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-xl z-10 border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
                <CheckCircle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Record Client Confirmation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm meeting outcome, log client decision, and graduate to
                  CRM.
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

          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto"
          >
            {/* Linked Appointment Summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {appointment.clientName}
                </span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  {appointment.meetingType || "Meeting"}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {appointment.clientPhone} •{" "}
                {appointment.clientEmail || "No email"}
              </p>
              {appointment.agenda && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Agenda:</span>{" "}
                  {appointment.agenda}
                </p>
              )}
            </div>

            {/* Outcome Selection Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Meeting Confirmation Outcome *
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setOutcome("YES")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                    outcome === "YES"
                      ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <CheckCircle
                    className={`size-5 ${
                      outcome === "YES" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span className="text-xs font-bold">YES</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcome("MAYBE")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                    outcome === "MAYBE"
                      ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 text-amber-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <HelpCircle
                    className={`size-5 ${
                      outcome === "MAYBE" ? "text-amber-600" : "text-slate-400"
                    }`}
                  />
                  <span className="text-xs font-bold">MAYBE (Follow-up)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcome("NO")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                    outcome === "NO"
                      ? "border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 text-rose-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <XCircle
                    className={`size-5 ${
                      outcome === "NO" ? "text-rose-600" : "text-slate-400"
                    }`}
                  />
                  <span className="text-xs font-bold">NO (Lost)</span>
                </button>
              </div>
            </div>

            {/* Outcome Dynamic Fields */}
            {outcome === "YES" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3 animate-in fade-in-50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Sparkles className="size-4 text-emerald-600" />
                  <span>Deal: Agreement & Financial Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Agreed Delivery / Handover Date *
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Final Quotation Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={quotationAmount}
                      onChange={(e) => setQuotationAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quotation / Agreement Ref No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. QT-2026-089"
                      value={quotationNumber}
                      onChange={(e) => setQuotationNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Invoice / Agreement File (PDF, Images, DOC)
                    </label>
                    <input
                      type="file"
                      ref={invoiceFileInputRef}
                      onChange={handleInvoiceFileUpload}
                      accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                    />
                    <div
                      onClick={() => invoiceFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer transition ${
                        invoiceUrl
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-slate-200 hover:border-emerald-400 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {isInvoiceUploading ? (
                        <div className="flex items-center justify-center gap-2 py-1">
                          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                          <span className="text-xs text-slate-600">Uploading to server...</span>
                        </div>
                      ) : invoiceUrl ? (
                        <div className="flex items-center justify-between gap-2 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs text-emerald-700 font-medium truncate">
                              ✓ File uploaded on server
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              invoiceFileInputRef.current?.click();
                            }}
                            className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 rounded"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-slate-500 hover:text-emerald-700">
                          <Upload className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Click to upload file (Max 25MB)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {outcome === "MAYBE" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3 animate-in fade-in-50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Clock className="size-4 text-amber-600" />
                  <span>Auto-Chain Follow-Up Appointment</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Follow-up Meeting Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    A chained next appointment will be created automatically and
                    assigned to the same executive.
                  </p>
                </div>
              </div>
            )}

            {outcome === "NO" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-3 animate-in fade-in-50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                  <XCircle className="size-4 text-rose-600" />
                  <span>Deal Lost / Rejection Details</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Reason for Rejection *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Budget out of range, Selected other developer..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    required
                  />
                </div>
              </div>
            )}

            {/* Common Feedback & Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Feedback & Meeting Notes
              </label>
              <textarea
                rows={2}
                placeholder="Key meeting takeaways, discussions, next expectations..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery / Site Address
              </label>
              <input
                type="text"
                placeholder="Site address or location"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="size-3.5" />
                <span>{isSubmitting ? "Saving..." : "Confirm & Save"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
