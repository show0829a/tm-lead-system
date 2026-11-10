import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTmOrAdmin, handleAuthError } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireTmOrAdmin(request);
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (user.role === 'TM' && lead.assignedTmId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot add memos to a lead not assigned to you' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = body.content ? String(body.content).trim() : '';

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    const memo = await prisma.consultMemo.create({
      data: {
        leadId: lead.id,
        authorId: user.id,
        content,
      },
      include: {
        author: true,
      },
    });

    if (body.leadStatus) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: body.leadStatus },
      });
    }

    const { passwordHash, phoneEncrypted, ...safeAuthor } = memo.author || {};
    return NextResponse.json({
      success: true,
      memo: {
        ...memo,
        author: safeAuthor,
      },
    }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
