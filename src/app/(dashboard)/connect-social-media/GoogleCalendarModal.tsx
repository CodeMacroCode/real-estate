"use client";

import React, { useState } from "react";
import { X, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import { FaGoogle } from "react-icons/fa";

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  isConnected: boolean;
  connectedEmail?: string;
  initialClientId?: string;
  initialClientSecret?: string;
  onSave?: (payload: { clientId: string; clientSecret: string }) => Promise<void>;
  onConnectOAuth?: () => void;
}

export function GoogleCalendarModal({
  isOpen,
  onOpenChange,
  adminId,
  isConnected,
  connectedEmail,
  initialClientId = "",
  initialClientSecret = "",
  onSave,
  onConnectOAuth,
}: GoogleCalendarModalProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [clientSecret, setClientSecret] = useState(initialClientSecret);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Please enter both Client ID and Client Secret");
      return;
    }
    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
      } else {
        const res = await fetch("/api/social-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminId,
            platform: "googleCalendar",
            config: {
              clientId: clientId.trim(),
              clientSecret: clientSecret.trim(),
              isConnected: true,
            },
          }),
        });
        if (!res.ok) throw new Error("Failed to save Google Calendar credentials");
      }
      toast.success("Google Calendar connected successfully!");
      if (onConnectOAuth) onConnectOAuth();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to connect Google Calendar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog Content */}
      <div className="relative z-50 w-full max-w-lg my-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md flex-shrink-0">
            <Calendar className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                Google Calendar & Reminders
              </h3>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {isConnected ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure your Google Calendar API credentials to automatically sync reminders with clients and technicians.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card: OAuth 2.0 Credentials */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-md bg-blue-600 text-white flex-shrink-0 mt-0.5">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">OAuth 2.0 Credentials</h4>
                <p className="text-[11px] text-slate-500">
                  Enter your Google OAuth Client ID and Secret to authorize calendar sync.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 325371461884-...apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono placeholder:text-slate-400 placeholder:italic"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Secret *
                </label>
                <input
                  type="password"
                  placeholder="e.g. GOCSPX-..."
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono placeholder:text-slate-400 placeholder:italic"
                  required
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Calendar className="size-3.5" />
              <span>{isSubmitting ? "Connecting..." : "Connect Calendar"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
