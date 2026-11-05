import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { getSsrPublicInquiries } from '@/services/leadIngestionService';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const filterType = searchParams.get('type')?.trim() || '';
    const startDate = searchParams.get('startDate')?.trim() || '';
    const endDate = searchParams.get('endDate')?.trim() || '';

    const adminId = authContext.user.parentAdminId
      ? typeof authContext.user.parentAdminId === 'object'
        ? (authContext.user.parentAdminId as any)._id
        : authContext.user.parentAdminId
      : authContext.user._id;

    const result = await getSsrPublicInquiries(adminId.toString(), page, limit, filterType, startDate, endDate);

    return jsonResponse(result.inquiries, 200, result.pagination);
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to fetch inquiries', 500);
  }
}

