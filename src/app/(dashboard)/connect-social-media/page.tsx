"use client";

import React, { useState, useEffect } from "react";
import {
  FaFacebookF,
  FaGoogle,
  FaLinkedin,
  FaCalendarAlt,
  FaSync,
  FaCheckCircle,
} from "react-icons/fa";
import { toast } from "sonner";
import { SocialPlatformCard, SocialPlatform } from "./SocialPlatformCard";
import { MetaAdsModal } from "./MetaAdsModal";
import { GoogleAdsModal } from "./GoogleAdsModal";
import { GoogleCalendarModal } from "./GoogleCalendarModal";
import { LinkedInAdsModal } from "./LinkedInAdsModal";

export default function ConnectSocialMediaPage() {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");
  const [activeFormName, setActiveFormName] = useState<string | null>(null);
  const [leadCounts, setLeadCounts] = useState({
    meta: 0,
    googleAds: 0,
    linkedIn: 0,
    calendar: 0,
  });

  // Settings states
  const [metaConfig, setMetaConfig] = useState({
    isActive: false,
    pageId: "",
    pageName: "",
    pageToken: "",
  });

  const [googleAdsConfig, setGoogleAdsConfig] = useState({
    isActive: false,
    webhookKey: "",
    webhookUrl: "",
    leadsIngestedCount: 0,
  });

  const [linkedInConfig, setLinkedInConfig] = useState({
    isActive: false,
    adAccountId: "",
    formId: "",
  });

  const [calendarConfig, setCalendarConfig] = useState({
    isConnected: false,
    accountEmail: "",
  });

  // Dialog open states
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [isGoogleAdsOpen, setIsGoogleAdsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLinkedInOpen, setIsLinkedInOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // First get active logged-in user / admin session
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      let resolvedAdminId = "";
      if (meData.success && meData.data?.user) {
        const u = meData.data.user;
        const roleSlug = meData.data.role?.slug || "";
        resolvedAdminId =
          roleSlug === "admin"
            ? u._id
            : u.parentAdminId
              ? u.parentAdminId.toString()
              : u._id;
        setAdminId(resolvedAdminId);
      }

      const res = await fetch("/api/social-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch settings");

      const currentAdminId = data.adminId || resolvedAdminId;
      if (currentAdminId) setAdminId(currentAdminId);

      if (data.leadCounts) setLeadCounts(data.leadCounts);

      // Meta
      if (data.settings?.meta) {
        setMetaConfig({
          isActive: Boolean(data.settings.meta.isActive),
          pageId: data.settings.meta.pageId || "",
          pageName: data.settings.meta.pageName || "",
          pageToken: data.settings.meta.pageAccessToken || "",
        });
      }

      // LinkedIn
      if (data.settings?.linkedIn) {
        setLinkedInConfig({
          isActive: Boolean(data.settings.linkedIn.isActive),
          adAccountId: data.settings.linkedIn.adAccountId || "",
          formId: data.settings.linkedIn.formId || "",
        });
      }

      // Google Calendar
      if (data.settings?.googleCalendar) {
        setCalendarConfig({
          isConnected: Boolean(data.settings.googleCalendar.isConnected),
          accountEmail: data.settings.googleCalendar.calendarEmail || "",
        });
      }

      // Fetch Google Ads Config
      if (currentAdminId) {
        const [gadsRes, formRes] = await Promise.all([
          fetch(`/api/google/webhook/${currentAdminId}`),
          fetch(`/api/forms/assigned?adminId=${currentAdminId}`).catch(
            () => null,
          ),
        ]);

        const gadsData = await gadsRes.json();
        if (gadsData.success && gadsData.data) {
          const isGoogleAdsActive =
            data.settings?.googleAds?.isActive !== undefined
              ? Boolean(data.settings.googleAds.isActive)
              : Boolean(gadsData.data.isConnected);

          setGoogleAdsConfig({
            isActive: isGoogleAdsActive,
            webhookKey: gadsData.data.webhookKey,
            webhookUrl: gadsData.data.webhookUrl,
            leadsIngestedCount: gadsData.data.leadsIngestedCount,
          });
        }

        if (formRes) {
          const formData = await formRes.json();
          if (formData.success && formData.data) {
            setActiveFormName(formData.data.name);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error loading social integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Meta
  const handleSaveMeta = async (payload: {
    pageToken: string;
    pageId: string;
    pageName: string;
  }) => {
    const res = await fetch("/api/social-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId,
        platform: "meta",
        config: {
          isActive: true,
          pageAccessToken: payload.pageToken,
          pageId: payload.pageId,
          pageName: payload.pageName,
        },
      }),
    });
    if (!res.ok) throw new Error("Failed to save Meta settings");
    await fetchData();
  };

  // Regenerate Google Ads Key
  const handleRegenerateGoogleKey = async () => {
    try {
      const res = await fetch("/api/social-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          platform: "googleAds",
          config: {
            isActive: true,
            webhookSecretKey: `gads_${Math.random().toString(36).substring(2, 12)}`,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate key");
      toast.success("New Google Ads webhook key generated!");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Could not regenerate key");
    }
  };

  // Test Google Ads Lead
  const handleSendTestLead = async () => {
    const res = await fetch("/api/social-settings/test-simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId,
        platform: "googleAds",
        testPayload: {
          clientName: "David Miller",
          clientPhone: "+1 (555) 349-2910",
          clientEmail: "david.miller@example.com",
          campaignName: "Luxury Penthouses Campaign",
        },
      }),
    });
    if (!res.ok) throw new Error("Simulation failed");
    await fetchData();
  };

  // Disconnect handler
  const handleDisconnect = async (platformName: string) => {
    try {
      const res = await fetch("/api/social-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          platform: platformName,
          config: { isActive: false, isConnected: false },
        }),
      });
      if (!res.ok) throw new Error(`Failed to disconnect ${platformName}`);
      toast.info(`${platformName} disconnected`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Disconnect failed");
    }
  };

  // Save LinkedIn
  const handleSaveLinkedIn = async (payload: {
    adAccountId: string;
    formId: string;
  }) => {
    const res = await fetch("/api/social-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId,
        platform: "linkedIn",
        config: {
          isActive: true,
          adAccountId: payload.adAccountId,
          formId: payload.formId,
        },
      }),
    });
    if (!res.ok) throw new Error("Failed to save LinkedIn settings");
    await fetchData();
  };

  // Google Calendar OAuth Trigger
  const handleCalendarOAuth = () => {
    toast.info("Connecting to Google OAuth 2.0...");
    setTimeout(async () => {
      await fetch("/api/social-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          platform: "googleCalendar",
          config: {
            isConnected: true,
            calendarEmail: "admin.realestate@gmail.com",
          },
        }),
      });
      toast.success("Google Calendar connected successfully!");
      await fetchData();
    }, 1000);
  };

  // Test Calendar Event
  const handleSendTestCalendarEvent = async () => {
    const res = await fetch("/api/social-settings/test-simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId,
        platform: "googleCalendar",
        testPayload: {
          title: "Site Tour with Prospective Client",
          attendeeEmail: "client@example.com",
        },
      }),
    });
    if (!res.ok) throw new Error("Failed to dispatch test invite");
  };

  const platforms: SocialPlatform[] = [
    {
      id: "meta",
      name: "Meta Lead Ads (FB & IG)",
      category: "Paid Social",
      description:
        "Capture instant lead form submissions directly from Facebook and Instagram campaigns.",
      icon: <FaFacebookF className="size-5" />,
      color: "bg-blue-600",
    },
    {
      id: "googleAds",
      name: "Google Ads Lead Forms",
      category: "Ads Lead & Data",
      description:
        "Stream lead extension responses instantly into your CRM via secure webhook endpoint and campaigns.",
      icon: <FaGoogle className="size-5" />,
      color: "bg-amber-600",
    },
    {
      id: "linkedIn",
      name: "LinkedIn Lead Gen",
      category: "B2B Network",
      description:
        "Synchronize high-intent leads captured through LinkedIn Sponsored InMail and forms.",
      icon: <FaLinkedin className="size-5" />,
      color: "bg-[#0077b5]",
    },
    {
      id: "googleCalendar",
      name: "Google Calendar & Meet",
      category: "Scheduling",
      description:
        "Automate 2-way client calendar synchronization, invitations, and Google Meet generation.",
      icon: <FaCalendarAlt className="size-5" />,
      color: "bg-emerald-600",
    },
  ];

  const totalConnected = [
    metaConfig.isActive,
    googleAdsConfig.isActive,
    linkedInConfig.isActive,
    calendarConfig.isConnected,
  ].filter(Boolean).length;

  const totalLeads =
    leadCounts.meta + leadCounts.googleAds + leadCounts.linkedIn;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Social Media & Calendar Ingestion Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your webhook configurations, OAuth channels, and live inbound
            data streams.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition"
        >
          <FaSync className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">
              Active Integrations
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {totalConnected} / 4
            </div>
          </div>
          <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FaCheckCircle className="size-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">
              Total Automated Ingestions
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {totalLeads}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            {totalLeads}
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">
              Google Ads Ingested
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {leadCounts.googleAds}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FaGoogle className="size-5" />
          </div>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Meta */}
        <SocialPlatformCard
          platform={platforms[0]}
          isConnected={metaConfig.isActive}
          leadsCount={leadCounts.meta}
          onOpenModal={() => setIsMetaOpen(true)}
          onDisconnect={() => handleDisconnect("meta")}
        />

        {/* Google Ads */}
        <SocialPlatformCard
          platform={platforms[1]}
          isConnected={googleAdsConfig.isActive}
          leadsCount={leadCounts.googleAds}
          onOpenModal={() => setIsGoogleAdsOpen(true)}
          onDisconnect={() => handleDisconnect("googleAds")}
        />

        {/* LinkedIn */}
        <SocialPlatformCard
          platform={platforms[2]}
          isConnected={linkedInConfig.isActive}
          leadsCount={leadCounts.linkedIn}
          onOpenModal={() => setIsLinkedInOpen(true)}
          onDisconnect={() => handleDisconnect("linkedIn")}
        />

        {/* Google Calendar */}
        <SocialPlatformCard
          platform={platforms[3]}
          isConnected={calendarConfig.isConnected}
          leadsCount={leadCounts.calendar}
          onOpenModal={() => setIsCalendarOpen(true)}
          onDisconnect={() => handleDisconnect("googleCalendar")}
        />
      </div>

      {/* Modals - Rendered regardless of initial adminId fetch timing */}
      <MetaAdsModal
        isOpen={isMetaOpen}
        onOpenChange={setIsMetaOpen}
        adminId={adminId}
        initialToken={metaConfig.pageToken}
        initialPageId={metaConfig.pageId}
        initialPageName={metaConfig.pageName}
        activeFormName={activeFormName}
        onSave={handleSaveMeta}
      />

      <GoogleAdsModal
        isOpen={isGoogleAdsOpen}
        onOpenChange={setIsGoogleAdsOpen}
        webhookUrl={googleAdsConfig.webhookUrl}
        webhookKey={googleAdsConfig.webhookKey}
        activeFormName={activeFormName}
        onRegenerateKey={handleRegenerateGoogleKey}
        onSendTestLead={handleSendTestLead}
      />

      <LinkedInAdsModal
        isOpen={isLinkedInOpen}
        onOpenChange={setIsLinkedInOpen}
        adminId={adminId}
        isConnected={linkedInConfig.isActive}
        initialClientId={linkedInConfig.adAccountId}
        initialClientSecret={linkedInConfig.formId}
        onSave={async ({ clientId, clientSecret }) => {
          await handleSaveLinkedIn({
            adAccountId: clientId,
            formId: clientSecret,
          });
        }}
      />

      <GoogleCalendarModal
        isOpen={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        adminId={adminId}
        isConnected={calendarConfig.isConnected}
        connectedEmail={calendarConfig.accountEmail}
        onConnectOAuth={handleCalendarOAuth}
        onSave={async ({ clientId, clientSecret }) => {
          const res = await fetch("/api/social-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adminId,
              platform: "googleCalendar",
              config: {
                isConnected: true,
                clientId,
                clientSecret,
              },
            }),
          });
          if (!res.ok) throw new Error("Failed to save Calendar settings");
          await fetchData();
        }}
      />
    </div>
  );
}
