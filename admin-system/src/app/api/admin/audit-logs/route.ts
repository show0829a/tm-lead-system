import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action')?.trim();
    const userId = searchParams.get('userId')?.trim();
    const leadId = searchParams.get('leadId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action && action !== 'ALL') where.action = action;
    if (userId && userId !== 'ALL') where.userId = userId;
    if (leadId && leadId !== 'ALL') where.leadId = leadId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: true,
          lead: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const sanitizedLogs = logs.map((log: any) => {
      const { passwordHash, phoneEncrypted, ...safeUser } = log.user || {};
      const { phoneEncrypted: _, phoneHash: __, ...safeLead } = log.lead || {};
      return {
        ...log,
        user: safeUser,
        lead: safeLead,
      };
    });

    return NextResponse.json({
      auditLogs: sanitizedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
