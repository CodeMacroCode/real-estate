import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { CustomForm, FormAdminAssignment, FormField } from '@/models/CustomForm';
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

    if (isSuperAdmin) {
      const forms = await CustomForm.find().sort({ createdAt: -1 }).lean();
      const assignments = await FormAdminAssignment.find()
        .populate('adminId', 'name email designation branch')
        .populate('formId', 'name version fields')
        .sort({ createdAt: -1 })
        .lean();

      return jsonResponse({ forms, assignments });
    }

    if (isAdmin) {
      const assignments = await FormAdminAssignment.find({
        adminId: new mongoose.Types.ObjectId(authContext.user._id),
        isActive: true,
      })
        .populate('formId')
        .lean();

      return jsonResponse({ assignments });
    }

    return errorResponse('Unauthorized', 403);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch custom forms', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (authContext.role?.slug !== 'super_admin') {
      return errorResponse('Only Super Admin can create dynamic form schemas', 403);
    }

    await connectToDatabase();

    const body = await req.json();
    const { name, description, fields } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse('Form Name is required', 400);
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return errorResponse('At least one field is required in the form', 400);
    }

    // Specification Validation Guard:
    // Form MUST contain at least one field mapped to 'client_name' and one to 'client_phone'
    const hasNameMapping = fields.some((f: FormField) => f.mapping === 'client_name');
    const hasPhoneMapping = fields.some((f: FormField) => f.mapping === 'client_phone');

    if (!hasNameMapping) {
      return errorResponse(
        'Validation failed: At least one field must map to Client Name (client_name)',
        400
      );
    }

    if (!hasPhoneMapping) {
      return errorResponse(
        'Validation failed: At least one field must map to Primary Phone (client_phone)',
        400
      );
    }

    // Ensure orders are sequential
    const orderedFields = fields.map((f: FormField, idx: number) => ({
      ...f,
      order: f.order !== undefined ? f.order : idx + 1,
    }));

    const newForm = await CustomForm.create({
      name: name.trim(),
      description: (description || '').trim(),
      fields: orderedFields,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
      version: 1,
      isActive: true,
    });

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: 'create',
      entity: 'custom_forms',
      entityId: newForm._id.toString(),
      newValues: {
        name: newForm.name,
        fieldsCount: newForm.fields.length,
      },
    });

    return jsonResponse(newForm, 201);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to create form', 500);
  }
}
