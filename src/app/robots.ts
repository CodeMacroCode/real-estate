import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import { resolveAdminByHostOrSlug } from "@/services/publicPortalService";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
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

  const normalizedHost = normalizeHostname(host);
  let robotsIndex = true;

  if (normalizedHost && !isPlatformHost(normalizedHost)) {
    try {
      const tenant = await resolveAdminByHostOrSlug(normalizedHost);
      const seo = tenant?.seo ?? tenant?.settings?.seo;
      if (seo && seo.robotsIndex === false) {
        robotsIndex = false;
      }
    } catch (error) {
      console.error("robots.ts tenant resolution error:", error);
    }
  }

  const sitemapUrl = host ? `${protocol}://${host}/sitemap.xml` : undefined;

  if (!robotsIndex) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
