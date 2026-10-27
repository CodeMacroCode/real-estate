import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { getUserById, updateUser } from '@/services/userService';
import { updateUserSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (!hasPermission(authContext.role, 'staff_users', 'view')) {
      return errorResponse('Forbidden: You lack permission to view staff user details', 403);
    }

    const user = await getUserById(params.id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return jsonResponse(user);
  } catch (error: any) {
    console.error(`GET /api/users/${params.id} error:`, error);
    return errorResponse(error.message || 'Failed to retrieve user', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (!hasPermission(authContext.role, 'staff_users', 'edit')) {
      return errorResponse('Forbidden: You lack permission to update staff users', 403);
    }

    const body = await req.json();
    const parseResult = updateUserSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const updatedUser = await updateUser(params.id, parseResult.data, {
      userId: authContext.user._id,
      employeeId: authContext.user.employeeId,
      name: authContext.user.name,
      email: authContext.user.email,
      roleSlug: authContext.role.slug,
    });

    return jsonResponse(updatedUser);
  } catch (error: any) {
    console.error(`PUT /api/users/${params.id} error:`, error);
    return errorResponse(error.message || 'Failed to update user', 400);
  }
}
