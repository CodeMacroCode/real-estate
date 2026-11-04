"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";

interface PropertyDetailInquiryFormProps {
  propertyId: string;
  propertyTitle: string;
  propertyCode: string;
}

export function PropertyDetailInquiryForm({
  propertyId,
  propertyTitle,
  propertyCode,
}: PropertyDetailInquiryFormProps) {
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
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
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

      setFormData({ name: "", phone: "", email: "", message: "" });

      Swal.fire({
        icon: "success",
        title: "Inquiry Registered Successfully!",
        html: `
          <div style="font-size: 14px; color: #475569; text-align: left; padding: 4px 8px;">
            <p><strong>Property:</strong> ${propertyTitle} (${propertyCode})</p>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Contact:</strong> ${formData.phone}</p>
            <div style="margin-top: 10px; padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
              ✓ Your inquiry is registered directly with the agency. An agent will contact you shortly.
            </div>
          </div>
        `,
        confirmButtonText: "Done",
        confirmButtonColor: "#4f46e5",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Submission Error",
        text: err.message || "Could not register inquiry. Please try again.",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Your Full Name *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Rahul Sharma"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Mobile Number (10 digits) *
        </label>
        <input
          type="tel"
          required
          pattern="[0-9]{10}"
          placeholder="9876543210"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Email Address (Optional)
        </label>
        <input
          type="email"
          placeholder="rahul@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Message or Queries
        </label>
        <textarea
          rows={3}
          placeholder="I am interested in this listing and would like to arrange a site visit..."
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm cursor-pointer disabled:opacity-50"
      >
        {submitting ? "Registering..." : "Send Inquiry / Book Visit"}
      </button>
    </form>
  );
}
