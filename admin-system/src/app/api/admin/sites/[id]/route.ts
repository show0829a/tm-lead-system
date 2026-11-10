import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    const site = await prisma.site.findUnique({
      where: { id: params.id },
      include: {
        tmMappings: {
          include: { tm: true },
        },
      },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    return NextResponse.json({ site });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    const siteId = params.id;
    const body = await request.json();

    const existingSite = await prisma.site.findUnique({
      where: { id: siteId },
    });
    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.domainUrl !== undefined) updateData.domainUrl = body.domainUrl ? String(body.domainUrl).trim() : null;
    if (body.useCustomMapping !== undefined) updateData.useCustomMapping = Boolean(body.useCustomMapping);
    if (body.nextTmId !== undefined) updateData.nextTmId = body.nextTmId;
    if (body.smsTemplate !== undefined) updateData.smsTemplate = body.smsTemplate ? String(body.smsTemplate).trim() : null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    if (body.regenerateApiKey) {
      updateData.apiKey = `sk_site_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    }

    await prisma.site.update({
      where: { id: siteId },
      data: updateData,
    });

    // Update custom TM mappings if provided
    if (Array.isArray(body.tmMappings)) {
      // Remove old mappings
      await prisma.siteTmMapping.deleteMany({
        where: { siteId },
      });

      // Insert new mappings
      for (let i = 0; i < body.tmMappings.length; i++) {
        const item = body.tmMappings[i];
        await prisma.siteTmMapping.create({
          data: {
            siteId,
            tmId: item.tmId,
            orderIndex: item.orderIndex !== undefined ? parseInt(item.orderIndex, 10) : i + 1,
          },
        });
      }

      if (body.tmMappings.length > 0 && !updateData.nextTmId) {
        await prisma.site.update({
          where: { id: siteId },
          data: { nextTmId: body.tmMappings[0].tmId },
        });
      }
    }

    const updated = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        tmMappings: {
          include: { tm: true },
        },
      },
    });

    return NextResponse.json({ success: true, site: updated });
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
    await prisma.site.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
