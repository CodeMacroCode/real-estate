"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Receipt,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  Eye,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll only when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow || "unset";
    };
  }, [isOpen]);

  if (!isOpen || !appointment) return null;

  // Handles direct file upload to backend disk server
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!invoiceName || invoiceName.startsWith("Invoice - ")) {
      setInvoiceName(file.name.replace(/\.[^/.]+$/, ""));
    }

    // Direct upload via FormData to /api/upload
    setIsUploading(true);
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
      toast.success("File uploaded to server successfully!");
    } catch (err: any) {
      toast.error(err.message || "File upload failed");
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceUrl.trim()) {
      toast.error("Please select or upload an invoice file");
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

      toast.success("Invoice saved successfully!");
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

  // Helper to choose file icon based on url or extension
  const getFileIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.endsWith(".pdf")) return <FileText className="size-5 text-rose-500" />;
    if (lower.endsWith(".doc") || lower.endsWith(".docx"))
      return <File className="size-5 text-blue-500" />;
    return <ImageIcon className="size-5 text-emerald-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-lg max-h-[90vh] flex flex-col z-10 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header (Pinned) */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md">
              <Receipt className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Invoice & Billing Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm invoice receipt for {appointment.clientName}
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

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Existing Active Invoice Badge */}
            {appointment.invoiceUrl && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/90 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold truncate mr-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {appointment.invoiceName || "Signed Invoice File"}
                    </span>
                  </div>
                  <a
                    href={appointment.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-100/70 border border-emerald-300 shadow-2xs hover:shadow-xs transition shrink-0"
                  >
                    <Eye className="size-3.5 text-emerald-600" />
                    <span>Preview</span>
                    <ExternalLink className="size-3 text-emerald-500" />
                  </a>
                </div>

                {/* If the current invoice file is an image, display a clean highlighted preview thumbnail */}
                {/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(appointment.invoiceUrl) && (
                  <div className="relative rounded-lg overflow-hidden border border-emerald-200/80 bg-white shadow-2xs group flex items-center justify-center p-1">
                    <a
                      href={appointment.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block relative overflow-hidden max-h-36 w-full cursor-pointer text-center"
                    >
                      <img
                        src={appointment.invoiceUrl}
                        alt="Invoice preview"
                        className="mx-auto h-36 w-full object-contain bg-slate-900/5 rounded group-hover:scale-[1.02] transition duration-200"
                      />
                      <div className="absolute inset-0 bg-slate-900/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px] rounded">
                        <Eye className="size-4" />
                        <span>Click to view full image</span>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Invoice Description / Name */}
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

            {/* Direct File Server Upload Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upload Invoice File (PDF, Images, DOC) *
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition ${
                  invoiceUrl
                    ? "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70"
                    : "border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-3 gap-2">
                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                    <span className="text-xs text-slate-600 font-medium">
                      Uploading file to server...
                    </span>
                  </div>
                ) : invoiceUrl ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                        {getFileIcon(invoiceUrl)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {selectedFile?.name || invoiceName || "Invoice File Ready"}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          ✓ File ready on server
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800">
                      Click to choose or drag invoice file
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Supported: JPG, JPEG, PNG, PDF, DOC, DOCX (Max 25MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Footer (Pinned at bottom) */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
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
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading || !invoiceUrl}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? "Saving..." : "Save Invoice"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
