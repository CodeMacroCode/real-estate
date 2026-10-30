"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { toast } from "sonner";

interface LinkedInAdsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  isConnected: boolean;
  initialClientId?: string;
  initialClientSecret?: string;
  onSave?: (payload: { clientId: string; clientSecret: string }) => Promise<void>;
  onConnectOAuth?: () => void;
}

export function LinkedInAdsModal({
  isOpen,
  onOpenChange,
  adminId,
  isConnected,
  initialClientId = "",
  initialClientSecret = "",
  onSave,
  onConnectOAuth,
}: LinkedInAdsModalProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [clientSecret, setClientSecret] = useState(initialClientSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://lead.rocketsalestracker.com";
  const redirectUri = `${baseUrl}/api/linkedin/auth/callback`;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    toast.success("Authorized OAuth Redirect URI copied to clipboard");
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Please enter both LinkedIn Client ID and Client Secret");
      return;
    }
    setIsConnecting(true);
    try {
      if (onSave) {
        await onSave({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
      } else {
        const res = await fetch("/api/social-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminId,
            platform: "linkedIn",
            config: {
              isActive: true,
              adAccountId: clientId.trim(),
              formId: clientSecret.trim(),
            },
          }),
        });
        if (!res.ok) throw new Error("Failed to save LinkedIn credentials");
      }
      toast.success("LinkedIn Ad Account connected successfully!");
      if (onConnectOAuth) onConnectOAuth();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to connect LinkedIn");
    } finally {
      setIsConnecting(false);
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
      <div className="relative z-50 w-full max-w-xl my-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl transition-all">
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
          <div className="p-2.5 rounded-xl bg-[#0077b5] text-white shadow-md flex-shrink-0">
            <FaLinkedin className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                LinkedIn Ads Integration
              </h3>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {isConnected ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Connect your LinkedIn App using your own Client ID and Client Secret to capture leads in real-time.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConnect} className="space-y-4">
          {/* Box: Authorized OAuth Redirect URI */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Key className="size-3.5 text-blue-600" />
              <span>Authorized OAuth Redirect URI</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Add this exact Redirect URL inside your LinkedIn Developer Portal under <strong>Auth &gt; OAuth 2.0 settings &gt; Authorized redirect URLs</strong>:
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={redirectUri}
                className="w-full px-3 py-2 text-xs font-mono bg-blue-600 text-white rounded-lg focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyUri}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg flex items-center gap-1.5 transition flex-shrink-0"
              >
                {copiedUri ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Client ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                LinkedIn Client ID (App ID)
              </label>
              <span className="text-[11px] text-slate-400">Required</span>
            </div>
            <input
              type="text"
              placeholder="e.g. 77ludpkzdvow4t"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077b5] bg-white font-mono placeholder:text-slate-400"
              required
            />
          </div>

          {/* Client Secret */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                LinkedIn Client Secret
              </label>
              <span className="text-[11px] text-slate-400">Required</span>
            </div>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                placeholder="Enter your Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full px-3 py-2 pr-9 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077b5] bg-white font-mono placeholder:text-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Multi-Tenant Credentials Info Box */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <ShieldCheck className="size-4 text-blue-600 flex-shrink-0" />
              <span>Multi-Tenant Credentials</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Each account or branch connects using their own LinkedIn App credentials. After authorizing on LinkedIn, you will be automatically redirected back to your dashboard.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#004182] hover:bg-[#003366] rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              <FaLinkedin className="size-4" />
              <span>{isConnecting ? "Connecting..." : "Connect LinkedIn"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
