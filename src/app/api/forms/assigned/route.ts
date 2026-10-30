import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { FormAdminAssignment, CustomForm } from '@/models/CustomForm';
import { User } from '@/models/User';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
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
    const requestedAdminId = searchParams.get('adminId')?.trim();

    const roleSlug = authContext.role?.slug || '';
    const isSuperAdmin = roleSlug === 'super_admin';
    const isAdmin = roleSlug === 'admin';

    let targetAdminId: mongoose.Types.ObjectId | null = null;

    if (isSuperAdmin) {
      if (requestedAdminId) {
        targetAdminId = new mongoose.Types.ObjectId(requestedAdminId);
      }
    } else if (isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      // Sub-Role: must use their parentAdminId
      const currentUser = await User.findById(authContext.user._id).select('parentAdminId').lean();
      if (!currentUser?.parentAdminId) {
        return errorResponse('User does not belong to an active Admin organization', 403);
      }
      targetAdminId = new mongoose.Types.ObjectId(currentUser.parentAdminId.toString());
    }

    if (!targetAdminId) {
      return jsonResponse({
        assigned: false,
        message: 'No admin specified or assigned',
        form: null,
      });
    }

    // Find the form assigned to this targetAdminId
    const assignment = await FormAdminAssignment.findOne({
      adminId: targetAdminId,
      isActive: true,
    })
      .populate('formId')
      .populate('adminId', 'name email designation branch')
      .lean();

    if (!assignment || !assignment.formId) {
      return jsonResponse({
        assigned: false,
        message: 'No form has been generated or assigned by Super Admin for this organization',
        form: null,
      });
    }

    const form = assignment.formId as any;

    return jsonResponse({
      assigned: true,
      assignmentId: assignment._id,
      publicSlug: assignment.publicSlug,
      admin: assignment.adminId,
      form: {
        _id: form._id,
        name: form.name,
        description: form.description,
        version: form.version,
        fields: form.fields,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch assigned form', 500);
  }
}

