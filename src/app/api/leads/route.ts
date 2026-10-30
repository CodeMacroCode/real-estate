import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { Client } from '@/models/Client';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const source = searchParams.get('source')?.trim() || '';
    const adminFilter = searchParams.get('adminId')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    // 3-Tier Multi-Tenant Scoping Rule
    const query: any = {};

    if (isSuperAdmin) {
      if (adminFilter) {
        query.adminId = new mongoose.Types.ObjectId(adminFilter);
      }
    } else if (isAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      // Sub-Role (Sales Executive, Sales Manager, etc.)
      const currentUser = await User.findById(authContext.user._id).lean();
      const parentAdminId = currentUser?.parentAdminId;

      if (!parentAdminId) {
        return jsonResponse([], 200, {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        });
      }

      query.adminId = parentAdminId;

      // If user is sales_executive, only see assigned leads or created leads
      if (roleSlug === 'sales_executive') {
        query.$or = [
          { assignedSubRoleId: new mongoose.Types.ObjectId(authContext.user._id) },
          { createdById: new mongoose.Types.ObjectId(authContext.user._id) },
        ];
      }
    }

    if (status) {
      query.status = status;
    }

    if (source) {
      query.source = source;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { clientName: searchRegex },
          { clientPhone: searchRegex },
          { clientEmail: searchRegex },
          { leadTitle: searchRegex },
        ],
      });
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('adminId', 'name email')
        .populate({
          path: 'assignedSubRoleId',
          select: 'name email roleId',
          populate: { path: 'roleId', select: 'name slug' },
        })
        .populate({
          path: 'createdById',
          select: 'name email roleId',
          populate: { path: 'roleId', select: 'name slug' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    return jsonResponse(leads, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch leads', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();

    const body = await req.json();
    const {
      leadTitle,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      source = 'Manual',
      campaignName,
      notes,
      budget,
      preferredProperty,
      rawSubmissionData,
      adminId: targetAdminId,
      assignedSubRoleId,
    } = body;

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    let resolvedAdminId: mongoose.Types.ObjectId;

    if (isSuperAdmin) {
      if (!targetAdminId) {
        return errorResponse('Super Admin must specify an Admin to own this lead', 400);
      }
      resolvedAdminId = new mongoose.Types.ObjectId(targetAdminId);
    } else if (isAdmin) {
      resolvedAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      // Sub-Role
      const currentUser = await User.findById(authContext.user._id).lean();
      if (!currentUser?.parentAdminId) {
        return errorResponse('User does not belong to an active Admin organization', 403);
      }
      resolvedAdminId = new mongoose.Types.ObjectId(currentUser.parentAdminId.toString());
    }

    if (!leadTitle || !clientName || !clientPhone) {
      return errorResponse('Lead Title, Client Name, and Client Phone are required', 400);
    }

    let assignedSubRoleName = '';
    let resolvedAssignedSubRoleId = assignedSubRoleId ? new mongoose.Types.ObjectId(assignedSubRoleId) : null;

    if (resolvedAssignedSubRoleId) {
      const assignedUser = await User.findById(resolvedAssignedSubRoleId).lean();
      if (assignedUser) {
        assignedSubRoleName = assignedUser.name;
      }
    }

    const newLead = await Lead.create({
      leadTitle,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      source,
      campaignName,
      notes,
      budget: budget ? Number(budget) : undefined,
      preferredProperty,
      rawSubmissionData: rawSubmissionData || {},
      status: resolvedAssignedSubRoleId ? 'Assigned' : 'Pending',
      adminId: resolvedAdminId,
      assignedSubRoleId: resolvedAssignedSubRoleId,
      assignedSubRoleName: assignedSubRoleName || undefined,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    // Auto-create / Connect permanent Client in Client Information directory
    let client = await Client.findOne({ phone: clientPhone.trim(), adminId: resolvedAdminId });
    if (!client) {
      client = await Client.create({
        adminId: resolvedAdminId,
        leadId: newLead._id,
        clientName: clientName.trim(),
        phone: clientPhone.trim(),
        email: clientEmail ? clientEmail.trim().toLowerCase() : undefined,
        address: clientAddress ? clientAddress.trim() : undefined,
        companyName: (rawSubmissionData?.company_name || rawSubmissionData?.organization_name || rawSubmissionData?.['Company Name'] || rawSubmissionData?.['Organization Name'] || ''),
        totalDealsWon: 0,
        status: 'Active',
        notes: notes ? `From lead: ${leadTitle} - ${notes}` : `Created from lead: ${leadTitle}`,
        createdById: new mongoose.Types.ObjectId(authContext.user._id),
      });
    } else {
      // Connect existing client and update any missing contact details
      if (!client.email && clientEmail) client.email = clientEmail.trim().toLowerCase();
      if (!client.address && clientAddress) client.address = clientAddress.trim();
      await client.save();
    }

    newLead.clientId = client._id;
    await newLead.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: 'create',
      entity: 'leads',
      entityId: newLead._id.toString(),
      newValues: {
        leadTitle,
        clientName,
        source,
        adminId: resolvedAdminId.toString(),
      },
    });

    return jsonResponse(newLead, undefined, 201);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to create lead', 500);
  }
}
