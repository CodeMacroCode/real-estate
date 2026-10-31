import { NextResponse } from 'next/server';
import { ApiResponse } from '../types';

function logApiResponse(status: number, body: any) {
  // Only log on server in dev / non-production or when DEBUG_API is set
  const isError = status >= 400;
  const statusColor = isError ? '\x1b[31m' : '\x1b[32m'; // Red for error, Green for success
  const resetColor = '\x1b[0m';
  const grayColor = '\x1b[90m';

  const time = new Date().toLocaleTimeString();
  console.log(`${grayColor}[${time}]${resetColor} ${statusColor}HTTP ${status}${resetColor} API Response:`);

  if (isError) {
    console.dir({ error: body.error, details: body.details }, { depth: 5, colors: true });
  } else if (Array.isArray(body.data) && body.data.length > 3) {
    console.dir(
      {
        success: true,
        dataLength: body.data.length,
        sample: body.data.slice(0, 2),
        meta: body.meta,
        truncated: `... +${body.data.length - 2} more items`,
      },
      { depth: 4, colors: true }
    );
  } else {
    console.dir(body, { depth: 5, colors: true });
  }
}

export function jsonResponse<T>(data: T, status: number = 200, meta?: any): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };

  logApiResponse(status, body);

  return NextResponse.json(body, { status });
}

export function errorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse<ApiResponse> {
  const body: ApiResponse = {
    success: false,
    error,
    details,
  };

  logApiResponse(status, body);

  return NextResponse.json(body, { status });
}
