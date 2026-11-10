import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError, hashPassword } from '@/lib/auth';
import { normalizePhone, encryptPhone, maskPhone } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const tms = await prisma.user.findMany({
      where: { role: 'TM' },
      orderBy: { globalOrder: 'asc' },
      include: {
        assignedLeads: true,
      },
    });

    const sanitizedTms = tms.map((tm: any) => {
      const { passwordHash, phoneEncrypted, assignedLeads, ...safeTm } = tm;
      return {
        ...safeTm,
        assignedLeadsCount: assignedLeads?.length || 0,
      };
    });

    return NextResponse.json({ tms: sanitizedTms });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const { loginId, password, name, phone, globalOrder, isDbReceiveOn, isSmsReceiveOn } = body;

    if (!loginId || !password || !name) {
      return NextResponse.json(
        { error: 'loginId, password, and name are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { loginId },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'User with this loginId already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const cleanPhone = normalizePhone(phone || '01012345678');
    const phoneEncrypted = encryptPhone(cleanPhone);
    const phoneMasked = maskPhone(cleanPhone);

    // Compute next global order if not provided
    let order = globalOrder;
    if (order === undefined || order === null) {
      const maxTm = await prisma.user.findFirst({
        where: { role: 'TM' },
        orderBy: { globalOrder: 'desc' },
      });
      order = (maxTm?.globalOrder || 0) + 1;
    }

    const newTm = await prisma.user.create({
      data: {
        loginId: String(loginId).trim(),
        passwordHash,
        name: String(name).trim(),
        phoneEncrypted,
        phoneMasked,
        role: 'TM',
        globalOrder: parseInt(order, 10),
        isDbReceiveOn: isDbReceiveOn !== undefined ? Boolean(isDbReceiveOn) : true,
        isSmsReceiveOn: isSmsReceiveOn !== undefined ? Boolean(isSmsReceiveOn) : true,
        isActive: true,
      },
    });

    const { passwordHash: _, phoneEncrypted: __, ...safeTm } = newTm as any;
    return NextResponse.json({ success: true, tm: safeTm }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
