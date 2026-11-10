import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { setNextPointer } from '@/lib/allocation-engine';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const { targetTmId, siteId } = body;
    if (!targetTmId) {
      return NextResponse.json(
        { error: 'targetTmId is required' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    const result = await setNextPointer({
      targetTmId,
      siteId,
      adminUserId: admin.id,
      ipAddress,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
