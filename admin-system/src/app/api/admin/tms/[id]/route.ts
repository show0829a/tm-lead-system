import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError, hashPassword } from '@/lib/auth';
import { normalizePhone, encryptPhone, maskPhone } from '@/lib/crypto';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    const tm = await prisma.user.findUnique({
      where: { id: params.id },
      include: { assignedLeads: true, siteMappings: true },
    });

    if (!tm || tm.role !== 'TM') {
      return NextResponse.json({ error: 'TM not found' }, { status: 404 });
    }

    const { passwordHash, phoneEncrypted, ...safeTm } = tm as any;
    return NextResponse.json({ tm: safeTm });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request);
    const tmId = params.id;
    const body = await request.json();

    const existingTm = await prisma.user.findUnique({
      where: { id: tmId },
    });
    if (!existingTm) {
      return NextResponse.json({ error: 'TM not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.globalOrder !== undefined) updateData.globalOrder = parseInt(body.globalOrder, 10);
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    let statusToggleNote = '';

    if (body.isDbReceiveOn !== undefined) {
      updateData.isDbReceiveOn = Boolean(body.isDbReceiveOn);
      statusToggleNote += ` isDbReceiveOn: ${existingTm.isDbReceiveOn} -> ${updateData.isDbReceiveOn};`;
    }
    if (body.isSmsReceiveOn !== undefined) {
      updateData.isSmsReceiveOn = Boolean(body.isSmsReceiveOn);
      statusToggleNote += ` isSmsReceiveOn: ${existingTm.isSmsReceiveOn} -> ${updateData.isSmsReceiveOn};`;
    }

    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    if (body.phone) {
      const clean = normalizePhone(body.phone);
      updateData.phoneEncrypted = encryptPhone(clean);
      updateData.phoneMasked = maskPhone(clean);
    }

    const updatedTm = await prisma.user.update({
      where: { id: tmId },
      data: updateData,
    });

    if (statusToggleNote) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      await recordAuditLog({
        userId: admin.id,
        action: 'STATUS_TOGGLE',
        detail: `Admin modified TM ${updatedTm.name} (${updatedTm.loginId}):${statusToggleNote}`,
        ipAddress,
      });
    }

    const { passwordHash, phoneEncrypted, ...safeTm } = updatedTm as any;
    return NextResponse.json({ success: true, tm: safeTm });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false, isDbReceiveOn: false, isSmsReceiveOn: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
