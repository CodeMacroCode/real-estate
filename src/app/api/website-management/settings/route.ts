import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import {
  IWebsiteSeoSettings,
  WebsiteSetting,
} from "@/models/WebsiteSetting";
import {
  getWebsiteSettingsByAdminId,
  upsertWebsiteSettings,
} from "@/services/websiteSettingService";

export const dynamic = "force-dynamic";

const DEFAULT_SEO: IWebsiteSeoSettings = {
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  ogImageUrl: "",
  faviconUrl: "",
  googleSiteVerification: "",
  robotsIndex: true,
  pages: {
    propertiesTitle: "",
    propertiesDescription: "",
    projectsTitle: "",
    projectsDescription: "",
    contactTitle: "",
    contactDescription: "",
  },
};

function normalizeSeo(raw?: Partial<IWebsiteSeoSettings> | null): IWebsiteSeoSettings {
  return {
    metaTitle: typeof raw?.metaTitle === "string" ? raw.metaTitle.trim() : "",
    metaDescription:
      typeof raw?.metaDescription === "string" ? raw.metaDescription.trim() : "",
    keywords: typeof raw?.keywords === "string" ? raw.keywords.trim() : "",
    ogImageUrl: typeof raw?.ogImageUrl === "string" ? raw.ogImageUrl.trim() : "",
    faviconUrl: typeof raw?.faviconUrl === "string" ? raw.faviconUrl.trim() : "",
    googleSiteVerification:
      typeof raw?.googleSiteVerification === "string"
        ? raw.googleSiteVerification.trim()
        : "",
    robotsIndex: raw?.robotsIndex !== undefined ? Boolean(raw.robotsIndex) : true,
    pages: {
      propertiesTitle:
        typeof raw?.pages?.propertiesTitle === "string"
          ? raw.pages.propertiesTitle.trim()
          : "",
      propertiesDescription:
        typeof raw?.pages?.propertiesDescription === "string"
          ? raw.pages.propertiesDescription.trim()
          : "",
      projectsTitle:
        typeof raw?.pages?.projectsTitle === "string"
          ? raw.pages.projectsTitle.trim()
          : "",
      projectsDescription:
        typeof raw?.pages?.projectsDescription === "string"
          ? raw.pages.projectsDescription.trim()
          : "",
      contactTitle:
        typeof raw?.pages?.contactTitle === "string"
          ? raw.pages.contactTitle.trim()
          : "",
      contactDescription:
        typeof raw?.pages?.contactDescription === "string"
          ? raw.pages.contactDescription.trim()
          : "",
    },
  };
}

function withSeoDefaults<T extends Record<string, any>>(settings: T): T & { seo: IWebsiteSeoSettings } {
  return {
    ...settings,
    seo: normalizeSeo(settings?.seo ?? DEFAULT_SEO),
  };
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedAdminId = searchParams.get("adminId");

    // SuperAdmin can query any admin's settings; Admin queries requested or their own
    let targetAdminId = authContext.user._id.toString();
    if (
      requestedAdminId &&
      (authContext.role.slug === "super_admin" || authContext.role.slug === "admin")
    ) {
      targetAdminId = requestedAdminId;
    }

    const settings = await getWebsiteSettingsByAdminId(targetAdminId);
    return NextResponse.json({ success: true, data: withSeoDefaults(settings) });
  } catch (error: any) {
    console.error("GET /api/website-management/settings Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch website settings",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(request);
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const requestedAdminId = searchParams.get("adminId");

    // Resolve target admin ID from session or requested admin query
    let targetAdminId = requestedAdminId || authContext?.user?._id?.toString();

    if (!targetAdminId && !authContext) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing administrative session" },
        { status: 401 },
      );
    }

    if (!targetAdminId) {
      targetAdminId = authContext?.user?._id?.toString();
    }

    let updated = await upsertWebsiteSettings(targetAdminId!, body);

    if (body?.seo && typeof body.seo === "object") {
      await connectToDatabase();
      updated = await WebsiteSetting.findOneAndUpdate(
        { adminId: new mongoose.Types.ObjectId(targetAdminId!) },
        { $set: { seo: normalizeSeo(body.seo) } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();
    }

    return NextResponse.json({
      success: true,
      data: withSeoDefaults(updated || {}),
    });
  } catch (error: any) {
    console.error("PUT /api/website-management/settings Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update website settings",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const requestedAdminId = searchParams.get("adminId");

    let targetAdminId = authContext.user._id.toString();
    if (
      requestedAdminId &&
      (authContext.role.slug === "super_admin" ||
        authContext.role.slug === "super-admin" ||
        authContext.role.slug === "admin")
    ) {
      targetAdminId = requestedAdminId;
    }

    const allowedSections = [
      "branding",
      "hero",
      "contact",
      "socialLinks",
      "theme",
      "regulatory",
      "footer",
    ] as const;

    const updateFields: Record<string, any> = {};
    for (const section of allowedSections) {
      if (body?.[section] !== undefined) {
        updateFields[section] = body[section];
      }
    }
    if (body?.seo && typeof body.seo === "object") {
      updateFields.seo = normalizeSeo(body.seo);
    }

    await connectToDatabase();
    const updated = await WebsiteSetting.findOneAndUpdate(
      { adminId: new mongoose.Types.ObjectId(targetAdminId) },
      { $set: updateFields },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json({
      success: true,
      data: withSeoDefaults(updated || {}),
    });
  } catch (error: any) {
    console.error("PATCH /api/website-management/settings Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update website settings",
      },
      { status: 500 },
    );
  }
}
