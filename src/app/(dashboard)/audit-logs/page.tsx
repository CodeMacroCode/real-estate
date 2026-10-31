import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { getAuditLogs } from '@/services/auditService';
import { listUsers } from '@/services/userService';
import { AuditLogsClient } from './AuditLogsClient';
import { IAuditLog, SafeUser } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect('/login');
  }

  const { user: currentUser, role } = authContext;
  if (!hasPermission(role, 'audit_logs', 'view')) {
    redirect('/dashboard');
  }

  const roleSlug = role?.slug || '';
  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = roleSlug === 'admin';

  let initialLogs: IAuditLog[] = [];
  let totalPages = 1;
  let totalCount = 0;
  let initialAdmins: SafeUser[] = [];

  try {
    const logsResult = await getAuditLogs({
      limit: 15,
      excludeSuperAdmin: !isSuperAdmin,
      parentAdminId: isAdmin ? currentUser._id?.toString() : undefined,
    });

    initialLogs = JSON.parse(JSON.stringify(logsResult.logs || []));
    totalPages = logsResult.pagination.totalPages;
    totalCount = logsResult.pagination.total;

    if (isSuperAdmin) {
      const adminsResult = await listUsers({ userType: 'admin', limit: 20 });
      initialAdmins = JSON.parse(JSON.stringify(adminsResult.users || []));
    }
  } catch (err) {
    console.error('Failed to pre-fetch audit logs on server:', err);
  }

  const cleanUser = JSON.parse(JSON.stringify(currentUser));

  return (
    <AuditLogsClient
      initialLogs={initialLogs}
      initialTotalPages={totalPages}
      initialTotalCount={totalCount}
      initialAdmins={initialAdmins}
      currentUserRoleSlug={roleSlug}
      currentUser={cleanUser}
    />
  );
}
