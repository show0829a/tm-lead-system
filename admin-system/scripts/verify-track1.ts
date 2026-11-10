import bcrypt from 'bcryptjs';
import prisma from '../src/lib/db';

async function verify() {
  console.log('=== TRACK 1 VERIFICATION START ===');

  // 1. Verify Users
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`[CHECK 1] Total users found: ${users.length} (expected 5)`);
  if (users.length !== 5) throw new Error(`Expected 5 users, got ${users.length}`);

  const admin = await prisma.user.findUnique({ where: { loginId: 'admin' } });
  if (!admin) throw new Error('Admin user not found');
  const adminPassMatch = await bcrypt.compare('admin1234', admin.passwordHash);
  console.log(`[CHECK 2] Admin user verified: loginId=${admin.loginId}, role=${admin.role}, passwordMatch=${adminPassMatch}`);
  if (!adminPassMatch || admin.role !== 'ADMIN') throw new Error('Admin verification failed');

  const tms = await prisma.user.findMany({
    where: { role: 'TM' },
    orderBy: { globalOrder: 'asc' },
  });
  console.log(`[CHECK 3] TM users count: ${tms.length} (expected 4)`);
  if (tms.length !== 4) throw new Error('Expected 4 TM users');

  for (let i = 0; i < 4; i++) {
    const tm = tms[i];
    const passMatch = await bcrypt.compare('tm1234', tm.passwordHash);
    const orderCorrect = tm.globalOrder === i + 1;
    console.log(` - TM ${tm.loginId}: order=${tm.globalOrder}, isDbReceiveOn=${tm.isDbReceiveOn}, passMatch=${passMatch}`);
    if (!passMatch || !orderCorrect) throw new Error(`TM ${tm.loginId} verification failed`);
  }

  // 2. Verify Sites
  const sites = await prisma.site.findMany();
  console.log(`[CHECK 4] Total sites found: ${sites.length} (expected 3)`);
  if (sites.length !== 3) throw new Error(`Expected 3 sites, got ${sites.length}`);

  const siteKeys = sites.map((s) => s.apiKey).sort();
  const expectedKeys = ['sk_site_dom1_02', 'sk_site_dom2_03', 'sk_site_export_01'].sort();
  if (JSON.stringify(siteKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`API keys mismatch: ${siteKeys.join(', ')}`);
  }
  console.log(`[CHECK 5] API Keys verified: ${siteKeys.join(', ')}`);

  // 3. Verify Custom Mapping
  const siteDom2 = await prisma.site.findUnique({
    where: { apiKey: 'sk_site_dom2_03' },
    include: {
      tmMappings: {
        include: { tm: true },
      },
    },
  });
  if (!siteDom2) throw new Error('Site 2 not found');
  console.log(`[CHECK 6] Site ${siteDom2.name} custom mapping: ${siteDom2.tmMappings.length} mappings`);
  if (siteDom2.tmMappings.length !== 3) throw new Error('Expected 3 mappings for Site 2');
  for (const m of siteDom2.tmMappings) {
    console.log(` - Mapping index ${m.orderIndex} -> TM ${m.tm?.name} (${m.tm?.loginId})`);
    if (!m.tm) throw new Error('Relation tm on siteTmMapping failed to resolve');
  }

  // 4. Verify SystemAllocationConfig
  const config = await prisma.systemAllocationConfig.findFirst();
  if (!config) throw new Error('SystemAllocationConfig not found');
  console.log(`[CHECK 7] SystemAllocationConfig verified: id=${config.id}, nextGlobalTmId=${config.nextGlobalTmId}`);
  if (config.id !== 1 || !config.nextGlobalTmId) throw new Error('Config verification failed');

  // 5. Verify Transaction
  const txResult = await prisma.$transaction(async (tx) => {
    const rawConfig = await tx.$queryRaw`SELECT id, next_global_tm_id FROM system_allocation_config WHERE id = 1 FOR UPDATE`;
    return rawConfig;
  });
  console.log(`[CHECK 8] Interactive transaction & raw row-lock query result:`, txResult);

  console.log('=== ALL TRACK 1 VERIFICATION CHECKS PASSED ===');
}

verify()
  .catch((e) => {
    console.error('Verification Failed:', e);
    process.exit(1);
  });
