import { prisma } from './db';
import { normalizePhone, encryptPhone, maskPhone, hashPhone } from './crypto';
import { sendAllocationSms } from './sms';
import { recordAuditLog } from './audit';

export interface IngestLeadInput {
  siteId: string;
  customerName: string;
  customerPhone: string;
  carModel: string;
  carNumber?: string | null;
  carYear?: string | null;
  mileage?: string | null;
  region?: string | null;
  extraData?: any;
}

export interface AssignLeadManuallyInput {
  leadId: string;
  targetTmId: string;
  consumeTurn: boolean;
  adminUserId: string;
  ipAddress?: string | null;
}

export interface SetNextPointerInput {
  targetTmId: string;
  siteId?: string | null;
  adminUserId: string;
  ipAddress?: string | null;
}

export class DuplicateLeadError extends Error {
  code = 'DUPLICATE_LEAD';
  statusCode = 409;
  constructor(message = '이미 접수된 연락처입니다. 잠시 후 다시 시도해주세요.') {
    super(message);
    this.name = 'DuplicateLeadError';
  }
}

/**
 * Ingests a new customer lead, guards against duplicate submissions,
 * executes concurrency-safe Round-Robin allocation with PostgreSQL row locks,
 * advances the rotation pointer, and triggers SMS notification.
 */
export async function ingestAndAllocateLead(input: IngestLeadInput) {
  const cleanPhone = normalizePhone(input.customerPhone);
  if (!cleanPhone) {
    throw new Error('Valid customer phone number is required');
  }

  const phoneHash = hashPhone(cleanPhone);
  const phoneEncrypted = encryptPhone(cleanPhone);
  const phoneMasked = maskPhone(cleanPhone);

  // 1. Duplicate submission guard within duplicateBlockMinutes
  const config = await prisma.systemAllocationConfig.findFirst();
  const blockMinutes = config?.duplicateBlockMinutes ?? 10;
  const cutoffTime = new Date(Date.now() - blockMinutes * 60 * 1000);

  const existingDuplicate = await prisma.lead.findFirst({
    where: {
      phoneHash,
      createdAt: { gte: cutoffTime },
    },
  });

  if (existingDuplicate) {
    throw new DuplicateLeadError();
  }

  // 2. Interactive transaction with PostgreSQL row-level lock
  const allocationResult = (await prisma.$transaction(async (tx) => {
    const site = await tx.site.findUnique({
      where: { id: input.siteId },
    });

    if (!site || !site.isActive) {
      throw new Error(`Invalid or inactive site: ${input.siteId}`);
    }

    let candidates: any[] = [];
    let currentPointer: string | null = null;
    const useCustom = Boolean(site.useCustomMapping);

    if (useCustom) {
      // Row lock on sites table
      await tx.$queryRaw`SELECT id, next_tm_id FROM sites WHERE id = ${site.id} FOR UPDATE`;

      const mappings = await tx.siteTmMapping.findMany({
        where: { siteId: site.id },
        orderBy: { orderIndex: 'asc' },
        include: { tm: true },
      });

      candidates = mappings
        .map((m: any) => m.tm)
        .filter((tm: any) => tm && tm.role === 'TM' && tm.isActive);
      currentPointer = site.nextTmId;
    } else {
      // Row lock on system_allocation_config table
      await tx.$queryRaw`SELECT id, next_global_tm_id FROM system_allocation_config WHERE id = 1 FOR UPDATE`;

      candidates = await tx.user.findMany({
        where: { role: 'TM', isActive: true },
        orderBy: { globalOrder: 'asc' },
      });
      currentPointer = config?.nextGlobalTmId || null;
    }

    let assignedTm: any = null;

    if (candidates.length > 0) {
      // Find starting pointer index
      const startIdx = candidates.findIndex((c) => c.id === currentPointer);
      const startIndex = startIdx >= 0 ? startIdx : 0;

      // Deterministic pointer traversal: search for active TM with isDbReceiveOn === true
      for (let offset = 0; offset < candidates.length; offset++) {
        const idx = (startIndex + offset) % candidates.length;
        const candidate = candidates[idx];

        if (candidate.isDbReceiveOn && candidate.isActive) {
          assignedTm = candidate;
          // Advance pointer to the next TM in the cycle
          const nextIdx = (idx + 1) % candidates.length;
          const nextPointerTmId = candidates[nextIdx].id;

          if (useCustom) {
            await tx.site.update({
              where: { id: site.id },
              data: { nextTmId: nextPointerTmId },
            });
          } else {
            await tx.systemAllocationConfig.update({
              where: { id: 1 },
              data: { nextGlobalTmId: nextPointerTmId },
            });
          }
          break;
        }
      }
    }

    // If no eligible TM found (all TMs have isDbReceiveOn === false), save as UNASSIGNED
    const status = assignedTm ? 'NEW' : 'UNASSIGNED';
    const assignedTmId = assignedTm ? assignedTm.id : null;
    const assignedAt = assignedTm ? new Date() : null;

    const lead = await tx.lead.create({
      data: {
        siteId: site.id,
        assignedTmId,
        customerName: input.customerName,
        phoneEncrypted,
        phoneMasked,
        phoneHash,
        carModel: input.carModel,
        carNumber: input.carNumber || null,
        carYear: input.carYear || null,
        mileage: input.mileage || null,
        region: input.region || null,
        extraData: input.extraData || {},
        status,
        assignType: 'AUTO',
        assignedAt,
      },
    });

    return { lead, assignedTm, site };
  })) as { lead: any; assignedTm: any; site: any };

  // 3. Trigger SMS notification if TM is assigned
  let smsLog: any = null;
  if (allocationResult.assignedTm) {
    try {
      smsLog = await sendAllocationSms({
        leadId: allocationResult.lead.id,
        tmId: allocationResult.assignedTm.id,
        siteId: allocationResult.site.id,
      });
    } catch (smsErr) {
      console.error('Failed to send SMS after allocation:', smsErr);
    }
  }

  return {
    lead: allocationResult.lead,
    assignedTm: allocationResult.assignedTm,
    smsLog,
  };
}

/**
 * Manually assigns a lead to a specific TM.
 * If consumeTurn === true, advances the allocation pointer to the next TM.
 */
export async function assignLeadManually({
  leadId,
  targetTmId,
  consumeTurn,
  adminUserId,
  ipAddress,
}: AssignLeadManuallyInput) {
  const targetTm = await prisma.user.findUnique({
    where: { id: targetTmId },
  });
  if (!targetTm || targetTm.role !== 'TM') {
    throw new Error(`Target TM ${targetTmId} is invalid or not a TM`);
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { site: true },
  });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  // Update lead assignment
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedTmId: targetTm.id,
      assignType: 'MANUAL',
      status: lead.status === 'UNASSIGNED' ? 'NEW' : lead.status,
      assignedAt: new Date(),
    },
  });

  // If consumeTurn is true, advance rotation pointer
  if (consumeTurn) {
    const isCustom = Boolean(lead.site?.useCustomMapping);

    if (isCustom && lead.siteId) {
      const mappings = await prisma.siteTmMapping.findMany({
        where: { siteId: lead.siteId },
        orderBy: { orderIndex: 'asc' },
      });
      const targetIdx = mappings.findIndex((m: any) => m.tmId === targetTm.id);
      if (targetIdx >= 0 && mappings.length > 0) {
        const nextIdx = (targetIdx + 1) % mappings.length;
        await prisma.site.update({
          where: { id: lead.siteId },
          data: { nextTmId: mappings[nextIdx].tmId },
        });
      }
    } else {
      const globalTms = await prisma.user.findMany({
        where: { role: 'TM', isActive: true },
        orderBy: { globalOrder: 'asc' },
      });
      const targetIdx = globalTms.findIndex((t: any) => t.id === targetTm.id);
      if (targetIdx >= 0 && globalTms.length > 0) {
        const nextIdx = (targetIdx + 1) % globalTms.length;
        await prisma.systemAllocationConfig.update({
          where: { id: 1 },
          data: { nextGlobalTmId: globalTms[nextIdx].id },
        });
      }
    }
  }

  // Audit log entry
  await recordAuditLog({
    userId: adminUserId,
    leadId: lead.id,
    action: 'MANUAL_ASSIGN',
    detail: `Manual assignment to ${targetTm.name} (${targetTm.loginId}). consumeTurn=${consumeTurn}`,
    ipAddress,
  });

  // Trigger SMS for newly assigned TM
  try {
    await sendAllocationSms({
      leadId: lead.id,
      tmId: targetTm.id,
      siteId: lead.siteId,
    });
  } catch (smsErr) {
    console.error('Failed to send SMS on manual assign:', smsErr);
  }

  return updatedLead;
}

/**
 * Updates the 'Next in Turn' allocation pointer to a specific TM.
 */
export async function setNextPointer({
  targetTmId,
  siteId,
  adminUserId,
  ipAddress,
}: SetNextPointerInput) {
  const targetTm = await prisma.user.findUnique({
    where: { id: targetTmId },
  });
  if (!targetTm || targetTm.role !== 'TM') {
    throw new Error(`Target TM ${targetTmId} is not a valid TM`);
  }

  if (siteId) {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new Error(`Site ${siteId} not found`);

    await prisma.site.update({
      where: { id: siteId },
      data: { nextTmId: targetTmId },
    });

    await recordAuditLog({
      userId: adminUserId,
      action: 'POINTER_CHANGE',
      detail: `Site '${site.name}' pointer set to TM ${targetTm.name} (${targetTm.loginId})`,
      ipAddress,
    });
  } else {
    await prisma.systemAllocationConfig.update({
      where: { id: 1 },
      data: { nextGlobalTmId: targetTmId },
    });

    await recordAuditLog({
      userId: adminUserId,
      action: 'POINTER_CHANGE',
      detail: `Global pointer set to TM ${targetTm.name} (${targetTm.loginId})`,
      ipAddress,
    });
  }

  return { success: true, targetTmId, siteId: siteId || null };
}
