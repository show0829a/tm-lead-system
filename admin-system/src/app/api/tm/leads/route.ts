import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTmOrAdmin, handleAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireTmOrAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const search = searchParams.get('search')?.trim();

    const where: any = {};

    // TM users can ONLY view leads assigned to themselves
    if (user.role === 'TM') {
      where.assignedTmId = user.id;
    } else {
      const targetTmId = searchParams.get('tmId')?.trim();
      if (targetTmId) {
        where.assignedTmId = targetTmId;
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { carModel: { contains: search } },
        { carNumber: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        site: true,
        memos: {
          include: { author: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedLeads = leads.map((lead: any) => {
      const { phoneEncrypted, phoneHash, ...safeLead } = lead;
      const sanitizedMemos = (safeLead.memos || []).map((memo: any) => {
        const { passwordHash, phoneEncrypted, ...safeAuthor } = memo.author || {};
        return {
          ...memo,
          author: safeAuthor,
        };
      });
      return {
        ...safeLead,
        memos: sanitizedMemos,
      };
    });

    return NextResponse.json({
      leads: sanitizedLeads,
      count: sanitizedLeads.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
