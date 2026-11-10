import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ingestAndAllocateLead, DuplicateLeadError } from '@/lib/allocation-engine';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Site-Api-Key',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawApiKey = request.headers.get('x-site-api-key');
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = rawApiKey || body?.apiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'X-Site-Api-Key header or apiKey body field is required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const site = await prisma.site.findUnique({
      where: { apiKey },
    });

    if (!site || !site.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive site API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { customerName, customerPhone, carModel, carNumber, carYear, mileage, region, extraData } = body;

    if (!customerName || !customerPhone || !carModel) {
      return NextResponse.json(
        { error: 'customerName, customerPhone, and carModel are required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await ingestAndAllocateLead({
      siteId: site.id,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      carModel: String(carModel).trim(),
      carNumber: carNumber ? String(carNumber).trim() : null,
      carYear: carYear ? String(carYear).trim() : null,
      mileage: mileage ? String(mileage).trim() : null,
      region: region ? String(region).trim() : null,
      extraData: extraData || {},
    });

    return NextResponse.json(
      {
        success: true,
        leadId: result.lead.id,
        status: result.lead.status,
        assignedTm: result.assignedTm
          ? {
              id: result.assignedTm.id,
              name: result.assignedTm.name,
            }
          : null,
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error: any) {
    if (error instanceof DuplicateLeadError || error.code === 'DUPLICATE_LEAD') {
      return NextResponse.json(
        {
          error: 'DUPLICATE_LEAD',
          message: error.message || '이미 접수된 연락처입니다.',
        },
        { status: 409, headers: corsHeaders }
      );
    }

    console.error('API /api/v1/leads error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
