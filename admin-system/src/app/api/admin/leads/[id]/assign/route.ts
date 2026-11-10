import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { assignLeadManually } from '@/lib/allocation-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request);
    const leadId = params.id;
    const body = await request.json();

    const targetTmId = body.targetTmId || body.tmId;
    const consumeTurn = Boolean(body.consumeTurn);

    if (!targetTmId) {
      return NextResponse.json(
        { error: 'targetTmId (or tmId) is required' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    const updatedLead = await assignLeadManually({
      leadId,
      targetTmId,
      consumeTurn,
      adminUserId: admin.id,
      ipAddress,
    });

    const { phoneEncrypted, phoneHash, ...safeLead } = updatedLead as any;

    return NextResponse.json({
      success: true,
      lead: safeLead,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
