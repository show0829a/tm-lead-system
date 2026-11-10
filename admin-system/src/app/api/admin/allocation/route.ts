import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { setNextPointer } from '@/lib/allocation-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const config = await prisma.systemAllocationConfig.findFirst();
    const tms = await prisma.user.findMany({
      where: { role: 'TM', isActive: true },
      orderBy: { globalOrder: 'asc' },
    });

    const nextGlobalTm = tms.find((t) => t.id === config?.nextGlobalTmId) || null;

    // Sanitize TMs
    const sanitizedTms = tms.map((tm) => {
      const { passwordHash, phoneEncrypted, ...safeTm } = tm as any;
      return safeTm;
    });

    return NextResponse.json({
      config,
      nextGlobalTm: nextGlobalTm ? { id: nextGlobalTm.id, name: nextGlobalTm.name, loginId: nextGlobalTm.loginId } : null,
      tms: sanitizedTms,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const { targetTmId, siteId, defaultSmsTemplate, duplicateBlockMinutes } = body;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    if (targetTmId) {
      await setNextPointer({
        targetTmId,
        siteId,
        adminUserId: admin.id,
        ipAddress,
      });
    }

    if (defaultSmsTemplate !== undefined || duplicateBlockMinutes !== undefined) {
      const updateData: any = {};
      if (defaultSmsTemplate !== undefined) updateData.defaultSmsTemplate = String(defaultSmsTemplate);
      if (duplicateBlockMinutes !== undefined) updateData.duplicateBlockMinutes = parseInt(duplicateBlockMinutes, 10);

      await prisma.systemAllocationConfig.update({
        where: { id: 1 },
        data: updateData,
      });
    }

    const updatedConfig = await prisma.systemAllocationConfig.findFirst();

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
