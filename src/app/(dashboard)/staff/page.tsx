import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/session';
import { listUsers } from '@/services/userService';
import { listRoles } from '@/services/roleService';
import { StaffClient } from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect('/login');
  }

  const roleSlug = authContext.role?.slug || '';
  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = roleSlug === 'admin';

  if (!isSuperAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  // Pre-fetch staff, roles, and admins on the server
  const [staffResult, rolesResult, adminsResult] = await Promise.all([
    listUsers({
      page: 1,
      limit: 10,
      userType: 'staff',
      parentAdminId: isAdmin ? authContext.user._id : undefined,
    }),
    listRoles(),
    isSuperAdmin ? listUsers({ userType: 'admin', limit: 100 }) : Promise.resolve(null),
  ]);

  const initialStaff = JSON.parse(JSON.stringify(staffResult.users));
  const initialRoles = JSON.parse(JSON.stringify(rolesResult));
  const initialAdmins = adminsResult ? JSON.parse(JSON.stringify(adminsResult.users)) : [];

  return (
    <StaffClient
      initialStaff={initialStaff}
      initialRoles={initialRoles}
      initialAdmins={initialAdmins}
      initialTotalPages={staffResult.pagination.totalPages}
      initialTotalCount={staffResult.pagination.total}
      currentUserRoleSlug={roleSlug}
      currentUserAllowedSubRoles={authContext.user.allowedSubRoles || []}
    />
  );
}
