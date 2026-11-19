"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Layers,
  Calendar,
  PenTool,
  Clock,
  Send,
  Building2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AccountsConnectModal, SUPPORTED_PLATFORMS } from "./components/AccountsConnectModal";
import { CreateAndPostSection } from "./components/CreateAndPostSection";
import { ScheduleManagementSection } from "./components/ScheduleManagementSection";
import { SocialPlatform } from "@/models/SocialPublisher";

export interface ConnectedAccountItem {
  _id: string;
  platform: SocialPlatform;
  accountType: string;
  accountId: string;
  accountName: string;
  accountAvatar?: string;
  accountHandle?: string;
  isActive: boolean;
  createdAt: string;
}

interface ContentSocialMediaClientProps {
  initialAccounts: ConnectedAccountItem[];
  currentUser: {
    _id: string;
    name: string;
    roleSlug: string;
  };
}

export function ContentSocialMediaClient({
  initialAccounts,
  currentUser,
}: ContentSocialMediaClientProps) {
  const [activeTab, setActiveTab] = useState<"link" | "compose" | "schedule">("link");
  const [accounts, setAccounts] = useState<ConnectedAccountItem[]>(initialAccounts);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch updated accounts list
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/social-publisher/accounts");
      const json = await res.json();
      if (res.ok && json.data) {
        setAccounts(json.data);
      }
    } catch (err: any) {
      toast.error("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect an account
  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect "${name}"?`)) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/social-publisher/accounts/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to disconnect account");

      toast.success(`Account "${name}" disconnected successfully`);
      setAccounts((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
              Real Estate Marketing Hub
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              • Dedicated Content & Video Publisher
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Social Media Content Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Connect your agency channels, schedule property videos &amp; carousel photos, and blast listings across Facebook, Instagram, LinkedIn, YouTube, and Telegram.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Connect Channel</span>
          </button>
        </div>
      </div>

      {/* 3 Core Section Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("link")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "link"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Share2 className="size-4" />
          <span>Section 1: Social Media Link</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-700 font-mono">
            {accounts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "compose"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PenTool className="size-4" />
          <span>Section 2: Create &amp; Post</span>
          <span className="text-[10px] text-slate-400 font-normal">(Photos &amp; Videos)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "schedule"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="size-4" />
          <span>Section 3: Schedule Management</span>
          <span className="text-[10px] text-slate-400 font-normal">(Calendar &amp; Edit)</span>
        </button>
      </div>

      {/* Tab 1: Social Media Link (Channel Connection Hub) */}
      {activeTab === "link" && (
        <div className="space-y-6">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Share2 className="size-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{accounts.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Active Connected Channels</div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">8 Platforms</div>
                <div className="text-[11px] text-slate-500 font-medium">Supported Multi-Network Hub</div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">Isolated &amp; Secure</div>
                <div className="text-[11px] text-slate-500 font-medium">Zero Collision with CRM Leads</div>
              </div>
            </div>
          </div>

          {/* Connected Accounts Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Connected Publishing Channels</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Channels currently authorized to receive property video tours, photo drops, and scheduled marketing updates.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAccounts}
                disabled={isLoading}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Refresh channels"
              >
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="p-3 bg-white border border-slate-200 rounded-full w-fit mx-auto text-indigo-600 shadow-xs">
                  <Share2 className="size-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Social Media Channels Linked Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click the button below to link your Facebook Page, Instagram Professional, Telegram Channel, or LinkedIn to start broadcasting.
                </p>
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Connect Your First Channel</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => {
                  const cfg = SUPPORTED_PLATFORMS.find((p) => p.id === account.platform);
                  const Icon = cfg?.icon || Share2;

                  return (
                    <div
                      key={account._id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-slate-50 border border-slate-100 ${cfg?.color || "text-indigo-600"}`}>
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                              {account.accountName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {account.accountHandle || `@${account.platform}`}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="capitalize font-medium text-slate-600">
                          {account.accountType} &bull; {account.platform}
                        </span>

                        <button
                          type="button"
                          disabled={deletingId === account._id}
                          onClick={() => handleDisconnect(account._id, account.accountName)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="size-3" />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Create & Post */}
      {activeTab === "compose" && (
        <CreateAndPostSection
          accounts={accounts}
          onPostCreated={() => {
            setActiveTab("schedule");
          }}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
        />
      )}

      {/* Tab 3: Schedule Management */}
      {activeTab === "schedule" && (
        <ScheduleManagementSection
          accounts={accounts}
          onOpenCreatePost={() => setActiveTab("compose")}
        />
      )}

      {/* Channel Connection Modal */}
      <AccountsConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onAccountLinked={fetchAccounts}
      />
    </div>
  );
}
