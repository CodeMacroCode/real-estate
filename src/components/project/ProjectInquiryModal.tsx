"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";

interface ProjectInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    projectId: string;
    location?: { city?: string; address?: string };
  } | null;
  adminId?: string;
}

export function ProjectInquiryModal({
  isOpen,
  onClose,
  project,
  adminId,
}: ProjectInquiryModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Please provide your Full Name and Mobile Number.",
        confirmButtonColor: "#2563eb",
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
          projectId: project.id,
          inquiryType: "Project",
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

      // Close modal
      onClose();
      setFormData({ name: "", phone: "", email: "", message: "" });

      // Trigger Swal popup identical to properties
      Swal.fire({
        icon: "success",
        title: "Inquiry Registered Successfully!",
        html: `
          <div style="font-size: 14px; color: #475569; text-align: left; padding: 4px 8px;">
            <p><strong>Project:</strong> ${project.name} (${project.projectId})</p>
            <p><strong>Visitor:</strong> ${formData.name}</p>
            <p><strong>Mobile:</strong> ${formData.phone}</p>
            <div style="margin-top: 10px; padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
              ✓ Your inquiry is registered directly with the agency. An agent will contact you shortly with the brochure and unit availability.
            </div>
          </div>
        `,
        confirmButtonText: "Done",
        confirmButtonColor: "#2563eb",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.message || "Failed to submit inquiry. Please try again.",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with identical gradient style to Property modal */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Enquire Now</h3>
            <p className="text-xs text-blue-100 truncate max-w-xs">
              {project.name} ({project.projectId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number (10 digits) *
            </label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              placeholder="9876543210"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="rahul@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message or Specific Queries
            </label>
            <textarea
              rows={3}
              placeholder="I am interested in this project and would like to receive the brochure & floor plans..."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Send Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
