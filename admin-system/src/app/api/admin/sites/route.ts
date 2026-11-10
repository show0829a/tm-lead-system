import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const sites = await prisma.site.findMany({
      include: {
        tmMappings: {
          include: { tm: true },
        },
        leads: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const safeSites = sites.map((site: any) => {
      const sanitizedMappings = (site.tmMappings || []).map((m: any) => {
        const { passwordHash, phoneEncrypted, ...safeTm } = m.tm || {};
        return {
          id: m.id,
          orderIndex: m.orderIndex,
          tmId: m.tmId,
          tm: safeTm,
        };
      });

      return {
        id: site.id,
        name: site.name,
        domainUrl: site.domainUrl,
        apiKey: site.apiKey,
        useCustomMapping: site.useCustomMapping,
        nextTmId: site.nextTmId,
        smsTemplate: site.smsTemplate,
        isActive: site.isActive,
        createdAt: site.createdAt,
        leadsCount: site.leads?.length || 0,
        tmMappings: sanitizedMappings,
      };
    });

    return NextResponse.json({ sites: safeSites });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const { name, domainUrl, apiKey, useCustomMapping, smsTemplate, tmMappings } = body;

    if (!name) {
      return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    const key = apiKey || `sk_site_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    const site = await prisma.site.create({
      data: {
        name: String(name).trim(),
        domainUrl: domainUrl ? String(domainUrl).trim() : null,
        apiKey: key,
        useCustomMapping: Boolean(useCustomMapping),
        smsTemplate: smsTemplate ? String(smsTemplate).trim() : null,
        isActive: true,
      },
    });

    if (Array.isArray(tmMappings) && tmMappings.length > 0) {
      for (let i = 0; i < tmMappings.length; i++) {
        const item = tmMappings[i];
        await prisma.siteTmMapping.create({
          data: {
            siteId: site.id,
            tmId: item.tmId,
            orderIndex: item.orderIndex !== undefined ? parseInt(item.orderIndex, 10) : i + 1,
          },
        });
      }

      // Default pointer to first mapping TM
      await prisma.site.update({
        where: { id: site.id },
        data: { nextTmId: tmMappings[0].tmId },
      });
    }

    const created = await prisma.site.findUnique({
      where: { id: site.id },
      include: { tmMappings: { include: { tm: true } } },
    });

    return NextResponse.json({ success: true, site: created }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
