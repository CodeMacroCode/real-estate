"use client";

import React, { useState } from "react";
import { FormField } from "@/models/CustomForm";
import { CheckCircle2, AlertCircle, ArrowRight, Upload } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface PublicFormClientProps {
  fields: FormField[];
  publicSlug: string;
}

export function PublicFormClient({
  fields,
  publicSlug,
}: PublicFormClientProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (fieldId: string, val: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validation guard
    for (const field of fields) {
      if (field.required && !formData[field.id]) {
        setError(`Please fill in required field: ${field.label}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forms/submit/${publicSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formData }),
      });

      const json = await res.json();
      if (json.success) {
        setIsSuccess(true);
      } else {
        setError(json.error || "Failed to submit inquiry");
      }
    } catch (err: any) {
      setError(err.message || "Error submitting inquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Inquiry Received!</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Thank you for your interest. Your inquiry has been routed to our
          dedicated sales team, and an executive will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            {field.label}{" "}
            {field.required && <span className="text-rose-500">*</span>}
          </label>

          {field.type === "textarea" ? (
            <textarea
              rows={3}
              required={field.required}
              placeholder={field.placeholder || field.label}
              value={formData[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          ) : field.type === "select" ? (
            <select
              required={field.required}
              value={formData[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">Select option...</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : field.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={Boolean(formData[field.id])}
                onChange={(e) => handleChange(field.id, e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span>{field.placeholder || field.label}</span>
            </label>
          ) : field.type === "file" ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300">
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <span className="text-xs text-slate-500">
                Upload document (optional)
              </span>
            </div>
          ) : (
            <input
              type={field.type === "phone" ? "tel" : field.type}
              required={field.required}
              placeholder={field.placeholder || field.label}
              value={formData[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          )}
        </div>
      ))}

      <div className="pt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Submitting Your Inquiry...</span>
            </>
          ) : (
            <>
              <span>Submit Inquiry</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
