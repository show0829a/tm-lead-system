import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const tmId = searchParams.get('tmId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (tmId && tmId !== 'ALL') where.tmId = tmId;

    const [total, logs, config] = await Promise.all([
      prisma.smsLog.count({ where }),
      prisma.smsLog.findMany({
        where,
        include: {
          lead: {
            include: { site: true },
          },
          tm: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.systemAllocationConfig.findFirst(),
    ]);

    const sanitizedLogs = logs.map((log: any) => {
      const { passwordHash, phoneEncrypted, ...safeTm } = log.tm || {};
      const { phoneEncrypted: _, phoneHash: __, ...safeLead } = log.lead || {};
      return {
        ...log,
        tm: safeTm,
        lead: safeLead,
      };
    });

    return NextResponse.json({
      logs: sanitizedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      defaultSmsTemplate: config?.defaultSmsTemplate || '',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    if (body.defaultSmsTemplate !== undefined) {
      await prisma.systemAllocationConfig.update({
        where: { id: 1 },
        data: {
          defaultSmsTemplate: String(body.defaultSmsTemplate),
        },
      });
    }

    const config = await prisma.systemAllocationConfig.findFirst();
    return NextResponse.json({ success: true, defaultSmsTemplate: config?.defaultSmsTemplate });
  } catch (error) {
    return handleAuthError(error);
  }
}
