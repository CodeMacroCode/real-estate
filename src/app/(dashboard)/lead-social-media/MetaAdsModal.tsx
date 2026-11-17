"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { SiMeta } from "react-icons/si";

interface MetaAdsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  initialToken?: string;
  initialPageId?: string;
  initialPageName?: string;
  activeFormName?: string | null;
  onSave: (payload: { pageToken: string; pageId: string; pageName: string }) => Promise<void>;
}

export function MetaAdsModal({
  isOpen,
  onOpenChange,
  adminId,
  initialToken = "",
  initialPageId = "",
  initialPageName = "",
  activeFormName,
  onSave,
}: MetaAdsModalProps) {
  const [pageToken, setPageToken] = useState(initialToken);
  const [pageId, setPageId] = useState(initialPageId);
  const [pageName, setPageName] = useState(initialPageName);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://lead.rocketsalestracker.com";
  const safeAdminId = adminId || "";
  const webhookUrl = `${baseUrl}/api/meta/webhook?adminId=${safeAdminId}`;
  const verifyToken = "realestate_meta_leadgen_2026";
  const securityKey = safeAdminId ? `meta_sec_${safeAdminId.slice(-12)}` : "meta_sec_default";

  const handleCopy = (text: string, type: "url" | "token" | "secret") => {
    navigator.clipboard.writeText(text);
    if (type === "url") setCopiedUrl(true);
    if (type === "token") setCopiedToken(true);
    if (type === "secret") setCopiedSecret(true);
    toast.success("Copied to clipboard");
    setTimeout(() => {
      setCopiedUrl(false);
      setCopiedToken(false);
      setCopiedSecret(false);
    }, 2000);
  };

  const handleSave = async () => {
    if (!pageToken || !pageId) {
      toast.error("Please provide Page Access Token and Facebook Page ID");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ pageToken, pageId, pageName });
      toast.success("Meta Page Token and Settings saved successfully!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save Meta credentials");
    } finally {
      setIsSaving(false);
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
      <div className="relative z-50 w-full max-w-xl my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md flex-shrink-0">
            <SiMeta className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Meta Lead Ads Integration (Facebook & Instagram)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Automatically capture leads submitted on Facebook and Instagram Instant Forms.
            </p>
          </div>
        </div>

        {/* Warning Banner: Custom Form Assigned Status */}
        {activeFormName ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 mb-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Assigned Custom Form: {activeFormName}</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Inbound Meta leads will be mapped according to this form schema.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 mb-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="size-4 text-amber-600 flex-shrink-0" />
              <span>No Custom Form Assigned to this Admin</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Leads will still be captured with default contact details (Name, Phone, Email, City). Assign a Custom Form in Form Builder to enable dynamic field capture.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Box: Meta Page Access Token Configuration */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Key className="size-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Meta Page Access Token Configuration
                </h4>
                <p className="text-[11px] text-slate-500">
                  Required for Graph API to fetch full lead answers (name, phone, email) from incoming webhooks or Meta Lead Ads Testing Tool.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meta Page Access Token (PAGE_ACCESS_TOKEN)
                </label>
                <input
                  type="text"
                  placeholder="Paste Meta Page Access Token (starts with EAAB...)"
                  value={pageToken}
                  onChange={(e) => setPageToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono placeholder:text-slate-400 placeholder:italic"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Must have <span className="text-blue-600 font-mono">leads_retrieval</span> and <span className="text-blue-600 font-mono">pages_show_list</span> permissions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facebook Page ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1209256412262831"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. My Business Page"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Key className="size-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Meta Token"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Admin Webhook URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                YOUR ADMIN META WEBHOOK URL
              </label>
              <span className="text-[11px] text-slate-400">
                Callback URL for Meta Developer App or direct integrations
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(webhookUrl, "url")}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0"
              >
                {copiedUrl ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Verify Token & Webhook Security Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VERIFY TOKEN (HUB.VERIFY_TOKEN)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(verifyToken, "token")}
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0"
                >
                  {copiedToken ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WEBHOOK SECURITY KEY
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={securityKey}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(securityKey, "secret")}
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0"
                >
                  {copiedSecret ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* How Meta Lead Ads Work (4 Easy Steps) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-3">
              <Info className="size-3.5 text-blue-600" />
              <span>HOW META LEAD ADS WORK (4 EASY STEPS)</span>
            </div>

            <ol className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Copy your <strong>Admin Meta Webhook URL</strong> and <strong>Verify Token</strong> from above.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  In <strong>Meta for Developers</strong> &rarr; <strong>Webhooks</strong>, select <strong>Page</strong>, click <strong>Subscribe to this object</strong>, enter your Webhook URL and Verify Token, and subscribe to the <strong>leadgen</strong> event for your Page.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Generate a <strong>Page Access Token</strong> (with <span className="font-mono text-blue-600">leads_retrieval</span> and <span className="font-mono text-blue-600">pages_show_list</span> permissions) in Meta Graph API Explorer or Business Suite, paste it above with your <strong>Facebook Page ID</strong>, and click <strong>Save Meta Token</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  Test using the <strong>Meta Lead Ads Testing Tool</strong> or run your live Instant Form campaigns on Facebook and Instagram. Incoming leads will be retrieved via Graph API, mapped to your branch&apos;s custom form, and saved in your CRM with the source <strong>&quot;meta&quot;</strong>!
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
