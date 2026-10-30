"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Send,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { SiGoogleads } from "react-icons/si";

interface GoogleAdsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  webhookUrl: string;
  webhookKey: string;
  activeFormName?: string | null;
  onRegenerateKey?: () => Promise<void>;
  onSendTestLead: () => Promise<void>;
}

export function GoogleAdsModal({
  isOpen,
  onOpenChange,
  webhookUrl,
  webhookKey,
  activeFormName,
  onRegenerateKey,
  onSendTestLead,
}: GoogleAdsModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    toast.success("Branch Webhook URL copied to clipboard");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(webhookKey);
    setCopiedKey(true);
    toast.success("Webhook Key copied to clipboard");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTest = async () => {
    setIsSendingTest(true);
    try {
      await onSendTestLead();
      toast.success("Mock test lead successfully dispatched to your pipeline!");
    } catch {
      toast.error("Failed to simulate test lead");
    } finally {
      setIsSendingTest(false);
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
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md flex-shrink-0">
            <SiGoogleads className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Google Ads Lead Form Integration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Automatically create leads under your branch when prospects submit Google Ads Lead Forms.
            </p>
          </div>
        </div>

        {/* Warning Banner: Custom Form Assigned Status */}
        {activeFormName ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 mb-5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Sparkles className="size-4 text-blue-600" />
              <span>Assigned Custom Form: {activeFormName}</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Inbound Google Ads leads will be mapped according to this form schema.
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
          {/* Admin Webhook URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                YOUR ADMIN WEBHOOK URL
              </label>
              <span className="text-[11px] text-slate-400">
                Paste this in Google Ads Campaign settings
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
                onClick={handleCopyUrl}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0"
                title="Copy URL"
              >
                {copiedUrl ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Webhook Key (GOOGLE_KEY) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                WEBHOOK KEY (GOOGLE_KEY)
              </label>
              <span className="text-[11px] text-slate-400">
                Security verification key
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookKey}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyKey}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0"
                title="Copy Key"
              >
                {copiedKey ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Test Integration Instantly Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Test Integration Instantly</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Send a mock Google Ads lead to test your branch form mapping right now.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTest}
              disabled={isSendingTest}
              className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <Send className="size-3.5" />
              <span>{isSendingTest ? "Sending Test..." : "Send Test Lead"}</span>
            </button>
          </div>

          {/* How to Configure in Google Ads (4 Simple Steps) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-3">
              <Info className="size-3.5 text-blue-600" />
              <span>HOW TO CONFIGURE IN GOOGLE ADS (4 SIMPLE STEPS)</span>
            </div>

            <ol className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Log in to <strong>Google Ads</strong> &rarr; Navigate to <strong>Ads & Assets</strong> &rarr; <strong>Assets</strong> &rarr; <strong>Lead Form</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Scroll to <strong>&quot;Export leads from Google Ads&quot;</strong> and select <strong>&quot;Other data integration options (Webhook)&quot;</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Paste your <strong>Webhook URL</strong> and <strong>Webhook Key</strong> from the fields above.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center size-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  Click <strong>&quot;Send Test Data&quot;</strong> in Google Ads. Google will verify the webhook, and your test lead will immediately appear in your <strong>Leads List</strong> with source tag <strong>&quot;google&quot;</strong>!
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
