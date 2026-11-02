import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import {
  getLeadsServerSide,
  getAssignedFormServerSide,
  getAdminUsersServerSide,
  getSubRolesServerSide,
} from "@/services/leadService";
import { LeadsClient } from "./LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const roleSlug = authContext.role?.slug || "";
  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  // Pre-fetch all data on the server via SSR
  const [initialLeadsData, initialFormData, initialAdmins, initialSubRoles] =
    await Promise.all([
      getLeadsServerSide(authContext, { page: 1, limit: 10 }),
      isAdmin ? getAssignedFormServerSide(authContext) : Promise.resolve(null),
      isSuperAdmin ? getAdminUsersServerSide() : Promise.resolve([]),
      getSubRolesServerSide(),
    ]);

  return (
    <LeadsClient
      initialUser={JSON.parse(JSON.stringify(authContext.user))}
      initialRoleSlug={roleSlug}
      initialLeads={initialLeadsData.leads}
      initialTotalPages={initialLeadsData.totalPages}
      initialTotalCount={initialLeadsData.total}
      initialStats={initialLeadsData.stats}
      initialAssignedForm={initialFormData}
      initialAdmins={initialAdmins}
      initialSubRoles={initialSubRoles}
    />
  );
}
