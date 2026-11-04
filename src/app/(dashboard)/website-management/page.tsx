import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerAuthContext } from "@/lib/auth/session";
import { getSsrWebsitePortals } from "@/services/websiteManagementService";
import { WebsiteManagementClient } from "./WebsiteManagementClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Website Management | Portal URLs Directory",
  description: "View and manage public website portal URLs for properties and projects across admin organizations.",
};

interface WebsiteManagementPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function WebsiteManagementPage({
  searchParams,
}: WebsiteManagementPageProps) {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const search = resolvedParams.search;
  const page = parseInt(resolvedParams.page || "1", 10);
  const limit = parseInt(resolvedParams.limit || "8", 10);

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";

  // Preload paginated portal data directly on the server (SSR)
  const initialData = await getSsrWebsitePortals({
    userId: authContext.user._id,
    roleSlug: authContext.role.slug,
    search,
    page,
    limit,
    host,
  });

  return (
    <div className="space-y-6">
      <WebsiteManagementClient
        initialData={JSON.parse(JSON.stringify(initialData))}
        roleSlug={authContext.role.slug}
      />
    </div>
  );
}
