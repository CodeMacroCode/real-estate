"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";
import { Mail, ShieldCheck } from "lucide-react";

interface ProjectDetailInquiryFormProps {
  projectId: string;
  projectName: string;
  projectCode?: string;
  adminId?: string;
}

export function ProjectDetailInquiryForm({
  projectId,
  projectName,
  projectCode,
  adminId,
}: ProjectDetailInquiryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          projectId,
          inquiryType: "Project",
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          message: formData.message.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit project inquiry");
      }

      setFormData({ name: "", phone: "", email: "", message: "" });
      Swal.fire({
        icon: "success",
        title: "Dossier Request Received",
        text: `Your inquiry for "${projectName}" has been registered with the developer desk.`,
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
    <div className="bg-card-white border-2 border-ink-green shadow-hard-brass p-6 sticky top-24">
      <div className="border-b border-line pb-4 mb-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brass block">
          04 &mdash; Developer Desk
        </span>
        <h3 className="font-serif text-lg font-bold text-ink-green mt-1">
          Request Project Dossier
        </h3>
        <p className="text-xs text-muted-ink mt-1">
          Receive floor layouts, sanction approvals, and payment milestone sheets.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
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

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
            Mobile Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="10-digit mobile"
            className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="rameshwar@example.com"
            className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink mb-1">
            Unit Requirements / Questions
          </label>
          <textarea
            rows={3}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Looking for 3 BHK unit options in Phase 1 with east facing entrance..."
            className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-brass hover:bg-brass-hover text-paper text-xs font-bold uppercase tracking-wider border border-brass shadow-hard-green-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Mail className="size-3.5" strokeWidth={1.5} />
          {submitting ? "Submitting..." : "Request Developer Dossier"}
        </button>

        <div className="pt-2 text-[10px] text-muted-ink flex items-center justify-center gap-1.5 border-t border-soft-line">
          <ShieldCheck className="size-3.5 text-brass" strokeWidth={1.5} />
          <span>RERA registered sales channel. Official partner.</span>
        </div>
      </form>
    </div>
  );
}
