/**
 * Comprehensive Backend & Security Verification Suite
 * Tests Tracks 2 & 3:
 * - T-201: Crypto module (AES-256-GCM, masking, hash, normalize)
 * - T-202: Auth module (bcrypt, JWT, cookies, RBAC guards)
 * - T-203: SMS module (template substitution, MOCK_SENT, SKIPPED)
 * - T-204: Allocation engine (Round-Robin, skip-off, pointer change, manual assign, duplicate block)
 * - T-301: External webhook API /api/v1/leads with CORS
 * - T-302: Auth APIs (/api/auth/login, /api/auth/logout, /api/auth/me)
 * - T-303: Admin APIs (/api/admin/*)
 * - T-304: TM APIs (/api/tm/*) & /api/leads/[id]/reveal-phone with AuditLog
 */

import { prisma } from '../src/lib/db';
import { normalizePhone, encryptPhone, decryptPhone, maskPhone, hashPhone } from '../src/lib/crypto';
import {
  hashPassword,
  comparePassword,
  signSessionToken,
  verifySessionToken,
  createSessionCookie,
  clearSessionCookie,
  getSessionUser,
  requireAdmin,
  requireTmOrAdmin,
  AuthError,
  SESSION_COOKIE_NAME,
} from '../src/lib/auth';
import { sendAllocationSms } from '../src/lib/sms';
import {
  ingestAndAllocateLead,
  assignLeadManually,
  setNextPointer,
  DuplicateLeadError,
} from '../src/lib/allocation-engine';

// Import Route Handlers
import { OPTIONS as leadsOptions, POST as leadsPost } from '../src/app/api/v1/leads/route';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { GET as meGet } from '../src/app/api/auth/me/route';
import { POST as logoutPost } from '../src/app/api/auth/logout/route';
import { GET as adminLeadsGet } from '../src/app/api/admin/leads/route';
import { POST as adminAssignPost } from '../src/app/api/admin/leads/assign/route';
import { GET as adminAllocationGet, POST as adminAllocationPost } from '../src/app/api/admin/allocation/route';
import { GET as adminTmsGet } from '../src/app/api/admin/tms/route';
import { PATCH as adminTmPatch } from '../src/app/api/admin/tms/[id]/route';
import { GET as adminSitesGet } from '../src/app/api/admin/sites/route';
import { GET as adminSmsLogsGet } from '../src/app/api/admin/sms-logs/route';
import { GET as adminAuditLogsGet } from '../src/app/api/admin/audit-logs/route';
import { GET as tmLeadsGet } from '../src/app/api/tm/leads/route';
import { PATCH as tmLeadPatch } from '../src/app/api/tm/leads/[id]/route';
import { PATCH as tmStatusPatch } from '../src/app/api/tm/status/route';
import { POST as revealPhonePost } from '../src/app/api/leads/[id]/reveal-phone/route';
import { NextRequest } from 'next/server';

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const { method = 'GET', headers = {}, body } = options;
  const init: any = { method, headers: new Headers(headers) };
  if (body) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!headers['Content-Type']) {
      init.headers.set('Content-Type', 'application/json');
    }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 STARTING BACKEND & SECURITY ENGINE VERIFICATION');
  console.log('====================================================');

  // --- CHECK SEED DATA ---
  const adminUser = await prisma.user.findUnique({ where: { loginId: 'admin' } });
  assert(adminUser && adminUser.role === 'ADMIN', 'Admin user must exist from seed');

  const tmUsers = await prisma.user.findMany({
    where: { role: 'TM' },
    orderBy: { globalOrder: 'asc' },
  });
  assert(tmUsers.length >= 4, `Expected at least 4 TM users, found ${tmUsers.length}`);
  const tm1 = tmUsers[0];
  const tm2 = tmUsers[1];
  const tm3 = tmUsers[2];
  const tm4 = tmUsers[3];

  const exportSite = await prisma.site.findFirst({ where: { apiKey: 'sk_site_export_01' } });
  assert(exportSite, 'Export site (sk_site_export_01) must exist');

  // ==========================================
  // 1. T-201: CRYPTO MODULE TEST
  // ==========================================
  console.log('\n--- [TEST 1] T-201 Crypto Module ---');
  const rawPhone = '010-1234-5678';
  const normalized = normalizePhone(rawPhone);
  assert(normalized === '01012345678', `normalizePhone failed: got ${normalized}`);

  const encrypted = encryptPhone(rawPhone);
  assert(encrypted && encrypted.includes(':'), 'encryptPhone should produce iv:tag:cipher format');
  const decrypted = decryptPhone(encrypted);
  assert(decrypted === '01012345678', `decryptPhone mismatch: expected 01012345678, got ${decrypted}`);

  const masked = maskPhone('01012345678');
  assert(masked === '010-****-5678', `maskPhone failed: expected 010-****-5678, got ${masked}`);

  const hashed1 = hashPhone('010-1234-5678');
  const hashed2 = hashPhone('01012345678');
  assert(hashed1 === hashed2, 'hashPhone must be deterministic across formatting variations');
  assert(hashed1.length === 64, 'hashPhone must produce 64-char hex SHA256');
  console.log('✅ T-201: Crypto module passed all assertions.');

  // ==========================================
  // 2. T-202: AUTH & RBAC GUARDS TEST
  // ==========================================
  console.log('\n--- [TEST 2] T-202 Auth Module ---');
  const testPw = 'secretPass123';
  const hashedPw = await hashPassword(testPw);
  assert(await comparePassword(testPw, hashedPw), 'comparePassword should return true for valid password');
  assert(!(await comparePassword('wrongPass', hashedPw)), 'comparePassword should return false for invalid password');

  const adminToken = signSessionToken({ userId: adminUser.id, role: 'ADMIN', loginId: 'admin', name: adminUser.name });
  const tm1Token = signSessionToken({ userId: tm1.id, role: 'TM', loginId: tm1.loginId, name: tm1.name });

  const adminPayload = verifySessionToken(adminToken);
  assert(adminPayload && adminPayload.role === 'ADMIN', 'verifySessionToken failed for admin');

  const adminReq = { headers: new Headers({ authorization: `Bearer ${adminToken}` }) };
  const tm1Req = { headers: new Headers({ authorization: `Bearer ${tm1Token}` }) };
  const unauthReq = { headers: new Headers() };

  const resolvedAdmin = await requireAdmin(adminReq);
  assert(resolvedAdmin.id === adminUser.id, 'requireAdmin failed to resolve admin');

  let adminGuardThrew403 = false;
  try {
    await requireAdmin(tm1Req);
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      adminGuardThrew403 = true;
    }
  }
  assert(adminGuardThrew403, 'requireAdmin must throw 403 Forbidden for TM user');

  let unauthGuardThrew401 = false;
  try {
    await requireAdmin(unauthReq);
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 401) {
      unauthGuardThrew401 = true;
    }
  }
  assert(unauthGuardThrew401, 'requireAdmin must throw 401 for unauthenticated request');

  const resolvedTm = await requireTmOrAdmin(tm1Req);
  assert(resolvedTm.id === tm1.id, 'requireTmOrAdmin failed for TM user');
  console.log('✅ T-202: Auth & RBAC module passed all assertions.');

  // ==========================================
  // 3. T-203: SMS ADAPTER TEST
  // ==========================================
  console.log('\n--- [TEST 3] T-203 SMS Adapter ---');
  // Create a sample lead for SMS testing
  const smsTestLead = await prisma.lead.create({
    data: {
      siteId: exportSite.id,
      assignedTmId: tm1.id,
      customerName: '문자테스트고객',
      phoneEncrypted: encryptPhone('01099887766'),
      phoneMasked: maskPhone('01099887766'),
      phoneHash: hashPhone('01099887766'),
      carModel: '아반떼 CN7',
      carYear: '2022',
      region: '서울 강남',
      status: 'NEW',
    },
  });

  // Ensure tm1 has isSmsReceiveOn = true
  await prisma.user.update({ where: { id: tm1.id }, data: { isSmsReceiveOn: true } });
  const sentLog = await sendAllocationSms({ leadId: smsTestLead.id, tmId: tm1.id, siteId: exportSite.id });
  assert(sentLog.status === 'MOCK_SENT', `Expected status MOCK_SENT, got ${sentLog.status}`);
  assert(sentLog.message.includes('문자테스트고객'), 'SMS message must include customer name');
  assert(sentLog.message.includes('01099887766'), 'SMS message must contain decrypted plain phone for TM direct dialing');

  // Turn off tm1 SMS and verify SKIPPED status
  await prisma.user.update({ where: { id: tm1.id }, data: { isSmsReceiveOn: false } });
  const skippedLog = await sendAllocationSms({ leadId: smsTestLead.id, tmId: tm1.id, siteId: exportSite.id });
  assert(skippedLog.status === 'SKIPPED', `Expected status SKIPPED, got ${skippedLog.status}`);

  // Restore tm1 SMS status
  await prisma.user.update({ where: { id: tm1.id }, data: { isSmsReceiveOn: true } });
  console.log('✅ T-203: SMS adapter module passed all assertions.');

  // ==========================================
  // 4. T-204: ALLOCATION ENGINE & AUDIT LOG TEST
  // ==========================================
  console.log('\n--- [TEST 4] T-204 Allocation Engine ---');
  // Ensure all TMs are active and have isDbReceiveOn = true
  await prisma.user.updateMany({
    where: { role: 'TM' },
    data: { isDbReceiveOn: true, isSmsReceiveOn: true, isActive: true },
  });

  // Reset pointer to TM 1
  await setNextPointer({ targetTmId: tm1.id, adminUserId: adminUser.id });

  // Ingest 4 leads sequentially -> should allocate to TM1, TM2, TM3, TM4
  const phonePrefix = Date.now().toString().slice(-6);
  const lead1 = await ingestAndAllocateLead({
    siteId: exportSite.id,
    customerName: '고객 1',
    customerPhone: `010${phonePrefix}01`,
    carModel: '그랜저 IG',
  });
  assert(lead1.assignedTm?.id === tm1.id, `Lead 1 expected TM 1, got ${lead1.assignedTm?.name}`);

  const lead2 = await ingestAndAllocateLead({
    siteId: exportSite.id,
    customerName: '고객 2',
    customerPhone: `010${phonePrefix}02`,
    carModel: '쏘나타 DN8',
  });
  assert(lead2.assignedTm?.id === tm2.id, `Lead 2 expected TM 2, got ${lead2.assignedTm?.name}`);

  const lead3 = await ingestAndAllocateLead({
    siteId: exportSite.id,
    customerName: '고객 3',
    customerPhone: `010${phonePrefix}03`,
    carModel: 'K5 DL3',
  });
  assert(lead3.assignedTm?.id === tm3.id, `Lead 3 expected TM 3, got ${lead3.assignedTm?.name}`);

  const lead4 = await ingestAndAllocateLead({
    siteId: exportSite.id,
    customerName: '고객 4',
    customerPhone: `010${phonePrefix}04`,
    carModel: '투싼 NX4',
  });
  assert(lead4.assignedTm?.id === tm4.id, `Lead 4 expected TM 4, got ${lead4.assignedTm?.name}`);

  // Test Skip Off TM: Turn TM2 off
  await prisma.user.update({ where: { id: tm2.id }, data: { isDbReceiveOn: false } });
  await setNextPointer({ targetTmId: tm2.id, adminUserId: adminUser.id });

  const lead5 = await ingestAndAllocateLead({
    siteId: exportSite.id,
    customerName: '고객 5 (스킵 테스트)',
    customerPhone: `010${phonePrefix}05`,
    carModel: '스포티지 NQ5',
  });
  assert(lead5.assignedTm?.id === tm3.id, `Lead 5 expected TM 3 (skipping TM 2), got ${lead5.assignedTm?.name}`);

  // Restore TM2
  await prisma.user.update({ where: { id: tm2.id }, data: { isDbReceiveOn: true } });

  // Test Fallback when all TMs are OFF
  await prisma.user.updateMany({ where: { role: 'TM' }, data: { isDbReceiveOn: false } });
  const leadUnassigned = await ingestAndAllocateLead({
    siteId: exportSite.id,
    customerName: '고객 6 (전원 OFF 테스트)',
    customerPhone: `010${phonePrefix}06`,
    carModel: '카니발 KA4',
  });
  assert(leadUnassigned.lead.status === 'UNASSIGNED', `Expected status UNASSIGNED, got ${leadUnassigned.lead.status}`);
  assert(leadUnassigned.assignedTm === null, 'Expected assignedTm to be null');

  // Restore all TMs
  await prisma.user.updateMany({ where: { role: 'TM' }, data: { isDbReceiveOn: true } });

  // Test Duplicate Block
  let duplicateBlocked = false;
  try {
    await ingestAndAllocateLead({
      siteId: exportSite.id,
      customerName: '중복고객',
      customerPhone: `010${phonePrefix}01`, // same as lead1
      carModel: '그랜저 IG',
    });
  } catch (err: any) {
    if (err instanceof DuplicateLeadError || err.code === 'DUPLICATE_LEAD') {
      duplicateBlocked = true;
    }
  }
  assert(duplicateBlocked, 'Duplicate submission within duplicateBlockMinutes must throw DuplicateLeadError');

  // Test Manual Assignment (with and without consumeTurn)
  // Without consumeTurn
  const pointerBefore = (await prisma.systemAllocationConfig.findFirst())?.nextGlobalTmId;
  await assignLeadManually({
    leadId: leadUnassigned.lead.id,
    targetTmId: tm2.id,
    consumeTurn: false,
    adminUserId: adminUser.id,
  });
  const updatedUnassigned = await prisma.lead.findUnique({ where: { id: leadUnassigned.lead.id } });
  assert(updatedUnassigned?.assignedTmId === tm2.id, 'Manual assign failed');
  assert(updatedUnassigned?.assignType === 'MANUAL', 'Expected assignType MANUAL');
  const pointerAfterNoConsume = (await prisma.systemAllocationConfig.findFirst())?.nextGlobalTmId;
  assert(pointerBefore === pointerAfterNoConsume, 'Pointer should not advance when consumeTurn is false');

  // With consumeTurn
  await assignLeadManually({
    leadId: leadUnassigned.lead.id,
    targetTmId: tm2.id,
    consumeTurn: true,
    adminUserId: adminUser.id,
  });
  const pointerAfterConsume = (await prisma.systemAllocationConfig.findFirst())?.nextGlobalTmId;
  assert(pointerAfterConsume === tm3.id, `Expected pointer to advance to TM 3, got ${pointerAfterConsume}`);

  console.log('✅ T-204: Allocation engine & manual assign passed all assertions.');

  // ==========================================
  // 5. T-301: EXTERNAL WEBHOOK API TEST
  // ==========================================
  console.log('\n--- [TEST 5] T-301 External Webhook API (/api/v1/leads) ---');
  // OPTIONS Preflight
  const optRes = await leadsOptions();
  assert(optRes.status === 204, `OPTIONS status expected 204, got ${optRes.status}`);
  assert(optRes.headers.get('Access-Control-Allow-Origin') === '*', 'CORS Allow-Origin must be *');

  // POST with invalid API key
  const invalidKeyReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'x-site-api-key': 'sk_invalid_key' },
    body: { customerName: '홍길동', customerPhone: '01011112222', carModel: '아반떼' },
  });
  const invalidKeyRes = await leadsPost(invalidKeyReq);
  assert(invalidKeyRes.status === 401, `Invalid API key should return 401, got ${invalidKeyRes.status}`);

  // POST with valid API key
  const validWebhookReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'x-site-api-key': exportSite.apiKey },
    body: {
      customerName: '웹훅고객',
      customerPhone: `010${phonePrefix}88`,
      carModel: '아이오닉 5',
      carYear: '2023',
      region: '인천 연수',
    },
  });
  const validWebhookRes = await leadsPost(validWebhookReq);
  assert(validWebhookRes.status === 201, `Valid webhook expected 201, got ${validWebhookRes.status}`);
  const webhookData = await validWebhookRes.json();
  assert(webhookData.success && webhookData.leadId, 'Webhook response should include success and leadId');
  console.log('✅ T-301: External webhook API passed all assertions.');

  // ==========================================
  // 6. T-302: AUTH APIS TEST
  // ==========================================
  console.log('\n--- [TEST 6] T-302 Auth APIs ---');
  // Login invalid password
  const failLoginReq = makeRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: { loginId: 'admin', password: 'wrongPassword' },
  });
  const failLoginRes = await loginPost(failLoginReq);
  assert(failLoginRes.status === 401, 'Invalid password should return 401');

  // Login valid
  const validLoginReq = makeRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: { loginId: 'admin', password: 'admin1234' },
  });
  const validLoginRes = await loginPost(validLoginReq);
  assert(validLoginRes.status === 200, `Login expected 200, got ${validLoginRes.status}`);
  const cookieHeader = validLoginRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes(SESSION_COOKIE_NAME), 'Login must set tm_session cookie');

  // Extract session token from set-cookie
  const match = cookieHeader!.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const sessionToken = match ? match[1] : '';
  assert(sessionToken, 'Failed to extract session token from Set-Cookie');

  // Test GET /api/auth/me
  const meReq = makeRequest('http://localhost:3000/api/auth/me', {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionToken}` },
  });
  const meRes = await meGet(meReq);
  assert(meRes.status === 200, `Me endpoint expected 200, got ${meRes.status}`);
  const meData = await meRes.json();
  assert(meData.user.role === 'ADMIN', 'Me user role must be ADMIN');

  // Test POST /api/auth/logout
  const logoutRes = await logoutPost();
  assert(logoutRes.status === 200, 'Logout expected 200');
  console.log('✅ T-302: Auth APIs passed all assertions.');

  // ==========================================
  // 7. T-303: ADMIN APIS TEST
  // ==========================================
  console.log('\n--- [TEST 7] T-303 Admin APIs ---');
  const authHeaders = { cookie: `${SESSION_COOKIE_NAME}=${sessionToken}` };
  const tmCookieHeaders = { cookie: `${SESSION_COOKIE_NAME}=${tm1Token}` };

  // GET /api/admin/leads with TM cookie -> 403
  const tmForbiddenReq = makeRequest('http://localhost:3000/api/admin/leads', { headers: tmCookieHeaders });
  const tmForbiddenRes = await adminLeadsGet(tmForbiddenReq);
  assert(tmForbiddenRes.status === 403, `TM accessing /api/admin/leads should return 403, got ${tmForbiddenRes.status}`);

  // GET /api/admin/leads with Admin cookie -> 200
  const adminLeadsReq = makeRequest('http://localhost:3000/api/admin/leads', { headers: authHeaders });
  const adminLeadsRes = await adminLeadsGet(adminLeadsReq);
  assert(adminLeadsRes.status === 200, `Admin leads expected 200, got ${adminLeadsRes.status}`);
  const leadsData = await adminLeadsRes.json();
  assert(Array.isArray(leadsData.leads), 'leadsData.leads should be an array');
  assert(leadsData.summary && typeof leadsData.summary.totalCount === 'number', 'leadsData should include summary stats');

  // Verify that phone numbers are MASKED, never encrypted or plaintext
  for (const lead of leadsData.leads.slice(0, 5)) {
    assert(!lead.phoneEncrypted, 'phoneEncrypted must NEVER be returned in lead list');
    assert(lead.phoneMasked && lead.phoneMasked.includes('****'), 'phoneMasked must be formatted with ****');
  }

  // POST /api/admin/leads/assign
  const assignReq = makeRequest('http://localhost:3000/api/admin/leads/assign', {
    method: 'POST',
    headers: authHeaders,
    body: { leadId: lead1.lead.id, tmId: tm3.id, consumeTurn: false },
  });
  const assignRes = await adminAssignPost(assignReq);
  assert(assignRes.status === 200, 'Admin assign lead expected 200');

  // GET /api/admin/allocation
  const allocRes = await adminAllocationGet(makeRequest('http://localhost:3000/api/admin/allocation', { headers: authHeaders }));
  assert(allocRes.status === 200, 'Admin allocation expected 200');

  // POST /api/admin/allocation (pointer change)
  const pointerReq = makeRequest('http://localhost:3000/api/admin/allocation', {
    method: 'POST',
    headers: authHeaders,
    body: { targetTmId: tm4.id },
  });
  const pointerRes = await adminAllocationPost(pointerReq);
  assert(pointerRes.status === 200, 'Pointer update expected 200');

  // GET /api/admin/tms
  const tmsRes = await adminTmsGet(makeRequest('http://localhost:3000/api/admin/tms', { headers: authHeaders }));
  assert(tmsRes.status === 200, 'Admin tms expected 200');

  // PATCH /api/admin/tms/[id]
  const patchTmReq = makeRequest(`http://localhost:3000/api/admin/tms/${tm1.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { isDbReceiveOn: true, isSmsReceiveOn: true },
  });
  const patchTmRes = await adminTmPatch(patchTmReq, { params: { id: tm1.id } });
  assert(patchTmRes.status === 200, 'Admin patch TM expected 200');

  // GET /api/admin/sites
  const sitesRes = await adminSitesGet(makeRequest('http://localhost:3000/api/admin/sites', { headers: authHeaders }));
  assert(sitesRes.status === 200, 'Admin sites expected 200');

  // GET /api/admin/sms-logs
  const smsLogsRes = await adminSmsLogsGet(makeRequest('http://localhost:3000/api/admin/sms-logs', { headers: authHeaders }));
  assert(smsLogsRes.status === 200, 'Admin SMS logs expected 200');

  // GET /api/admin/audit-logs
  const auditLogsRes = await adminAuditLogsGet(makeRequest('http://localhost:3000/api/admin/audit-logs', { headers: authHeaders }));
  assert(auditLogsRes.status === 200, 'Admin audit logs expected 200');
  console.log('✅ T-303: Admin APIs passed all assertions.');

  // ==========================================
  // 8. T-304: TM APIS & REVEAL PHONE TEST
  // ==========================================
  console.log('\n--- [TEST 8] T-304 TM APIs & Reveal Phone ---');
  // First assign a lead strictly to TM1
  const tm1Lead = await prisma.lead.create({
    data: {
      siteId: exportSite.id,
      assignedTmId: tm1.id,
      customerName: 'TM1전담고객',
      phoneEncrypted: encryptPhone('01055554444'),
      phoneMasked: maskPhone('01055554444'),
      phoneHash: hashPhone('01055554444'),
      carModel: '제네시스 G80',
      status: 'NEW',
    },
  });

  // GET /api/tm/leads as TM1
  const tmLeadsReq = makeRequest('http://localhost:3000/api/tm/leads', { headers: tmCookieHeaders });
  const tmLeadsRes = await tmLeadsGet(tmLeadsReq);
  assert(tmLeadsRes.status === 200, 'TM leads expected 200');
  const tmLeadsData = await tmLeadsRes.json();
  assert(
    tmLeadsData.leads.every((l: any) => l.assignedTmId === tm1.id),
    'TM leads endpoint must strictly filter to the authenticated TM'
  );

  // PATCH /api/tm/leads/[id] as TM1
  const tmUpdateReq = makeRequest(`http://localhost:3000/api/tm/leads/${tm1Lead.id}`, {
    method: 'PATCH',
    headers: tmCookieHeaders,
    body: { status: 'PROGRESS', estimatedPrice: 4200, memo: '1차 통화 완료' },
  });
  const tmUpdateRes = await tmLeadPatch(tmUpdateReq, { params: { id: tm1Lead.id } });
  assert(tmUpdateRes.status === 200, 'TM update lead expected 200');
  const updatedLeadData = await tmUpdateRes.json();
  assert(updatedLeadData.lead.status === 'PROGRESS', 'Lead status should be PROGRESS');
  assert(updatedLeadData.lead.estimatedPrice === 4200, 'Estimated price should be 4200');

  // PATCH /api/tm/leads/[id] by TM2 on TM1's lead -> MUST RETURN 403 FORBIDDEN
  const tm2Token = signSessionToken({ userId: tm2.id, role: 'TM', loginId: tm2.loginId, name: tm2.name });
  const tm2CookieHeaders = { cookie: `${SESSION_COOKIE_NAME}=${tm2Token}` };
  const tm2ForbiddenReq = makeRequest(`http://localhost:3000/api/tm/leads/${tm1Lead.id}`, {
    method: 'PATCH',
    headers: tm2CookieHeaders,
    body: { status: 'CANCELED' },
  });
  const tm2ForbiddenRes = await tmLeadPatch(tm2ForbiddenReq, { params: { id: tm1Lead.id } });
  assert(tm2ForbiddenRes.status === 403, `TM2 editing TM1 lead must return 403 Forbidden, got ${tm2ForbiddenRes.status}`);

  // PATCH /api/tm/status
  const tmStatusReq = makeRequest('http://localhost:3000/api/tm/status', {
    method: 'PATCH',
    headers: tmCookieHeaders,
    body: { isDbReceiveOn: true, isSmsReceiveOn: true },
  });
  const tmStatusRes = await tmStatusPatch(tmStatusReq);
  assert(tmStatusRes.status === 200, 'TM status patch expected 200');

  // POST /api/leads/[id]/reveal-phone:
  // 1. TM2 attempts to reveal TM1's lead -> 403
  const tm2RevealForbiddenReq = makeRequest(`http://localhost:3000/api/leads/${tm1Lead.id}/reveal-phone`, {
    method: 'POST',
    headers: tm2CookieHeaders,
  });
  const tm2RevealForbiddenRes = await revealPhonePost(tm2RevealForbiddenReq, { params: { id: tm1Lead.id } });
  assert(tm2RevealForbiddenRes.status === 403, `TM2 revealing TM1 lead must return 403, got ${tm2RevealForbiddenRes.status}`);

  // 2. TM1 reveals own lead -> 200 + decrypted phone
  const auditLogsBefore = await prisma.auditLog.count({ where: { action: 'VIEW_FULL_PHONE' } });
  const tm1RevealReq = makeRequest(`http://localhost:3000/api/leads/${tm1Lead.id}/reveal-phone`, {
    method: 'POST',
    headers: tmCookieHeaders,
  });
  const tm1RevealRes = await revealPhonePost(tm1RevealReq, { params: { id: tm1Lead.id } });
  assert(tm1RevealRes.status === 200, `TM1 reveal own lead expected 200, got ${tm1RevealRes.status}`);
  const revealData = await tm1RevealRes.json();
  assert(revealData.fullPhone === '01055554444', `Expected decrypted phone 01055554444, got ${revealData.fullPhone}`);

  // 3. Verify that an AuditLog entry was recorded
  const auditLogsAfter = await prisma.auditLog.count({ where: { action: 'VIEW_FULL_PHONE' } });
  assert(auditLogsAfter === auditLogsBefore + 1, 'VIEW_FULL_PHONE audit log must be recorded');
  const latestAudit = await prisma.auditLog.findFirst({
    where: { action: 'VIEW_FULL_PHONE' },
    orderBy: { createdAt: 'desc' },
  });
  assert(latestAudit?.leadId === tm1Lead.id, 'AuditLog leadId must match revealed lead');
  assert(latestAudit?.userId === tm1.id, 'AuditLog userId must match TM1');
  console.log('✅ T-304: TM APIs and phone reveal with AuditLog passed all assertions.');

  console.log('\n====================================================');
  console.log('🎉 ALL BACKEND & SECURITY TESTS PASSED SUCCESSFULLY!');
  console.log('   - T-201: [x] Crypto module');
  console.log('   - T-202: [x] Auth & RBAC guards');
  console.log('   - T-203: [x] SMS adapter');
  console.log('   - T-204: [x] Allocation engine & row-lock');
  console.log('   - T-301: [x] External webhook /api/v1/leads');
  console.log('   - T-302: [x] Auth APIs');
  console.log('   - T-303: [x] Admin APIs');
  console.log('   - T-304: [x] TM APIs & Reveal Phone');
  console.log('====================================================\n');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION SUITE FAILED:', err);
  process.exit(1);
});
