import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);

    if (!authContext) {
      return errorResponse('Unauthorized. Please log in.', 401);
    }

    const { user, role } = authContext;

    return jsonResponse({
      user,
      role: {
        _id: role._id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        leadVisibilityScope: role.leadVisibilityScope,
        permissions: role.permissions,
      },
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    return errorResponse(error.message || 'Failed to verify session', 500);
  }
}
