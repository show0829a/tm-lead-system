import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../src/lib/db';

function encryptPhone(phone: string): string {
  const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(rawKey.slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  console.log('--- Starting Database Seed ---');

  // 1. Clean existing records for idempotent seed
  await prisma.auditLog.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.consultMemo.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.siteTmMapping.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemAllocationConfig.deleteMany();

  // 2. Passwords
  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  const tmPasswordHash = await bcrypt.hash('tm1234', 10);

  // 3. Create Admin
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
  console.log(`Created Admin user: ${admin.name} (${admin.loginId})`);

  // 4. Create TMs (tm1 ~ tm4)
  const tmUsers = [];
  const tmConfigs = [
    { loginId: 'tm1', name: '상담원 1 (팀장)', phone: '01010001001', phoneMasked: '010-****-1001', order: 1 },
    { loginId: 'tm2', name: '상담원 2', phone: '01010001002', phoneMasked: '010-****-1002', order: 2 },
    { loginId: 'tm3', name: '상담원 3', phone: '01010001003', phoneMasked: '010-****-1003', order: 3 },
    { loginId: 'tm4', name: '상담원 4', phone: '01010001004', phoneMasked: '010-****-1004', order: 4 },
  ];

  for (const config of tmConfigs) {
    const tm = await prisma.user.create({
      data: {
        loginId: config.loginId,
        passwordHash: tmPasswordHash,
        name: config.name,
        phoneEncrypted: encryptPhone(config.phone),
        phoneMasked: config.phoneMasked,
        role: 'TM',
        globalOrder: config.order,
        isDbReceiveOn: true,
        isSmsReceiveOn: true,
        isActive: true,
      },
    });
    tmUsers.push(tm);
    console.log(`Created TM user: ${tm.name} (${tm.loginId}, order: ${tm.globalOrder})`);
  }

  // 5. Create Sites
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

  console.log(`Created 3 Sites: ${siteExport.name}, ${siteDomestic1.name}, ${siteDomestic2.name}`);

  // 6. Create SiteTmMapping for siteDomestic2 (custom mapping with tm1, tm2, tm3)
  for (let i = 0; i < 3; i++) {
    await prisma.siteTmMapping.create({
      data: {
        siteId: siteDomestic2.id,
        tmId: tmUsers[i].id,
        orderIndex: i + 1,
      },
    });
  }
  console.log(`Configured custom SiteTmMapping for ${siteDomestic2.name} (TMs: 1, 2, 3)`);

  // 7. Create SystemAllocationConfig
  const config = await prisma.systemAllocationConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      nextGlobalTmId: tmUsers[0].id,
      defaultSmsTemplate: '[{siteName}] 신규DB 배정\n고객: {customerName} ({customerPhone})\n차량: {carModel} ({carYear})\n지역: {region}',
      duplicateBlockMinutes: 10,
    },
    update: {
      nextGlobalTmId: tmUsers[0].id,
      defaultSmsTemplate: '[{siteName}] 신규DB 배정\n고객: {customerName} ({customerPhone})\n차량: {carModel} ({carYear})\n지역: {region}',
      duplicateBlockMinutes: 10,
    },
  });
  console.log(`Created SystemAllocationConfig: id=${config.id}, nextGlobalTmId=${config.nextGlobalTmId}`);

  console.log('--- Database Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
