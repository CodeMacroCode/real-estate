import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { AdminSocialSettings } from "@/models/AdminSocialSettings";
import { Lead } from "@/models/Lead";
import GoogleCalendarConfig from "@/models/GoogleCalendarConfig.model";
import MetaConnection from "@/models/MetaConnection.model";
import GoogleAdsConfig from "@/models/GoogleAdsConfig.model";
import { FormAdminAssignment } from "@/models/CustomForm";

export interface AdminSocialSettingsPayload {
  settings: any;
  leadCounts: {
    meta: number;
    googleAds: number;
    linkedIn: number;
    calendar: number;
  };
  adminId: string;
}

export async function getAdminSocialSettingsData(
  targetAdminId: mongoose.Types.ObjectId,
): Promise<AdminSocialSettingsPayload> {
  await connectToDatabase();

  let settings: any = await AdminSocialSettings.findOne({
    adminId: targetAdminId,
  }).lean();

  if (!settings) {
    const initialKey = `gads_${crypto.randomBytes(16).toString("hex")}`;
    const created = await AdminSocialSettings.create({
      adminId: targetAdminId,
      meta: { isActive: false, leadGenFormIds: [] },
      linkedIn: { isActive: false },
      googleAds: { isActive: false, webhookSecretKey: initialKey },
      googleCalendar: { isConnected: false },
    });
    settings = created.toObject();
  }

  const [gcalConfig, metaConn, gadsConfig]: [any, any, any] = await Promise.all([
    GoogleCalendarConfig.findOne({ adminId: targetAdminId }).lean(),
    MetaConnection.findOne({ adminId: targetAdminId }).lean(),
    GoogleAdsConfig.findOne({ adminId: targetAdminId }).lean(),
  ]);

  const isCalendarConnected = Boolean(
    settings?.googleCalendar?.isConnected || gcalConfig?.isConnected,
  );
  const calendarEmail =
    settings?.googleCalendar?.connectedEmail ||
    settings?.googleCalendar?.calendarEmail ||
    gcalConfig?.accountEmail ||
    "";

  const isMetaActive = Boolean(
    settings?.meta?.isActive || metaConn?.isConnected,
  );

  const isGoogleAdsActive = Boolean(
    settings?.googleAds?.isActive || gadsConfig?.isConnected,
  );

  if (settings) {
    settings.googleCalendar = {
      ...settings.googleCalendar,
      isConnected: isCalendarConnected,
      connectedEmail: calendarEmail,
      calendarEmail,
      clientId: settings?.googleCalendar?.clientId || gcalConfig?.clientId || "",
    };

    settings.meta = {
      ...settings.meta,
      isActive: isMetaActive,
      pageId: settings?.meta?.pageId || metaConn?.pageId || "",
      pageName: settings?.meta?.pageName || metaConn?.pageName || "",
      pageAccessToken:
        settings?.meta?.pageAccessToken || metaConn?.pageToken || "",
    };

    settings.googleAds = {
      ...settings.googleAds,
      isActive: isGoogleAdsActive,
      webhookSecretKey:
        settings?.googleAds?.webhookSecretKey || gadsConfig?.webhookKey || "",
      customerId:
        settings?.googleAds?.customerId || gadsConfig?.customerId || "",
    };
  }

  const [metaLeads, googleLeads, linkedInLeads] = await Promise.all([
    Lead.countDocuments({ adminId: targetAdminId, source: "Meta" }),
    Lead.countDocuments({ adminId: targetAdminId, source: "GoogleAds" }),
    Lead.countDocuments({ adminId: targetAdminId, source: "LinkedIn" }),
  ]);

  return {
    settings,
    leadCounts: {
      meta: metaLeads,
      googleAds: googleLeads,
      linkedIn: linkedInLeads,
      calendar: isCalendarConnected ? 1 : 0,
    },
    adminId: targetAdminId.toString(),
  };
}

export async function getAdminSocialMediaInitialProps(
  adminId: string,
  baseUrl: string,
) {
  const targetAdminId = new mongoose.Types.ObjectId(adminId);
  const basePayload = await getAdminSocialSettingsData(targetAdminId);

  let gadsConfig: any = await GoogleAdsConfig.findOne({
    adminId: targetAdminId,
  }).lean();
  if (!gadsConfig) {
    const webhookKey = crypto.randomBytes(16).toString("hex");
    const created = await GoogleAdsConfig.create({
      adminId: targetAdminId,
      webhookKey,
      isConnected: false,
    });
    gadsConfig = created.toObject();
  }

  const assignment: any = await FormAdminAssignment.findOne({
    adminId: targetAdminId,
    isActive: true,
  })
    .populate("formId", "name")
    .lean();

  const isGoogleAdsActive =
    basePayload.settings?.googleAds?.isActive !== undefined
      ? Boolean(basePayload.settings.googleAds.isActive)
      : Boolean(gadsConfig?.isConnected);

  return {
    adminId,
    settings: JSON.parse(JSON.stringify(basePayload.settings || {})),
    leadCounts: basePayload.leadCounts,
    googleAdsConfig: {
      isActive: isGoogleAdsActive,
      webhookKey: gadsConfig?.webhookKey || "",
      webhookUrl: `${baseUrl.replace(/\/$/, "")}/api/google/webhook/${adminId}`,
      leadsIngestedCount: gadsConfig?.leadsIngestedCount || 0,
    },
    activeFormName: assignment?.formId?.name || null,
  };
}
