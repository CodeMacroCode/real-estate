import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { updateUserStatus } from '@/services/userService';
import { userStatusSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const canEdit = hasPermission(authContext.role, 'staff_users', 'edit');
    const canDelete = hasPermission(authContext.role, 'staff_users', 'delete');

    if (!canEdit && !canDelete) {
      return errorResponse('Forbidden: You lack permission to change staff account status', 403);
    }

    const body = await req.json();
    const parseResult = userStatusSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const { status, reason } = parseResult.data;

    const updatedUser = await updateUserStatus(params.id, status, reason, {
      userId: authContext.user._id,
      employeeId: authContext.user.employeeId,
      name: authContext.user.name,
      email: authContext.user.email,
      roleSlug: authContext.role.slug,
    });

    return jsonResponse(updatedUser);
  } catch (error: any) {
    console.error(`PATCH /api/users/${params.id}/status error:`, error);
    return errorResponse(error.message || 'Failed to update account status', 400);
  }
}
