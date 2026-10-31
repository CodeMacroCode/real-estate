import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/session';
import { listUsers } from '@/services/userService';
import { User } from '@/models/User';
import { logSsrData } from '@/lib/ssrLogger';
import { RolesClient } from './RolesClient';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
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

  let initialAdmins: any[] = [];
  let initialSelectedAdminId = '';
  let initialSubRoleCategories: { slug: string; name: string }[] = [];
  let initialSelectedSubRoleCategory = '';
  let initialStaffUsers: any[] = [];
  let initialSelectedStaffUserId = '';
  let initialTargetUser: any = null;
  let initialUserPermissions: any[] = [];
  let initialAdminCeiling: any[] | null = null;

  try {
    if (isSuperAdmin) {
      const adminsData = await listUsers({ userType: 'admin', limit: 100 });
      initialAdmins = JSON.parse(JSON.stringify(adminsData.users));
      if (initialAdmins.length > 0) {
        initialSelectedAdminId = initialAdmins[0]._id;
        const targetDoc: any = await User.findById(initialSelectedAdminId).populate('roleId').lean();
        if (targetDoc) {
          const roleObj: any = targetDoc.roleId;
          const effectivePermissions =
            targetDoc.customPermissions && targetDoc.customPermissions.length > 0
              ? targetDoc.customPermissions
              : roleObj?.permissions || [];
          const cleanEffectivePermissions = JSON.parse(JSON.stringify(effectivePermissions));
          initialTargetUser = {
            _id: targetDoc._id.toString(),
            name: targetDoc.name,
            email: targetDoc.email,
            designation: targetDoc.designation,
            branch: targetDoc.branch,
            department: targetDoc.department,
            role: roleObj ? { name: roleObj.name, slug: roleObj.slug } : undefined,
            permissions: cleanEffectivePermissions,
            ceilingPermissions: null,
          };
          initialUserPermissions = cleanEffectivePermissions;
        }
      }
    } else if (isAdmin) {
      const allowedSlugs: string[] = authContext.user.allowedSubRoles || [];
      const categoryLabels: Record<string, string> = {
        property_manager: 'Property Manager',
        sales_executive: 'Sales Executive',
        sales_manager: 'Sales Manager',
        website_manager: 'Website Manager',
      };
      initialSubRoleCategories = allowedSlugs.map((s) => ({
        slug: s,
        name: categoryLabels[s] || s.replace(/_/g, ' '),
      }));
      if (initialSubRoleCategories.length > 0) {
        initialSelectedSubRoleCategory = initialSubRoleCategories[0].slug;
      }
      initialAdminCeiling = JSON.parse(JSON.stringify(authContext.role.permissions || []));
    }
  } catch (err) {
    console.error('Failed to pre-fetch roles data on server:', err);
  }

  logSsrData('/roles', {
    admins: initialAdmins,
    selectedAdminId: initialSelectedAdminId,
    targetUser: initialTargetUser,
    userPermissionsCount: initialUserPermissions.length,
  });

  return (
    <RolesClient
      initialAdmins={initialAdmins}
      initialSelectedAdminId={initialSelectedAdminId}
      initialSubRoleCategories={initialSubRoleCategories}
      initialSelectedSubRoleCategory={initialSelectedSubRoleCategory}
      initialStaffUsers={initialStaffUsers}
      initialSelectedStaffUserId={initialSelectedStaffUserId}
      initialTargetUser={initialTargetUser}
      initialUserPermissions={initialUserPermissions}
      initialAdminCeiling={initialAdminCeiling}
      currentUserRoleSlug={roleSlug}
    />
  );
}
