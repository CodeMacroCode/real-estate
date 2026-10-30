import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { Appointment } from '@/models/Appointment';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import '@/models/ClientConfirmation';
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
    const status = searchParams.get('status')?.trim() || '';
    const outcome = searchParams.get('outcome')?.trim() || '';
    const dateFilter = searchParams.get('dateFilter')?.trim() || ''; // 'today' | 'upcoming'
    const adminFilter = searchParams.get('adminId')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    const query: any = {};

    if (isSuperAdmin) {
      if (adminFilter) {
        query.adminId = new mongoose.Types.ObjectId(adminFilter);
      }
    } else if (isAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      // Sub-Role
      const currentUser = await User.findById(authContext.user._id).lean();
      const parentAdminId = currentUser?.parentAdminId;
      if (!parentAdminId) {
        return jsonResponse([], 200, { page: 1, limit, total: 0, totalPages: 0 });
      }
      query.adminId = parentAdminId;
      query.assignedSubRoleId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    if (status) {
      query.status = status;
    }

    if (outcome) {
      if (outcome === 'PENDING') {
        query.outcome = { $in: [null, undefined] };
      } else {
        query.outcome = outcome;
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (dateFilter === 'today') {
      query.meetingDate = { $gte: todayStart, $lte: todayEnd };
    } else if (dateFilter === 'upcoming') {
      const tomorrow = new Date();
      tomorrow.setHours(23, 59, 59, 999);
      query.meetingDate = { $gt: tomorrow };
    }

    // Base query for counting stats (without kpi filter constraints)
    const baseQuery = { ...query };
    delete baseQuery.status;
    delete baseQuery.outcome;
    delete baseQuery.meetingDate;

    const [appointments, total, stats] = await Promise.all([
      Appointment.find(query)
        .populate('leadId', 'leadTitle clientName clientPhone clientEmail clientAddress')
        .populate('adminId', 'name email designation')
        .populate({
          path: 'assignedSubRoleId',
          select: 'name email roleId designation',
          populate: { path: 'roleId', select: 'name slug' },
        })
        .populate({
          path: 'createdById',
          select: 'name email roleId',
          populate: { path: 'roleId', select: 'name slug' },
        })
        .populate('confirmationId', 'clientConfirmation clientFeedback agreedDeliveryDate followUpDate rejectionReason quotationAmount quotationNumber invoiceUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(query),
      Promise.all([
        Appointment.countDocuments(baseQuery),
        Appointment.countDocuments({ ...baseQuery, meetingDate: { $gte: todayStart, $lte: todayEnd } }),
        Appointment.countDocuments({ ...baseQuery, meetingDate: { $gt: todayEnd } }),
        Appointment.countDocuments({ ...baseQuery, outcome: { $in: [null, undefined] } }),
        Appointment.countDocuments({ ...baseQuery, outcome: 'YES' }),
        Appointment.countDocuments({ ...baseQuery, outcome: 'MAYBE' }),
      ]).then(([allCount, todayCount, upcomingCount, pendingCount, yesCount, maybeCount]) => ({
        allCount,
        todayCount,
        upcomingCount,
        pendingCount,
        yesCount,
        maybeCount,
      })),
    ]);

    return jsonResponse(appointments, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch appointments', 500);
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
      leadId,
      agenda,
      meetingType = 'Virtual',
      meetingLocation,
      meetingDate,
      durationMinutes = 30,
      assignedSubRoleId,
    } = body;

    if (!leadId || !agenda || !meetingDate) {
      return errorResponse('Lead, Agenda, and Meeting Date are required', 400);
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return errorResponse('Lead not found', 404);
    }

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    // Scoping check
    if (isAdmin && lead.adminId.toString() !== authContext.user._id.toString()) {
      return errorResponse('Access denied: Lead belongs to another organization', 403);
    }

    let resolvedSubRoleId: mongoose.Types.ObjectId;
    if (assignedSubRoleId) {
      resolvedSubRoleId = new mongoose.Types.ObjectId(assignedSubRoleId);
    } else if (!isSuperAdmin && !isAdmin) {
      resolvedSubRoleId = new mongoose.Types.ObjectId(authContext.user._id);
    } else if (lead.assignedSubRoleId) {
      resolvedSubRoleId = lead.assignedSubRoleId;
    } else {
      resolvedSubRoleId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    let googleCalendarLink = '';
    if (meetingType === 'Virtual') {
      const meetCode =
        Math.random().toString(36).substring(2, 5) +
        '-' +
        Math.random().toString(36).substring(2, 6) +
        '-' +
        Math.random().toString(36).substring(2, 5);
      googleCalendarLink = `https://meet.google.com/${meetCode}`;
    }

    const appointment = await Appointment.create({
      leadId: lead._id,
      clientName: lead.clientName,
      clientPhone: lead.clientPhone,
      clientEmail: lead.clientEmail,
      agenda,
      meetingType,
      meetingLocation: meetingLocation || '',
      meetingDate: new Date(meetingDate),
      durationMinutes: Number(durationMinutes) || 30,
      status: 'Scheduled',
      googleCalendarLink: googleCalendarLink || undefined,
      adminId: lead.adminId,
      assignedSubRoleId: resolvedSubRoleId,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    // Mark lead as having an appointment scheduled and link appointment
    lead.appointmentScheduled = true;
    lead.appointmentId = appointment._id;
    if (lead.status === 'Pending' || lead.status === 'Assigned') {
      lead.status = 'In-Progress';
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
      action: 'create',
      entity: 'appointments',
      entityId: appointment._id.toString(),
      newValues: {
        leadId: lead._id.toString(),
        clientName: lead.clientName,
        meetingDate,
        meetingType,
      },
    });

    return jsonResponse(appointment, undefined, 201);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to schedule appointment', 500);
  }
}
