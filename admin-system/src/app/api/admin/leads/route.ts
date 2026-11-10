import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { normalizePhone, encryptPhone, maskPhone, hashPhone } from '@/lib/crypto';
import { sendAllocationSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const siteId = searchParams.get('siteId')?.trim();
    const tmId = searchParams.get('tmId')?.trim();
    const status = searchParams.get('status')?.trim();
    const startDate = searchParams.get('startDate')?.trim();
    const endDate = searchParams.get('endDate')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (siteId && siteId !== 'ALL') {
      where.siteId = siteId;
    }

    if (tmId && tmId !== 'ALL') {
      if (tmId === 'UNASSIGNED' || tmId === 'null') {
        where.assignedTmId = null;
      } else {
        where.assignedTmId = tmId;
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
        { region: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, leads, allLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          site: true,
          assignedTm: true,
          memos: {
            include: { author: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.findMany(),
    ]);

    // Compute summary stats for dashboard header
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = allLeads.filter((l) => new Date(l.createdAt).getTime() >= today.getTime()).length;
    const unassignedCount = allLeads.filter((l) => l.status === 'UNASSIGNED' || !l.assignedTmId).length;
    const completedCount = allLeads.filter((l) => l.status === 'COMPLETED').length;

    // Sanitize: strip phoneEncrypted and internal hashes from lead objects
    const sanitizedLeads = leads.map((lead) => {
      const { phoneEncrypted, phoneHash, ...rest } = lead as any;
      return rest;
    });

    return NextResponse.json({
      leads: sanitizedLeads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalCount: allLeads.length,
        todayCount,
        unassignedCount,
        completedCount,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();

    const { customerName, customerPhone, carModel, siteId, assignedTmId, carNumber, carYear, mileage, region } = body;

    if (!customerName || !customerPhone || !carModel || !siteId) {
      return NextResponse.json(
        { error: 'customerName, customerPhone, carModel, and siteId are required' },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(customerPhone);
    const phoneEncrypted = encryptPhone(cleanPhone);
    const phoneMasked = maskPhone(cleanPhone);
    const phoneHash = hashPhone(cleanPhone);

    const status = assignedTmId ? 'NEW' : 'UNASSIGNED';

    const lead = await prisma.lead.create({
      data: {
        siteId,
        assignedTmId: assignedTmId || null,
        customerName: String(customerName).trim(),
        phoneEncrypted,
        phoneMasked,
        phoneHash,
        carModel: String(carModel).trim(),
        carNumber: carNumber ? String(carNumber).trim() : null,
        carYear: carYear ? String(carYear).trim() : null,
        mileage: mileage ? String(mileage).trim() : null,
        region: region ? String(region).trim() : null,
        status,
        assignType: 'MANUAL',
        assignedAt: assignedTmId ? new Date() : null,
      },
      include: {
        site: true,
        assignedTm: true,
      },
    });

    if (assignedTmId) {
      try {
        await sendAllocationSms({
          leadId: lead.id,
          tmId: assignedTmId,
          siteId,
        });
      } catch (err) {
        console.error('Failed to send SMS for manual admin intake:', err);
      }
    }

    const { phoneEncrypted: _, phoneHash: __, ...safeLead } = lead as any;
    return NextResponse.json({ success: true, lead: safeLead }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
