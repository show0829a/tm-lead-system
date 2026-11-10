import { prisma } from './db';
import { decryptPhone } from './crypto';

export interface SendAllocationSmsInput {
  leadId: string;
  tmId: string;
  siteId?: string;
}

export const DEFAULT_SMS_TEMPLATE =
  '[{siteName}] 신규DB 배정\n고객: {customerName} ({customerPhone})\n차량: {carModel} ({carYear})\n지역: {region}';

/**
 * Replaces placeholders in SMS template with actual lead & site values.
 */
export function formatSmsMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Sends or records SMS notification when a lead is assigned to a TM.
 * - If TM has isSmsReceiveOn === false: records SmsLog with status 'SKIPPED'
 * - If TM has isSmsReceiveOn === true: populates template with decrypted customer phone
 *   and records SmsLog with status 'MOCK_SENT' (or 'SENT' if SMS_PROVIDER_MODE=LIVE)
 */
export async function sendAllocationSms({ leadId, tmId }: SendAllocationSmsInput) {
  const tm = await prisma.user.findUnique({
    where: { id: tmId },
  });
  if (!tm) {
    throw new Error(`Target TM ${tmId} not found`);
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { site: true },
  });
  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  // Check if TM has SMS receiving disabled
  if (!tm.isSmsReceiveOn) {
    const skippedLog = await prisma.smsLog.create({
      data: {
        leadId: lead.id,
        tmId: tm.id,
        receiverPhoneMasked: tm.phoneMasked || '010-****-0000',
        message: '(발송 생략: TM SMS 수신 OFF 상태)',
        status: 'SKIPPED',
        errorMessage: null,
      },
    });
    return skippedLog;
  }

  // Determine SMS template: Site template > SystemAllocationConfig > Fallback
  let template = lead.site?.smsTemplate?.trim();
  if (!template) {
    const config = await prisma.systemAllocationConfig.findFirst();
    template = config?.defaultSmsTemplate?.trim() || DEFAULT_SMS_TEMPLATE;
  }

  // Decrypt customer phone for direct calling
  let plainCustomerPhone = lead.phoneMasked;
  try {
    plainCustomerPhone = decryptPhone(lead.phoneEncrypted);
  } catch (err) {
    console.error('Failed to decrypt customer phone for SMS:', err);
  }

  const vars: Record<string, string> = {
    siteName: lead.site?.name || '신규 사이트',
    customerName: lead.customerName || '고객',
    customerPhone: plainCustomerPhone,
    carModel: lead.carModel || '차량',
    carYear: lead.carYear || '미정',
    region: lead.region || '전국',
  };

  const message = formatSmsMessage(template, vars);

  const mode = process.env.SMS_PROVIDER_MODE || 'MOCK';
  const status = mode === 'LIVE' ? 'SENT' : 'MOCK_SENT';

  const log = await prisma.smsLog.create({
    data: {
      leadId: lead.id,
      tmId: tm.id,
      receiverPhoneMasked: tm.phoneMasked || '010-****-0000',
      message,
      status,
      errorMessage: null,
    },
  });

  return log;
}
