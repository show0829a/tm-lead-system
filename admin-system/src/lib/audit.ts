import { prisma } from './db';

export interface RecordAuditLogInput {
  userId: string;
  leadId?: string | null;
  action: 'VIEW_FULL_PHONE' | 'MANUAL_ASSIGN' | 'POINTER_CHANGE' | 'STATUS_TOGGLE' | string;
  detail?: string | null;
  ipAddress?: string | null;
}

/**
 * Records an audit log entry for sensitive operations
 * (viewing plaintext phone, manual lead assignment, pointer modifications, status toggles).
 */
export async function recordAuditLog({ userId, leadId, action, detail, ipAddress }: RecordAuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        leadId: leadId || null,
        action,
        detail: detail || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
    throw error;
  }
}
