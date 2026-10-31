import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { listUsers } from "@/services/userService";
import { listRoles } from "@/services/roleService";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  const isSuperAdmin = authContext.role?.slug === "super_admin";
  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  // Pre-fetch initial users and roles on the server
  const [usersResult, rolesResult] = await Promise.all([
    listUsers({ page: 1, limit: 10, userType: "admin" }),
    listRoles(),
  ]);

  const initialUsers = JSON.parse(JSON.stringify(usersResult.users));
  const initialRoles = JSON.parse(JSON.stringify(rolesResult));

  return (
    <UsersClient
      initialUsers={initialUsers}
      initialRoles={initialRoles}
      initialTotalPages={usersResult.pagination.totalPages}
      initialTotalCount={usersResult.pagination.total}
      currentUserRoleSlug={authContext.role.slug}
    />
  );
}
