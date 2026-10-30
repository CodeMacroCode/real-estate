import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { ClientConfirmation } from '@/models/ClientConfirmation';
import { Appointment } from '@/models/Appointment';
import { Lead } from '@/models/Lead';
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

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    const query: any = {};
    if (isAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else if (!isSuperAdmin) {
      query.createdById = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const confirmations = await ClientConfirmation.find(query)
      .populate('appointmentId')
      .populate('leadId')
      .sort({ createdAt: -1 })
      .lean();

    return jsonResponse(confirmations);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch confirmations', 500);
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
      appointmentId,
      clientConfirmation, // 'YES' | 'NO' | 'MAYBE'
      clientFeedback,
      agreedDeliveryDate,
      followUpDate,
      rejectionReason,
      quotationAmount,
      quotationNumber,
      invoiceUrl,
      deliveryOrSiteAddress,
    } = body;

    if (!appointmentId || !clientConfirmation) {
      return errorResponse('Appointment ID and Client Confirmation outcome are required', 400);
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return errorResponse('Appointment not found', 404);
    }

    const lead = await Lead.findById(appointment.leadId);
    if (!lead) {
      return errorResponse('Associated lead not found', 404);
    }

    const confirmation = await ClientConfirmation.create({
      appointmentId: appointment._id,
      leadId: lead._id,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail,
      deliveryOrSiteAddress: deliveryOrSiteAddress || '',
      clientConfirmation,
      clientFeedback: clientFeedback || '',
      agreedDeliveryDate: agreedDeliveryDate ? new Date(agreedDeliveryDate) : undefined,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      rejectionReason: rejectionReason || undefined,
      quotationAmount: quotationAmount ? Number(quotationAmount) : undefined,
      quotationNumber: quotationNumber || undefined,
      invoiceUrl: invoiceUrl || undefined,
      adminId: appointment.adminId,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    appointment.outcome = clientConfirmation;
    appointment.status = 'Completed';
    appointment.confirmationId = confirmation._id;

    // Follow-up Chaining if MAYBE
    let nextAppointment = null;
    if (clientConfirmation === 'MAYBE' && followUpDate) {
      const currentSequence = appointment.meetingSequence || 1;
      nextAppointment = await Appointment.create({
        leadId: lead._id,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        clientEmail: appointment.clientEmail,
        agenda: `Follow-up #${currentSequence + 1}: ${clientFeedback || 'Continued Discussion'}`,
        meetingType: appointment.meetingType || 'Virtual',
        meetingLocation: appointment.meetingLocation || '',
        meetingDate: new Date(followUpDate),
        durationMinutes: appointment.durationMinutes || 30,
        status: 'Scheduled',
        adminId: appointment.adminId,
        assignedSubRoleId: appointment.assignedSubRoleId,
        createdById: new mongoose.Types.ObjectId(authContext.user._id),
        meetingSequence: currentSequence + 1,
        previousAppointmentId: appointment._id,
      });

      appointment.nextAppointmentId = nextAppointment._id;
    }
    await appointment.save();

    // CRM Master Graduation if YES
    if (clientConfirmation === 'YES') {
      lead.status = 'Completed';
      let client = await Client.findOne({ phone: lead.clientPhone, adminId: appointment.adminId });
      if (!client) {
        client = await Client.create({
          adminId: appointment.adminId,
          leadId: lead._id,
          appointmentId: appointment._id,
          confirmationId: confirmation._id,
          clientName: appointment.clientName,
          phone: appointment.clientPhone,
          email: appointment.clientEmail,
          address: deliveryOrSiteAddress || lead.clientAddress || '',
          totalDealsWon: 1,
          totalRevenue: quotationAmount ? Number(quotationAmount) : 0,
          lastAgreedDeliveryDate: agreedDeliveryDate ? new Date(agreedDeliveryDate) : undefined,
          status: 'Active',
          createdById: new mongoose.Types.ObjectId(authContext.user._id),
        });
      } else {
        client.totalDealsWon = (client.totalDealsWon || 1) + 1;
        if (quotationAmount) {
          client.totalRevenue = (client.totalRevenue || 0) + Number(quotationAmount);
        }
        if (agreedDeliveryDate) {
          client.lastAgreedDeliveryDate = new Date(agreedDeliveryDate);
        }
        await client.save();
      }
      lead.clientId = client._id;
    } else if (clientConfirmation === 'MAYBE') {
      lead.status = 'In-Progress';
    } else if (clientConfirmation === 'NO') {
      lead.status = 'Rejected';
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
      action: 'update',
      entity: 'client_confirmations',
      entityId: confirmation._id.toString(),
      newValues: {
        appointmentId: appointment._id.toString(),
        leadId: lead._id.toString(),
        outcome: clientConfirmation,
      },
    });

    return jsonResponse(confirmation, undefined, 201);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to record confirmation', 500);
  }
}
