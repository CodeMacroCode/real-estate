import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { getAdminSocialMediaInitialProps } from "@/services/socialSettingsService";
import { LeadSocialMediaClient } from "./LeadSocialMediaClient";

export const dynamic = "force-dynamic";

export default async function LeadSocialMediaPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  if (authContext.role?.slug !== "admin") {
    redirect("/dashboard");
  }

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerStore.get("host")?.split(",")[0]?.trim() ||
    "localhost:3000";
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  const protocol =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (isLocal ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  const initialData = await getAdminSocialMediaInitialProps(
    authContext.user._id.toString(),
    baseUrl,
  );

  return <LeadSocialMediaClient initialData={initialData} />;
}
