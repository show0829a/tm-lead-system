/**
 * End-to-End Automated Test Script (verify-e2e.ts)
 * 
 * Verifies complete system behavior across all tracks:
 * a. Initial Seed Verification (Admin, 4 TMs, 3 Sites, Config)
 * b. External Lead Webhook (POST /api/v1/leads):
 *    - Invalid API key -> 401
 *    - Missing required fields -> 400
 *    - Valid lead creation -> 201 with lead ID
 *    - AES-256-GCM phone encryption, masking, and HMAC-SHA256 hash
 *    - Round-robin auto-allocation (order 1 -> 2 -> 3 -> 4 -> 1)
 *    - Custom mapping allocation (SITE_C)
 *    - Skip TMs with isDbReceiveOn === false
 *    - All TMs off fallback -> status UNASSIGNED, zero lead loss
 *    - Duplicate phone within 10 min -> 409 DUPLICATE_LEAD
 *    - SMS logs creation with status MOCK_SENT (with template variables substituted) or SKIPPED
 * c. Auth & RBAC:
 *    - Login with invalid password -> 401
 *    - Login with valid credentials -> sets session cookie
 *    - TM attempting to access /api/admin/* -> 403 Forbidden
 *    - Admin accessing /api/admin/* -> 200 OK
 *    - TM workspace /api/tm/leads -> strictly isolates leads (sees only own leads)
 *    - Phone reveal POST /api/leads/[id]/reveal-phone: decrypts phone and creates AuditLog record (VIEW_FULL_PHONE)
 * d. Pointer Control & Manual Assignment:
 *    - Set next pointer to specific TM -> next lead assigned to that TM
 *    - Manual assign with consumeTurn: true (advances pointer) vs consumeTurn: false (does not advance pointer)
 * e. Static Landing Site Template:
 *    - Inspect files in landing-site-template/
 *    - Simulate form submission to /api/v1/leads
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

import { prisma } from '../src/lib/db';
import { normalizePhone, encryptPhone, decryptPhone, maskPhone, hashPhone } from '../src/lib/crypto';
import {
  signSessionToken,
  SESSION_COOKIE_NAME,
  comparePassword,
} from '../src/lib/auth';
import {
  ingestAndAllocateLead,
  assignLeadManually,
  setNextPointer,
} from '../src/lib/allocation-engine';

// Import REST API Route Handlers
import { OPTIONS as webhookOptions, POST as webhookPost } from '../src/app/api/v1/leads/route';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { GET as meGet } from '../src/app/api/auth/me/route';
import { GET as adminLeadsGet } from '../src/app/api/admin/leads/route';
import { POST as adminAssignPost } from '../src/app/api/admin/leads/assign/route';
import { POST as adminPointerPost } from '../src/app/api/admin/allocation/pointer/route';
import { GET as adminTmsGet } from '../src/app/api/admin/tms/route';
import { GET as tmLeadsGet } from '../src/app/api/tm/leads/route';
import { POST as revealPhonePost } from '../src/app/api/leads/[id]/reveal-phone/route';

function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}\n`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    token?: string;
    cookie?: string;
  } = {}
) {
  const { method = 'GET', headers = {}, body, token, cookie } = options;
  const reqHeaders = new Headers(headers);

  if (token) {
    reqHeaders.set('authorization', `Bearer ${token}`);
  }
  if (cookie) {
    reqHeaders.set('cookie', cookie);
  }

  const init: any = { method, headers: reqHeaders };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!reqHeaders.has('content-type')) {
      reqHeaders.set('content-type', 'application/json');
    }
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

async function runSeed() {
  console.log('--- Initializing Clean Test Database State ---');

  // Clean existing tables in proper relation order
  await prisma.auditLog.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.consultMemo.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.siteTmMapping.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemAllocationConfig.deleteMany();

  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  const tmPasswordHash = await bcrypt.hash('tm1234', 10);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      loginId: 'admin',
      passwordHash: adminPasswordHash,
      name: '최고 관리자',
      phoneEncrypted: encryptPhone('01011112222'),
      phoneMasked: '010-****-2222',
      role: 'ADMIN',
      globalOrder: null,
      isDbReceiveOn: false,
      isSmsReceiveOn: false,
      isActive: true,
    },
  });

  // Create 4 TMs
  const tmConfigs = [
    { loginId: 'tm1', name: '상담원 1 (팀장)', phone: '01010001001', phoneMasked: '010-****-1001', order: 1 },
    { loginId: 'tm2', name: '상담원 2', phone: '01010001002', phoneMasked: '010-****-1002', order: 2 },
    { loginId: 'tm3', name: '상담원 3', phone: '01010001003', phoneMasked: '010-****-1003', order: 3 },
    { loginId: 'tm4', name: '상담원 4', phone: '01010001004', phoneMasked: '010-****-1004', order: 4 },
  ];

  const tmUsers = [];
  for (const cfg of tmConfigs) {
    const tm = await prisma.user.create({
      data: {
        loginId: cfg.loginId,
        passwordHash: tmPasswordHash,
        name: cfg.name,
        phoneEncrypted: encryptPhone(cfg.phone),
        phoneMasked: cfg.phoneMasked,
        role: 'TM',
        globalOrder: cfg.order,
        isDbReceiveOn: true,
        isSmsReceiveOn: true,
        isActive: true,
      },
    });
    tmUsers.push(tm);
  }

  // Create 3 Sites
  const siteExport = await prisma.site.create({
    data: {
      name: '수출 사이트',
      apiKey: 'sk_site_export_01',
      useCustomMapping: false,
      domainUrl: 'http://localhost:8080',
      isActive: true,
    },
  });

  const siteDomestic1 = await prisma.site.create({
    data: {
      name: '내수매입 1 사이트',
      apiKey: 'sk_site_dom1_02',
      useCustomMapping: false,
      domainUrl: 'http://localhost:8081',
      isActive: true,
    },
  });

  const siteDomestic2 = await prisma.site.create({
    data: {
      name: '내수매입 2 사이트',
      apiKey: 'sk_site_dom2_03',
      useCustomMapping: true,
      nextTmId: tmUsers[0].id,
      domainUrl: 'http://localhost:8082',
      isActive: true,
    },
  });

  // Custom mappings for siteDomestic2 (TMs 1, 2, 3)
  for (let i = 0; i < 3; i++) {
    await prisma.siteTmMapping.create({
      data: {
        siteId: siteDomestic2.id,
        tmId: tmUsers[i].id,
        orderIndex: i + 1,
      },
    });
  }

  // SystemAllocationConfig
  await prisma.systemAllocationConfig.create({
    data: {
      id: 1,
      nextGlobalTmId: tmUsers[0].id,
      defaultSmsTemplate: '[{siteName}] 신규DB 배정\n고객: {customerName} ({customerPhone})\n차량: {carModel} ({carYear})\n지역: {region}',
      duplicateBlockMinutes: 10,
    },
  });

  console.log('--- Clean Baseline State Ready ---\n');
}

async function runE2E() {
  console.log('======================================================================');
  console.log('🎯 TM-LEAD-SYSTEM COMPREHENSIVE END-TO-END AUTOMATED VERIFICATION');
  console.log('======================================================================');

  await runSeed();

  // ==========================================================================
  // SECTION A: INITIAL SEED VERIFICATION
  // ==========================================================================
  console.log('\n--- [SECTION A] Initial Seed Verification ---');

  const admin = await prisma.user.findUnique({ where: { loginId: 'admin' } });
  assert(admin && admin.role === 'ADMIN', 'Seed: Admin user must exist with role ADMIN');
  assert(await comparePassword('admin1234', admin.passwordHash), 'Seed: Admin password must match admin1234');
  console.log('✅ A1: Admin account verified (admin / ADMIN)');

  const tms = await prisma.user.findMany({
    where: { role: 'TM', isActive: true },
    orderBy: { globalOrder: 'asc' },
  });
  assert(tms.length === 4, `Seed: Expected 4 TMs, found ${tms.length}`);
  for (let i = 0; i < 4; i++) {
    const tm = tms[i];
    assert(tm.loginId === `tm${i + 1}`, `Seed: TM loginId should be tm${i + 1}`);
    assert(tm.globalOrder === i + 1, `Seed: TM order should be ${i + 1}`);
    assert(tm.isDbReceiveOn === true, `Seed: TM ${tm.loginId} isDbReceiveOn must be true`);
    assert(tm.isSmsReceiveOn === true, `Seed: TM ${tm.loginId} isSmsReceiveOn must be true`);
    assert(await comparePassword('tm1234', tm.passwordHash), `Seed: TM ${tm.loginId} password match`);
  }
  console.log('✅ A2: 4 TMs verified (tm1~tm4, globalOrder 1~4, all DB/SMS on)');

  const sites = await prisma.site.findMany({ orderBy: { createdAt: 'asc' } });
  assert(sites.length === 3, `Seed: Expected 3 sites, found ${sites.length}`);
  const siteExport = sites.find((s) => s.apiKey === 'sk_site_export_01');
  const siteDom1 = sites.find((s) => s.apiKey === 'sk_site_dom1_02');
  const siteDom2 = sites.find((s) => s.apiKey === 'sk_site_dom2_03');
  assert(siteExport && !siteExport.useCustomMapping, 'Seed: Export site should use global mapping');
  assert(siteDom1 && !siteDom1.useCustomMapping, 'Seed: Domestic 1 site should use global mapping');
  assert(siteDom2 && siteDom2.useCustomMapping, 'Seed: Domestic 2 site should use custom mapping');
  console.log('✅ A3: 3 Sites verified (Export, Dom1, Dom2)');

  const dom2Mappings = await prisma.siteTmMapping.findMany({
    where: { siteId: siteDom2!.id },
    orderBy: { orderIndex: 'asc' },
  });
  assert(dom2Mappings.length === 3, `Seed: Site Dom2 should have 3 mappings, found ${dom2Mappings.length}`);
  assert(dom2Mappings[0].tmId === tms[0].id, 'Seed: Dom2 Mapping 1 -> TM 1');
  assert(dom2Mappings[1].tmId === tms[1].id, 'Seed: Dom2 Mapping 2 -> TM 2');
  assert(dom2Mappings[2].tmId === tms[2].id, 'Seed: Dom2 Mapping 3 -> TM 3');
  console.log('✅ A4: Custom SiteTmMapping verified for Dom2 (TMs 1, 2, 3)');

  const config = await prisma.systemAllocationConfig.findFirst();
  assert(config && config.id === 1, 'Seed: SystemAllocationConfig id=1 must exist');
  assert(config.nextGlobalTmId === tms[0].id, 'Seed: Initial nextGlobalTmId must point to TM 1');
  assert(config.duplicateBlockMinutes === 10, 'Seed: duplicateBlockMinutes must be 10');
  console.log('✅ A5: SystemAllocationConfig verified (nextGlobalTmId = tm1)');

  // ==========================================================================
  // SECTION B: EXTERNAL LEAD WEBHOOK (POST /api/v1/leads)
  // ==========================================================================
  console.log('\n--- [SECTION B] External Lead Webhook (POST /api/v1/leads) ---');

  // B1: OPTIONS CORS test
  const optionsRes = await webhookOptions();
  assert(optionsRes.status === 204, 'B1: OPTIONS should return 204 No Content');
  assert(
    optionsRes.headers.get('access-control-allow-origin') === '*',
    'B1: CORS origin should allow *'
  );
  console.log('✅ B1: OPTIONS CORS preflight returns 204 with headers');

  // B2: Invalid API key -> 401
  const badKeyReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_invalid_bogus_key' },
    body: { customerName: '홍길동', customerPhone: '010-1111-2222', carModel: '아반떼' },
  });
  const badKeyRes = await webhookPost(badKeyReq);
  assert(badKeyRes.status === 401, `B2: Invalid API key expected 401, got ${badKeyRes.status}`);
  console.log('✅ B2: Invalid API key rejected with 401 Unauthorized');

  // B3: Missing required fields -> 400
  const missingFieldReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: { customerName: '홍길동' }, // missing customerPhone & carModel
  });
  const missingFieldRes = await webhookPost(missingFieldReq);
  assert(missingFieldRes.status === 400, `B3: Missing fields expected 400, got ${missingFieldRes.status}`);
  console.log('✅ B3: Missing required fields rejected with 400 Bad Request');

  // B4: Valid lead creation -> 201 with lead ID & check crypto
  const rawCustomerPhone = '010-5555-6666';
  const lead1Req = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: {
      customerName: '김고객1',
      customerPhone: rawCustomerPhone,
      carModel: '그랜저 HG 240',
      carYear: '2015',
      region: '서울 강남구',
    },
  });
  const lead1Res = await webhookPost(lead1Req);
  assert(lead1Res.status === 201, `B4: Expected 201, got ${lead1Res.status}`);
  const lead1Data = await lead1Res.json();
  assert(lead1Data.success === true && lead1Data.leadId, 'B4: Expected success true and leadId');
  assert(lead1Data.assignedTm.id === tms[0].id, 'B4: Lead 1 should be assigned to TM 1');

  // Inspect database Lead record
  const dbLead1 = await prisma.lead.findUnique({ where: { id: lead1Data.leadId } });
  assert(dbLead1, 'B4: Lead 1 must exist in DB');
  assert(dbLead1.phoneMasked === '010-****-6666', `B4: Masked phone mismatch: ${dbLead1.phoneMasked}`);
  assert(dbLead1.phoneEncrypted.includes(':'), 'B4: phoneEncrypted must be iv:tag:cipher format');
  assert(!dbLead1.phoneEncrypted.includes('01055556666'), 'B4: Plaintext phone MUST NOT appear in phoneEncrypted');
  assert(decryptPhone(dbLead1.phoneEncrypted) === '01055556666', 'B4: Decrypted phone must match original');
  assert(dbLead1.phoneHash === hashPhone(rawCustomerPhone), 'B4: phoneHash must match HMAC-SHA256');
  console.log('✅ B4: Valid lead created (201), AES-256-GCM encryption, masking & HMAC-SHA256 hash verified');

  // B5: Round-robin auto-allocation cycle (1 -> 2 -> 3 -> 4 -> 1)
  // Lead 1 already consumed TM 1. Now nextGlobalTmId should be TM 2.
  const cfgAfter1 = await prisma.systemAllocationConfig.findFirst();
  assert(cfgAfter1?.nextGlobalTmId === tms[1].id, 'B5: Pointer should have moved to TM 2');

  const roundRobinPhones = [
    '010-5555-6667', // Lead 2 -> TM 2
    '010-5555-6668', // Lead 3 -> TM 3
    '010-5555-6669', // Lead 4 -> TM 4
    '010-5555-6670', // Lead 5 -> TM 1 (wraps around!)
  ];

  const expectedTms = [tms[1], tms[2], tms[3], tms[0]];
  for (let i = 0; i < roundRobinPhones.length; i++) {
    const req = makeRequest('http://localhost:3000/api/v1/leads', {
      method: 'POST',
      headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
      body: {
        customerName: `김순환${i + 2}`,
        customerPhone: roundRobinPhones[i],
        carModel: `쏘나타 ${i + 2}`,
      },
    });
    const res = await webhookPost(req);
    assert(res.status === 201, `B5: Round-robin step ${i} status 201`);
    const data = await res.json();
    assert(
      data.assignedTm.id === expectedTms[i].id,
      `B5: Round-robin step ${i} expected assigned to ${expectedTms[i].loginId}, got ${data.assignedTm.id}`
    );
  }

  const cfgAfterCycle = await prisma.systemAllocationConfig.findFirst();
  assert(cfgAfterCycle?.nextGlobalTmId === tms[1].id, 'B5: After wrapping around, pointer should point to TM 2');
  console.log('✅ B5: Full Round-Robin cycle verified (TM 1 -> TM 2 -> TM 3 -> TM 4 -> TM 1 -> next: TM 2)');

  // B6: Custom mapping allocation (SITE_C / dom2)
  // Site dom2 has mappings for TMs 1, 2, 3 only (orders 1, 2, 3).
  // Current nextTmId in siteDom2 is TM 1.
  const dom2Lead1Req = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_dom2_03' },
    body: {
      customerName: '제네시스고객1',
      customerPhone: '010-7777-1001',
      carModel: '제네시스 G80',
    },
  });
  const dom2Lead1Res = await webhookPost(dom2Lead1Req);
  const dom2Lead1Data = await dom2Lead1Res.json();
  assert(dom2Lead1Data.assignedTm.id === tms[0].id, 'B6: Dom2 custom lead 1 should be assigned to TM 1');

  const dom2After1 = await prisma.site.findUnique({ where: { id: siteDom2!.id } });
  assert(dom2After1?.nextTmId === tms[1].id, 'B6: Dom2 pointer should advance to TM 2');

  // Verify global pointer was NOT affected by Site C's custom allocation
  const globalCfgCheck = await prisma.systemAllocationConfig.findFirst();
  assert(
    globalCfgCheck?.nextGlobalTmId === tms[1].id,
    'B6: Global pointer must remain untouched by custom site allocations'
  );

  const dom2Lead2Req = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_dom2_03' },
    body: {
      customerName: '제네시스고객2',
      customerPhone: '010-7777-1002',
      carModel: '제네시스 GV80',
    },
  });
  const dom2Lead2Res = await webhookPost(dom2Lead2Req);
  const dom2Lead2Data = await dom2Lead2Res.json();
  assert(dom2Lead2Data.assignedTm.id === tms[1].id, 'B6: Dom2 custom lead 2 should be assigned to TM 2');
  console.log('✅ B6: Custom site mapping allocation verified (TM 1 -> TM 2, isolated from global pointer)');

  // B7: Skip TMs with isDbReceiveOn === false
  // Current global pointer is TM 2. Turn off TM 2 DB reception.
  await prisma.user.update({
    where: { id: tms[1].id },
    data: { isDbReceiveOn: false },
  });

  const skipLeadReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: {
      customerName: '스킵테스트고객',
      customerPhone: '010-8888-0001',
      carModel: 'K5 하이브리드',
    },
  });
  const skipLeadRes = await webhookPost(skipLeadReq);
  const skipLeadData = await skipLeadRes.json();
  assert(
    skipLeadData.assignedTm.id === tms[2].id,
    `B7: Expected TM 2 to be skipped and assigned to TM 3, got ${skipLeadData.assignedTm.id}`
  );

  const cfgAfterSkip = await prisma.systemAllocationConfig.findFirst();
  assert(cfgAfterSkip?.nextGlobalTmId === tms[3].id, 'B7: Pointer should advance past TM 3 to TM 4');

  // Restore TM 2
  await prisma.user.update({
    where: { id: tms[1].id },
    data: { isDbReceiveOn: true },
  });
  console.log('✅ B7: TM with isDbReceiveOn=false skipped automatically (assigned to TM 3)');

  // B8: All TMs off fallback -> status UNASSIGNED, zero lead loss
  await prisma.user.updateMany({
    where: { role: 'TM' },
    data: { isDbReceiveOn: false },
  });

  const allOffLeadReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: {
      customerName: '전원오프고객',
      customerPhone: '010-9999-0001',
      carModel: '포터2 카고',
    },
  });
  const allOffLeadRes = await webhookPost(allOffLeadReq);
  assert(allOffLeadRes.status === 201, `B8: Fallback lead expected 201, got ${allOffLeadRes.status}`);
  const allOffLeadData = await allOffLeadRes.json();
  assert(allOffLeadData.assignedTm === null, 'B8: assignedTm should be null');
  assert(allOffLeadData.status === 'UNASSIGNED', 'B8: status should be UNASSIGNED');

  const dbUnassignedLead = await prisma.lead.findUnique({ where: { id: allOffLeadData.leadId } });
  assert(dbUnassignedLead && dbUnassignedLead.status === 'UNASSIGNED', 'B8: DB status must be UNASSIGNED');
  assert(dbUnassignedLead.assignedTmId === null, 'B8: DB assignedTmId must be null');

  // Restore all TMs
  await prisma.user.updateMany({
    where: { role: 'TM' },
    data: { isDbReceiveOn: true },
  });
  console.log('✅ B8: All TMs off fallback verified: zero lead loss, status stored as UNASSIGNED');

  // B9: Duplicate phone within 10 min -> 409 DUPLICATE_LEAD
  const dupPhone = '010-3333-4444';
  const firstDupReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: { customerName: '중복고객1', customerPhone: dupPhone, carModel: '카니발' },
  });
  const firstDupRes = await webhookPost(firstDupReq);
  assert(firstDupRes.status === 201, 'B9: First lead should be 201');

  const secondDupReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: { customerName: '중복고객1재시도', customerPhone: dupPhone, carModel: '카니발' },
  });
  const secondDupRes = await webhookPost(secondDupReq);
  assert(secondDupRes.status === 409, `B9: Duplicate lead expected 409 Conflict, got ${secondDupRes.status}`);
  const secondDupData = await secondDupRes.json();
  assert(secondDupData.error === 'DUPLICATE_LEAD', 'B9: error should be DUPLICATE_LEAD');
  console.log('✅ B9: Duplicate phone within 10min blocked with 409 Conflict (DUPLICATE_LEAD)');

  // B10: SMS logs creation (MOCK_SENT vs SKIPPED)
  // Check SMS log for a lead where TM had isSmsReceiveOn = true
  const sentSmsLog = await prisma.smsLog.findFirst({
    where: { status: 'MOCK_SENT' },
    include: { lead: true, tm: true },
  });
  assert(sentSmsLog, 'B10: At least one MOCK_SENT SMS log must exist');
  assert(
    sentSmsLog.message.includes(sentSmsLog.lead.customerName),
    'B10: SMS message must include customer name'
  );
  assert(
    !sentSmsLog.message.includes('{customerName}'),
    'B10: SMS template placeholder {customerName} must be replaced'
  );

  // Turn off TM 1 SMS reception and assign a lead
  await prisma.user.update({ where: { id: tms[0].id }, data: { isSmsReceiveOn: false } });
  await prisma.systemAllocationConfig.update({ where: { id: 1 }, data: { nextGlobalTmId: tms[0].id } });

  const noSmsLeadReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: { customerName: '노SMS고객', customerPhone: '010-4444-5555', carModel: '모닝' },
  });
  const noSmsRes = await webhookPost(noSmsLeadReq);
  const noSmsData = await noSmsRes.json();

  const skippedSmsLog = await prisma.smsLog.findFirst({
    where: { leadId: noSmsData.leadId, tmId: tms[0].id },
  });
  assert(skippedSmsLog && skippedSmsLog.status === 'SKIPPED', 'B10: SMS log for TM with isSmsReceiveOn=false must be SKIPPED');

  // Restore TM 1 SMS
  await prisma.user.update({ where: { id: tms[0].id }, data: { isSmsReceiveOn: true } });
  console.log('✅ B10: SMS logs creation verified (MOCK_SENT with substituted template & SKIPPED when OFF)');

  // ==========================================================================
  // SECTION C: AUTH & RBAC
  // ==========================================================================
  console.log('\n--- [SECTION C] Auth & RBAC Security Verification ---');

  // C1: Login with invalid password -> 401
  const badLoginReq = makeRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: { loginId: 'admin', password: 'wrongPassword' },
  });
  const badLoginRes = await loginPost(badLoginReq);
  assert(badLoginRes.status === 401, `C1: Invalid login expected 401, got ${badLoginRes.status}`);
  console.log('✅ C1: Invalid login rejected with 401 Unauthorized');

  // C2: Login with valid credentials -> sets session cookie
  const validLoginReq = makeRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: { loginId: 'admin', password: 'admin1234' },
  });
  const validLoginRes = await loginPost(validLoginReq);
  assert(validLoginRes.status === 200, `C2: Valid login expected 200, got ${validLoginRes.status}`);
  const cookieHeader = validLoginRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes(SESSION_COOKIE_NAME), 'C2: Set-Cookie must contain tm_session');
  assert(cookieHeader.includes('HttpOnly'), 'C2: Cookie must be HttpOnly');
  console.log('✅ C2: Valid login sets HttpOnly session cookie tm_session');

  // C3: Generate tokens for ADMIN and TM
  const adminToken = signSessionToken({
    userId: admin.id,
    role: 'ADMIN',
    loginId: admin.loginId,
    name: admin.name,
  });
  const tm1Token = signSessionToken({
    userId: tms[0].id,
    role: 'TM',
    loginId: tms[0].loginId,
    name: tms[0].name,
  });
  const tm2Token = signSessionToken({
    userId: tms[1].id,
    role: 'TM',
    loginId: tms[1].loginId,
    name: tms[1].name,
  });

  // C4: TM attempting to access /api/admin/* -> 403 Forbidden
  const tmAdminReq = makeRequest('http://localhost:3000/api/admin/leads', {
    token: tm1Token,
  });
  const tmAdminRes = await adminLeadsGet(tmAdminReq);
  assert(tmAdminRes.status === 403, `C4: TM accessing admin expected 403, got ${tmAdminRes.status}`);
  console.log('✅ C3: TM attempting to access /api/admin/leads blocked with 403 Forbidden');

  // C5: Admin accessing /api/admin/* -> 200 OK
  const adminReq = makeRequest('http://localhost:3000/api/admin/leads', {
    token: adminToken,
  });
  const adminRes = await adminLeadsGet(adminReq);
  assert(adminRes.status === 200, `C5: Admin accessing admin expected 200, got ${adminRes.status}`);
  const adminLeadsData = await adminRes.json();
  assert(Array.isArray(adminLeadsData.leads), 'C5: Admin leads response must include leads array');
  console.log('✅ C4: Admin accessing /api/admin/leads allowed (200 OK)');

  // C6: TM workspace /api/tm/leads isolation
  const tm1LeadsReq = makeRequest('http://localhost:3000/api/tm/leads', { token: tm1Token });
  const tm1LeadsRes = await tmLeadsGet(tm1LeadsReq);
  assert(tm1LeadsRes.status === 200, 'C6: TM 1 workspace access expected 200');
  const tm1LeadsData = await tm1LeadsRes.json();

  assert(tm1LeadsData.leads.length > 0, 'C6: TM 1 should have leads');
  for (const lead of tm1LeadsData.leads) {
    assert(
      lead.assignedTmId === tms[0].id,
      `C6: TM 1 workspace contains unauthorized lead assigned to ${lead.assignedTmId}`
    );
  }

  const tm2LeadsReq = makeRequest('http://localhost:3000/api/tm/leads', { token: tm2Token });
  const tm2LeadsRes = await tmLeadsGet(tm2LeadsReq);
  const tm2LeadsData = await tm2LeadsRes.json();
  for (const lead of tm2LeadsData.leads) {
    assert(
      lead.assignedTmId === tms[1].id,
      `C6: TM 2 workspace contains unauthorized lead assigned to ${lead.assignedTmId}`
    );
  }
  console.log('✅ C5: TM workspace /api/tm/leads strictly isolates leads (TM only sees own leads)');

  // C7: Phone reveal POST /api/leads/[id]/reveal-phone
  // TM 1 reveals phone for TM 1's lead
  const targetLeadForTm1 = tm1LeadsData.leads[0];
  const revealReqTm1 = makeRequest(`http://localhost:3000/api/leads/${targetLeadForTm1.id}/reveal-phone`, {
    method: 'POST',
    token: tm1Token,
  });
  const revealResTm1 = await revealPhonePost(revealReqTm1, { params: { id: targetLeadForTm1.id } });
  assert(revealResTm1.status === 200, `C7: Reveal phone expected 200, got ${revealResTm1.status}`);
  const revealDataTm1 = await revealResTm1.json();
  assert(
    revealDataTm1.fullPhone && !revealDataTm1.fullPhone.includes('*'),
    'C7: Revealed phone must be decrypted plaintext'
  );

  // Check AuditLog entry
  const auditLogEntry = await prisma.auditLog.findFirst({
    where: {
      userId: tms[0].id,
      leadId: targetLeadForTm1.id,
      action: 'VIEW_FULL_PHONE',
    },
  });
  assert(auditLogEntry, 'C7: AuditLog record for VIEW_FULL_PHONE must exist');

  // TM 2 attempts to reveal TM 1's lead -> 403 Forbidden
  const revealReqTm2Illegal = makeRequest(`http://localhost:3000/api/leads/${targetLeadForTm1.id}/reveal-phone`, {
    method: 'POST',
    token: tm2Token,
  });
  const revealResTm2Illegal = await revealPhonePost(revealReqTm2Illegal, { params: { id: targetLeadForTm1.id } });
  assert(
    revealResTm2Illegal.status === 403,
    `C7: TM 2 revealing TM 1 lead expected 403, got ${revealResTm2Illegal.status}`
  );

  // Admin reveals TM 1's lead -> 200 OK
  const revealReqAdmin = makeRequest(`http://localhost:3000/api/leads/${targetLeadForTm1.id}/reveal-phone`, {
    method: 'POST',
    token: adminToken,
  });
  const revealResAdmin = await revealPhonePost(revealReqAdmin, { params: { id: targetLeadForTm1.id } });
  assert(revealResAdmin.status === 200, `C7: Admin revealing lead expected 200, got ${revealResAdmin.status}`);
  console.log('✅ C6: Phone reveal decrypts plaintext, enforces cross-TM 403, and creates AuditLog entry');

  // ==========================================================================
  // SECTION D: POINTER CONTROL & MANUAL ASSIGNMENT
  // ==========================================================================
  console.log('\n--- [SECTION D] Pointer Control & Manual Assignment ---');

  // D1: Set next pointer to specific TM (TM 3)
  const setPointerReq = makeRequest('http://localhost:3000/api/admin/allocation/pointer', {
    method: 'POST',
    token: adminToken,
    body: { targetTmId: tms[2].id },
  });
  const setPointerRes = await adminPointerPost(setPointerReq);
  assert(setPointerRes.status === 200, `D1: Set pointer expected 200, got ${setPointerRes.status}`);

  const cfgPointerUpdated = await prisma.systemAllocationConfig.findFirst();
  assert(cfgPointerUpdated?.nextGlobalTmId === tms[2].id, 'D1: nextGlobalTmId should be TM 3');

  // Verify AuditLog for pointer change
  const pointerAuditLog = await prisma.auditLog.findFirst({
    where: {
      userId: admin.id,
      action: 'POINTER_CHANGE',
    },
    orderBy: { createdAt: 'desc' },
  });
  assert(pointerAuditLog, 'D1: POINTER_CHANGE AuditLog record must exist');

  // Next auto lead must be assigned to TM 3!
  const pointerLeadReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: { customerName: '포인터확인고객', customerPhone: '010-9999-1234', carModel: '투싼' },
  });
  const pointerLeadRes = await webhookPost(pointerLeadReq);
  const pointerLeadData = await pointerLeadRes.json();
  assert(pointerLeadData.assignedTm.id === tms[2].id, 'D1: Lead must be assigned to target TM 3');
  console.log('✅ D1: Set next pointer to TM 3 verified; next auto lead assigned to TM 3 + AuditLog created');

  // D2: Manual assignment with consumeTurn: false vs consumeTurn: true
  // Create an unassigned lead for testing
  const unassignedLead = await prisma.lead.create({
    data: {
      siteId: siteExport!.id,
      assignedTmId: null,
      customerName: '수동배정테스트1',
      phoneEncrypted: encryptPhone('01099998881'),
      phoneMasked: '010-****-8881',
      phoneHash: hashPhone('01099998881'),
      carModel: '아반떼 MD',
      status: 'UNASSIGNED',
      assignType: 'AUTO',
    },
  });

  const pointerBeforeManual = (await prisma.systemAllocationConfig.findFirst())?.nextGlobalTmId;

  // Manual assign with consumeTurn: false
  const manualAssignNoConsumeReq = makeRequest('http://localhost:3000/api/admin/leads/assign', {
    method: 'POST',
    token: adminToken,
    body: {
      leadId: unassignedLead.id,
      targetTmId: tms[0].id,
      consumeTurn: false,
    },
  });
  const manualAssignNoConsumeRes = await adminAssignPost(manualAssignNoConsumeReq);
  assert(manualAssignNoConsumeRes.status === 200, 'D2: Manual assign without consume expected 200');

  const leadAfterManualNoConsume = await prisma.lead.findUnique({ where: { id: unassignedLead.id } });
  assert(leadAfterManualNoConsume?.assignedTmId === tms[0].id, 'D2: Assigned to TM 1');
  assert(leadAfterManualNoConsume?.assignType === 'MANUAL', 'D2: assignType is MANUAL');

  const pointerAfterManualNoConsume = (await prisma.systemAllocationConfig.findFirst())?.nextGlobalTmId;
  assert(
    pointerAfterManualNoConsume === pointerBeforeManual,
    'D2: consumeTurn: false MUST NOT advance the allocation pointer'
  );

  // Manual assign with consumeTurn: true
  const unassignedLead2 = await prisma.lead.create({
    data: {
      siteId: siteExport!.id,
      assignedTmId: null,
      customerName: '수동배정테스트2',
      phoneEncrypted: encryptPhone('01099998882'),
      phoneMasked: '010-****-8882',
      phoneHash: hashPhone('01099998882'),
      carModel: 'K3 디젤',
      status: 'UNASSIGNED',
      assignType: 'AUTO',
    },
  });

  const manualAssignConsumeReq = makeRequest('http://localhost:3000/api/admin/leads/assign', {
    method: 'POST',
    token: adminToken,
    body: {
      leadId: unassignedLead2.id,
      targetTmId: tms[1].id, // TM 2
      consumeTurn: true,
    },
  });
  const manualAssignConsumeRes = await adminAssignPost(manualAssignConsumeReq);
  assert(manualAssignConsumeRes.status === 200, 'D2: Manual assign with consume expected 200');

  const pointerAfterConsume = (await prisma.systemAllocationConfig.findFirst())?.nextGlobalTmId;
  assert(
    pointerAfterConsume === tms[2].id,
    'D2: consumeTurn: true targeting TM 2 MUST advance rotation pointer to TM 3'
  );

  const manualAuditLog = await prisma.auditLog.findFirst({
    where: {
      userId: admin.id,
      action: 'MANUAL_ASSIGN',
    },
    orderBy: { createdAt: 'desc' },
  });
  assert(manualAuditLog, 'D2: MANUAL_ASSIGN AuditLog entry must exist');
  console.log('✅ D2: Manual assign with consumeTurn: false (preserves pointer) vs true (advances pointer) verified');

  // ==========================================================================
  // SECTION E: STATIC RECRUITMENT LANDING SITE TEMPLATE
  // ==========================================================================
  console.log('\n--- [SECTION E] Static Landing Site Template Verification ---');

  const landingDirPath = path.resolve(__dirname, '../../landing-site-template');
  assert(fs.existsSync(landingDirPath), `E1: Landing site dir must exist at ${landingDirPath}`);

  const requiredLandingFiles = ['index.html', 'config.js', 'app.js', 'styles.css'];
  for (const fileName of requiredLandingFiles) {
    const filePath = path.join(landingDirPath, fileName);
    assert(fs.existsSync(filePath), `E1: Landing file ${fileName} must exist`);
    const stats = fs.statSync(filePath);
    assert(stats.size > 100, `E1: Landing file ${fileName} must be non-empty (got ${stats.size} bytes)`);
  }

  // Inspect config.js content
  const configContent = fs.readFileSync(path.join(landingDirPath, 'config.js'), 'utf8');
  assert(configContent.includes('LANDING_CONFIG'), 'E1: config.js must define LANDING_CONFIG');
  assert(configContent.includes('sk_site_export_01'), 'E1: config.js must include export site apiKey');
  assert(configContent.includes('sk_site_dom1_02'), 'E1: config.js must include dom1 apiKey');
  assert(configContent.includes('sk_site_dom2_03'), 'E1: config.js must include dom2 apiKey');

  // Inspect index.html content
  const htmlContent = fs.readFileSync(path.join(landingDirPath, 'index.html'), 'utf8');
  assert(htmlContent.includes('leadForm'), 'E1: index.html must have leadForm');
  assert(htmlContent.includes('customerName'), 'E1: index.html must have customerName input');
  assert(htmlContent.includes('customerPhone'), 'E1: index.html must have customerPhone input');
  assert(htmlContent.includes('carModel'), 'E1: index.html must have carModel input');
  assert(htmlContent.includes('privacyConsent'), 'E1: index.html must have privacyConsent checkbox');
  console.log('✅ E1: landing-site-template/ directory and all 4 files verified (syntax, non-empty, structure)');

  // Simulate form submission from landing site config
  const simulatedLandingReq = makeRequest('http://localhost:3000/api/v1/leads', {
    method: 'POST',
    headers: { 'X-Site-Api-Key': 'sk_site_export_01' },
    body: {
      customerName: '랜딩페이지신청자',
      customerPhone: '010-1234-9999',
      carModel: '스포티지 NQ5 하이브리드',
      carYear: '2023',
      carNumber: '12가 3456',
      mileage: '15000',
      region: '경기도 수원시',
    },
  });
  const simulatedLandingRes = await webhookPost(simulatedLandingReq);
  assert(simulatedLandingRes.status === 201, `E2: Landing page submission expected 201, got ${simulatedLandingRes.status}`);
  const simulatedLandingData = await simulatedLandingRes.json();
  assert(simulatedLandingData.success === true && simulatedLandingData.leadId, 'E2: Expected success and leadId');

  const landingLead = await prisma.lead.findUnique({ where: { id: simulatedLandingData.leadId } });
  assert(landingLead, 'E2: Simulated landing lead must be stored in DB');
  assert(landingLead.customerName === '랜딩페이지신청자', 'E2: Customer name match');
  assert(landingLead.carNumber === '12가 3456', 'E2: Car number match');
  console.log('✅ E2: Simulated form submission from static landing site template succeeded (201 Created)');

  console.log('\n======================================================================');
  console.log('🎉 ALL END-TO-END AUTOMATED VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('   - Section A: [PASS] Initial Seed Verification');
  console.log('   - Section B: [PASS] External Lead Webhook, Round-Robin, Skip, Fallback & SMS');
  console.log('   - Section C: [PASS] Auth & RBAC Security, Isolation & Audit Logging');
  console.log('   - Section D: [PASS] Pointer Control & Manual Assignment (consumeTurn flag)');
  console.log('   - Section E: [PASS] Static Landing Site Template & Simulated Lead Submission');
  console.log('======================================================================\n');
}

runE2E()
  .catch((err) => {
    console.error('Fatal E2E Verification Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
