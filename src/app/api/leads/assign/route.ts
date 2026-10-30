import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();

    const body = await req.json();
    const { leadId, assignedSubRoleId } = body;

    if (!leadId || !assignedSubRoleId) {
      return errorResponse('leadId and assignedSubRoleId are required', 400);
    }

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';
    const isSalesManager = roleSlug === 'sales_manager';

    if (!isSuperAdmin && !isAdmin && !isSalesManager) {
      return errorResponse('Only SuperAdmin, Admin, or Sales Manager can assign leads', 403);
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return errorResponse('Lead not found', 404);
    }

    // Tenant check: Admin/SalesManager can only assign within their own org
    if (isAdmin && lead.adminId.toString() !== authContext.user._id.toString()) {
      return errorResponse('You can only assign leads belonging to your organization', 403);
    }

    if (isSalesManager) {
      const currentUser = await User.findById(authContext.user._id).lean();
      if (!currentUser?.parentAdminId || lead.adminId.toString() !== currentUser.parentAdminId.toString()) {
        return errorResponse('You can only assign leads belonging to your organization', 403);
      }
    }

    const assignee = await User.findById(assignedSubRoleId).lean();
    if (!assignee) {
      return errorResponse('Assignee user not found', 404);
    }

    // Verify assignee belongs to the lead's admin organization
    if (
      assignee.parentAdminId?.toString() !== lead.adminId.toString() &&
      assignee._id.toString() !== lead.adminId.toString()
    ) {
      return errorResponse('Assignee does not belong to this lead’s organization', 400);
    }

    const previousAssignee = lead.assignedSubRoleName || 'Unassigned';

    lead.assignedSubRoleId = new mongoose.Types.ObjectId(assignedSubRoleId);
    lead.assignedSubRoleName = assignee.name;
    if (lead.status === 'Pending') {
      lead.status = 'Assigned';
    }
    await lead.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: 'assign',
      entity: 'leads',
      entityId: lead._id.toString(),
      oldValues: { assignedSubRoleName: previousAssignee },
      newValues: { assignedSubRoleName: assignee.name, assignedSubRoleId },
    });

    return jsonResponse(lead);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to assign lead', 500);
  }
}
