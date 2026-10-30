import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();
    const { id } = await params;

    const lead = await Lead.findById(id)
      .populate('adminId', 'name email')
      .populate('assignedSubRoleId', 'name email role')
      .lean();

    if (!lead) {
      return errorResponse('Lead not found', 404);
    }

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    // Scoping Verification
    if (isAdmin && (lead.adminId as any)._id?.toString() !== authContext.user._id.toString() && lead.adminId.toString() !== authContext.user._id.toString()) {
      return errorResponse('Access denied', 403);
    }

    if (!isSuperAdmin && !isAdmin) {
      const currentUser = await User.findById(authContext.user._id).lean();
      const parentAdminId = currentUser?.parentAdminId?.toString();
      const leadAdminId = (lead.adminId as any)._id?.toString() || lead.adminId.toString();

      if (parentAdminId !== leadAdminId) {
        return errorResponse('Access denied', 403);
      }

      // If sales executive, ensure assigned
      if (
        roleSlug === 'sales_executive' &&
        (lead.assignedSubRoleId as any)?._id?.toString() !== authContext.user._id.toString() &&
        lead.createdById.toString() !== authContext.user._id.toString()
      ) {
        return errorResponse('Access denied', 403);
      }
    }

    return jsonResponse(lead);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch lead', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();
    const { id } = await params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return errorResponse('Lead not found', 404);
    }

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    if (isAdmin && lead.adminId.toString() !== authContext.user._id.toString()) {
      return errorResponse('Access denied', 403);
    }

    if (!isSuperAdmin && !isAdmin) {
      const currentUser = await User.findById(authContext.user._id).lean();
      if (currentUser?.parentAdminId?.toString() !== lead.adminId.toString()) {
        return errorResponse('Access denied', 403);
      }
    }

    const body = await req.json();
    const {
      status,
      notes,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      budget,
      preferredProperty,
      leadTitle,
      rawSubmissionData,
    } = body;

    const previousStatus = lead.status;

    if (status) lead.status = status;
    if (notes !== undefined) lead.notes = notes;
    if (clientName) lead.clientName = clientName;
    if (clientPhone) lead.clientPhone = clientPhone;
    if (clientEmail !== undefined) lead.clientEmail = clientEmail;
    if (clientAddress !== undefined) lead.clientAddress = clientAddress;
    if (budget !== undefined) lead.budget = budget ? Number(budget) : undefined;
    if (preferredProperty !== undefined) lead.preferredProperty = preferredProperty;
    if (leadTitle) lead.leadTitle = leadTitle;
    if (rawSubmissionData !== undefined) lead.rawSubmissionData = rawSubmissionData;

    await lead.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: 'update',
      entity: 'leads',
      entityId: lead._id.toString(),
      oldValues: { status: previousStatus },
      newValues: { status: lead.status },
    });

    return jsonResponse(lead);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to update lead', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();
    const { id } = await params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return errorResponse('Lead not found', 404);
    }

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    // Only SuperAdmin or owning Admin can delete leads
    if (!isSuperAdmin && (!isAdmin || lead.adminId.toString() !== authContext.user._id.toString())) {
      return errorResponse('Only SuperAdmin or the owning Admin can delete leads', 403);
    }

    await Lead.findByIdAndDelete(id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: 'delete',
      entity: 'leads',
      entityId: id,
      oldValues: { leadTitle: lead.leadTitle, clientName: lead.clientName },
    });

    return jsonResponse({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to delete lead', 500);
  }
}
