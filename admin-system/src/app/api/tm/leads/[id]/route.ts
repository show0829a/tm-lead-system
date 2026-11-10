import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTmOrAdmin, handleAuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireTmOrAdmin(request);
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        site: true,
        memos: {
          include: { author: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Role isolation: TM cannot view leads assigned to another TM
    if (user.role === 'TM' && lead.assignedTmId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this lead' },
        { status: 403 }
      );
    }

    const { phoneEncrypted, phoneHash, ...safeLead } = lead as any;
    return NextResponse.json({ lead: safeLead });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
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

    // Role isolation: TM cannot update leads assigned to another TM
    if (user.role === 'TM' && lead.assignedTmId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot modify leads assigned to another TM' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.estimatedPrice !== undefined) updateData.estimatedPrice = body.estimatedPrice !== null ? parseInt(body.estimatedPrice, 10) : null;
    if (body.carNumber !== undefined) updateData.carNumber = body.carNumber ? String(body.carNumber).trim() : null;
    if (body.carModel !== undefined) updateData.carModel = String(body.carModel).trim();
    if (body.carYear !== undefined) updateData.carYear = body.carYear ? String(body.carYear).trim() : null;
    if (body.mileage !== undefined) updateData.mileage = body.mileage ? String(body.mileage).trim() : null;
    if (body.region !== undefined) updateData.region = body.region ? String(body.region).trim() : null;

    // Optional memo addition in same request
    if (body.memo && String(body.memo).trim()) {
      await prisma.consultMemo.create({
        data: {
          leadId: lead.id,
          authorId: user.id,
          content: String(body.memo).trim(),
        },
      });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: updateData,
      include: {
        site: true,
        memos: {
          include: { author: true },
        },
      },
    });

    const { phoneEncrypted, phoneHash, ...safeLead } = updatedLead as any;
    return NextResponse.json({ success: true, lead: safeLead });
  } catch (error) {
    return handleAuthError(error);
  }
}
