"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "motion/react";
import { X, Building, ShieldCheck } from "lucide-react";

interface PropertyInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    title: string;
    propertyId: string;
    location?: { city?: string; address?: string };
  } | null;
  adminId?: string;
}

export function PropertyInquiryModal({
  isOpen,
  onClose,
  property,
  adminId,
}: PropertyInquiryModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Please provide your Full Name and Mobile Number.",
        confirmButtonColor: "#0e3b2e",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminId || undefined,
          propertyId: property.id,
          inquiryType: "Property",
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          message: formData.message.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit inquiry");
      }

      onClose();
      setFormData({ name: "", phone: "", email: "", message: "" });

      Swal.fire({
        icon: "success",
        title: "Inquiry Dispatched",
        html: `
          <div style="font-size: 13px; color: #1d2a24; text-align: left; padding: 6px;">
            <p><strong>Property:</strong> ${property.title} (${property.propertyId})</p>
            <p><strong>Visitor:</strong> ${formData.name}</p>
            <p><strong>Contact:</strong> ${formData.phone}</p>
            <p style="margin-top: 8px; color: #6b6a60;">The designated agency representative has been notified via CRM lead routing.</p>
          </div>
        `,
        confirmButtonColor: "#0e3b2e",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Submission Error",
        text: err.message || "Failed to submit inquiry",
        confirmButtonColor: "#0e3b2e",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && property && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0b2d22]/80 backdrop-grayscale-0"
          />

          {/* Panel spring scale 0.96 -> 1 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-lg bg-card-white border-2 border-ink-green shadow-hard-brass p-6 sm:p-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-brass block">
                  Official Buyer Dossier Inquiry
                </span>
                <h3 className="font-serif text-xl font-bold text-ink-green mt-1">
                  {property.title}
                </h3>
                <p className="text-xs text-muted-ink flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brass" strokeWidth={1.5} />
                  <span>ID: {property.propertyId} &bull; {property.location?.city || "Nagpur"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted-ink hover:text-ink border border-line hover:border-ink-green"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-ink mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rameshwar Deshmukh"
                  className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-ink mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit number"
                    className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-ink mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@domain.com"
                    className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-ink mb-1">
                  Site Visit &amp; Inquiries
                </label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="I would like to schedule a physical inspection and request the title verification pack..."
                  className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-ink hover:text-ink border border-line"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brass hover:bg-brass-hover text-paper text-xs font-bold uppercase tracking-wider border border-brass shadow-hard-green-sm disabled:opacity-50"
                >
                  {submitting ? "Transmitting..." : "Send Inspection Request"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
