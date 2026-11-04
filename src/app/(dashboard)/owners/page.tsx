import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { getSsrOwners } from "@/services/ownerService";
import { OwnersClient } from "./OwnersClient";

export const dynamic = "force-dynamic";

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const roleSlug = authContext.role?.slug || "";
  const params = await searchParams;

  const search = params.search;
  const ownershipType = params.ownershipType;
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);

  // SSR Data Preload: Direct MongoDB execution with Multi-Tenant Scoping
  const { owners, pagination } = await getSsrOwners({
    userId: authContext.user._id,
    roleSlug,
    search,
    ownershipType,
    page,
    limit,
  });

  return (
    <div className="space-y-6">
      <OwnersClient
        initialOwners={JSON.parse(JSON.stringify(owners))}
        pagination={pagination}
        currentUser={JSON.parse(JSON.stringify(authContext.user))}
        roleSlug={roleSlug}
      />
    </div>
  );
}
