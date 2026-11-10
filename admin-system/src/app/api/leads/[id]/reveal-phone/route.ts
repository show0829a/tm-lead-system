import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTmOrAdmin, handleAuthError } from '@/lib/auth';
import { decryptPhone } from '@/lib/crypto';
import { recordAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireTmOrAdmin(request);
    const leadId = params.id;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Role-based access control:
    // ADMIN can reveal any phone. TM can only reveal phone for their assigned leads.
    if (user.role === 'TM' && lead.assignedTmId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only reveal phone numbers for leads assigned to you' },
        { status: 403 }
      );
    }

    // Decrypt AES-256-GCM ciphertext
    const fullPhone = decryptPhone(lead.phoneEncrypted);

    // Mandatory Audit Log entry
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    await recordAuditLog({
      userId: user.id,
      leadId: lead.id,
      action: 'VIEW_FULL_PHONE',
      detail: `Phone revealed by ${user.role} ${user.name} (${user.loginId}) for lead ${lead.customerName}`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      fullPhone,
      phone: fullPhone,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
