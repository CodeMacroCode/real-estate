import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { getSsrMasterOptions } from "@/services/masterService";
import { MasterSettingsClient } from "./MasterSettingsClient";

export const dynamic = "force-dynamic";

export default async function MasterSettingsPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const roleSlug = authContext.role?.slug || "";
  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  // Security Gate: Master settings management requires admin / super_admin
  if (!isSuperAdmin && !isAdmin) {
    redirect("/dashboard");
  }

  // SSR Data Fetch: Preload all active master options directly from DB
  const initialMasterOptions = await getSsrMasterOptions({
    userId: authContext.user._id,
    roleSlug,
    includeInactive: true,
  });

  return (
    <div className="space-y-6">
      <MasterSettingsClient
        initialOptions={JSON.parse(JSON.stringify(initialMasterOptions))}
        currentUser={JSON.parse(JSON.stringify(authContext.user))}
        roleSlug={roleSlug}
      />
    </div>
  );
}

