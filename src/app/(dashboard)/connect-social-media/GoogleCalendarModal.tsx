"use client";

import React, { useState } from "react";
import { X, Sparkles, Calendar, ExternalLink, Loader2, Info } from "lucide-react";
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
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  const handleLaunchGoogleOAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Please enter both Google Client ID and Client Secret first.");
      return;
    }

    setIsRedirecting(true);
    try {
      // 1. Save / persist credentials
      if (onSave) {
        await onSave({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
      }

      // 2. Request authenticated Google OAuth consent URL from backend
      const res = await fetch(
        `/api/google-calendar/auth?adminId=${encodeURIComponent(adminId)}&clientId=${encodeURIComponent(clientId.trim())}&clientSecret=${encodeURIComponent(clientSecret.trim())}`,
      );
      const data = await res.json();
      if (!res.ok || !data.data?.url) {
        throw new Error(data.message || data.error || "Failed to initialize Google OAuth login flow");
      }

      toast.loading("Redirecting to Google OAuth Authorization...");
      // 3. Redirect user browser to Google OAuth consent screen
      window.location.href = data.data.url;
    } catch (err: any) {
      toast.error(err.message || "Could not launch Google authentication");
      setIsRedirecting(false);
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
                Google Calendar &amp; Meet
              </h3>
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {isConnected ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure OAuth 2.0 to sync meetings, appointments, and generate Google Meet rooms.
            </p>
            {connectedEmail && isConnected && (
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                Connected account: {connectedEmail}
              </p>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLaunchGoogleOAuth} className="space-y-4">
          {/* Card: OAuth 2.0 Credentials */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-md bg-blue-600 text-white flex-shrink-0 mt-0.5">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Google OAuth 2.0 Credentials</h4>
                <p className="text-[11px] text-slate-500">
                  Enter your Google Cloud Console Client ID and Secret to grant calendar access.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Client ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789-...apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono placeholder:text-slate-400 placeholder:italic"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Client Secret *
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

              <div className="p-2.5 bg-blue-100/50 rounded-lg border border-blue-200/60 text-[11px] text-blue-900 flex items-start gap-1.5">
                <Info className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Authorized redirect URI in Google Cloud Console:</strong>
                  <br />
                  <code className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono select-all">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/google-calendar/oauth2callback`
                      : "https://.../api/google-calendar/oauth2callback"}
                  </code>
                </span>
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
              disabled={isRedirecting || !clientId.trim() || !clientSecret.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Redirecting to Google...</span>
                </>
              ) : (
                <>
                  <FaGoogle className="size-3.5" />
                  <span>Authorize with Google</span>
                  <ExternalLink className="size-3 text-blue-200" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
