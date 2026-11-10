import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTmOrAdmin, handleAuthError } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireTmOrAdmin(request);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return NextResponse.json({
      isDbReceiveOn: dbUser?.isDbReceiveOn ?? true,
      isSmsReceiveOn: dbUser?.isSmsReceiveOn ?? true,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireTmOrAdmin(request);
    const body = await request.json();

    const updateData: any = {};
    let changeDetails = '';

    if (body.isDbReceiveOn !== undefined) {
      updateData.isDbReceiveOn = Boolean(body.isDbReceiveOn);
      changeDetails += ` isDbReceiveOn: ${user.isDbReceiveOn} -> ${updateData.isDbReceiveOn};`;
    }
    if (body.isSmsReceiveOn !== undefined) {
      updateData.isSmsReceiveOn = Boolean(body.isSmsReceiveOn);
      changeDetails += ` isSmsReceiveOn: ${user.isSmsReceiveOn} -> ${updateData.isSmsReceiveOn};`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    if (changeDetails) {
      await recordAuditLog({
        userId: user.id,
        action: 'STATUS_TOGGLE',
        detail: `User ${user.name} (${user.loginId}) self-toggled status:${changeDetails}`,
        ipAddress,
      });
    }

    return NextResponse.json({
      success: true,
      isDbReceiveOn: updatedUser.isDbReceiveOn,
      isSmsReceiveOn: updatedUser.isSmsReceiveOn,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
