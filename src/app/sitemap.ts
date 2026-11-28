import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import { resolveAdminByHostOrSlug } from "@/services/publicPortalService";
import { Property } from "@/models/Property";
import { Project } from "@/models/Project";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const rawHost =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const host = rawHost.split(",")[0].trim();
  const protoHeader = headersList.get("x-forwarded-proto");
  const protocol = protoHeader
    ? protoHeader.split(",")[0].trim()
    : host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";

  const baseUrl = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
        /\/+$/,
        "",
      );

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/portal-properties`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/portal-projects`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/portal-contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const normalizedHost = normalizeHostname(host);
  if (!normalizedHost || isPlatformHost(normalizedHost)) {
    return entries;
  }

  try {
    const tenant = await resolveAdminByHostOrSlug(normalizedHost);
    if (!tenant?.adminId || !mongoose.Types.ObjectId.isValid(tenant.adminId)) {
      return entries;
    }

    await connectToDatabase();
    const adminObjectId = new mongoose.Types.ObjectId(tenant.adminId);

    const [properties, projects] = await Promise.all([
      Property.find({
        adminId: adminObjectId,
        "publishing.publishOnWebsite": true,
        status: "Available",
      })
        .select("propertyId publishing.seo.slug updatedAt")
        .lean(),
      Project.find({
        adminId: adminObjectId,
        isPublishedOnWebsite: true,
      })
        .select("projectId seo.slug updatedAt")
        .lean(),
    ]);

    for (const prop of properties as any[]) {
      const slug = prop?.publishing?.seo?.slug || prop?.propertyId?.toLowerCase();
      if (!slug) continue;
      entries.push({
        url: `${baseUrl}/portal-properties/${encodeURIComponent(slug)}`,
        lastModified: prop.updatedAt ? new Date(prop.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const proj of projects as any[]) {
      const slug = proj?.seo?.slug || proj?.projectId?.toLowerCase();
      if (!slug) continue;
      entries.push({
        url: `${baseUrl}/portal-projects/${encodeURIComponent(slug)}`,
        lastModified: proj.updatedAt ? new Date(proj.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("sitemap.ts generation error:", error);
  }

  return entries;
}
