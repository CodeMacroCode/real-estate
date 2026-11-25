import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { DomainsClient } from "./DomainsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Custom Domains | Real Estate CRM",
  description:
    "Manage custom domain mappings, primary hostnames, and active status for agency property portals.",
};

export default async function DomainsPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const roleSlug = authContext.role?.slug || "";
  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  if (!isSuperAdmin && !isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <DomainsClient
        roleSlug={roleSlug}
        currentUserId={String(authContext.user._id)}
        currentAgencyName={
          authContext.user.agencyName || authContext.user.name || "My Agency"
        }
      />
    </div>
  );
}
