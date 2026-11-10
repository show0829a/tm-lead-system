import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { assignLeadManually } from '@/lib/allocation-engine';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const leadId = body.leadId;
    const targetTmId = body.targetTmId || body.tmId;
    const consumeTurn = Boolean(body.consumeTurn);

    if (!leadId || !targetTmId) {
      return NextResponse.json(
        { error: 'leadId and targetTmId (or tmId) are required' },
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
