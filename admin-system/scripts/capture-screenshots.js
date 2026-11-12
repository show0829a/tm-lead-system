const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('next/dist/compiled/ws');
const { signSessionToken } = require('../src/lib/auth');

const OUTPUT_DIR = path.resolve(__dirname, '../screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const adminToken = signSessionToken({
  userId: 'admin',
  role: 'ADMIN',
  loginId: 'admin',
  name: '최고 관리자',
});

const tmToken = signSessionToken({
  userId: 'tm1',
  role: 'TM',
  loginId: 'tm1',
  name: '상담원 1 (팀장)',
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (msg) => {
        const res = JSON.parse(msg.toString());
        if (res.id && this.callbacks.has(res.id)) {
          const { resolve, reject } = this.callbacks.get(res.id);
          this.callbacks.delete(res.id);
          if (res.error) reject(new Error(res.error.message));
          else resolve(res.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('🚀 Starting Chrome headless with CDP on port 9222...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const userDataDir = '/tmp/chrome-cdp-profile-' + Date.now();

  const chromeProc = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      `--user-data-dir=${userDataDir}`,
      '--window-size=1440,900',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Wait for Chrome to spin up
  let versionInfo = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      versionInfo = await getJson('http://127.0.0.1:9222/json/version');
      if (versionInfo && versionInfo.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!versionInfo) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome CDP port 9222');
  }

  console.log('✅ Chrome CDP connected:', versionInfo.Browser);

  // Use existing target page from list
  const targets = await getJson('http://127.0.0.1:9222/json/list');
  const target = targets.find((t) => t.type === 'page') || targets[0];
  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error('No page target available in Chrome CDP: ' + JSON.stringify(targets));
  }
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Network.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2, // High-DPI Retina for crisp PPT slides
    mobile: false,
  });

  const capture = async (filename, label) => {
    console.log(`📸 Capturing: ${label} -> ${filename}`);
    const { data } = await client.send('Page.captureScreenshot', {
      format: 'png',
      quality: 100,
    });
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    console.log(`   Saved ${fs.statSync(filePath).size} bytes`);
  };

  try {
    // 1. Landing Site Template
    const landingHtmlPath = path.resolve(__dirname, '../../landing-site-template/index.html');
    await client.send('Page.navigate', { url: `file://${landingHtmlPath}` });
    await sleep(1500);
    await capture('01_landing_site.png', '외부 고객 견적 접수 랜딩페이지');

    // 2. Login Page
    await client.send('Page.navigate', { url: 'http://localhost:3001/login' });
    await sleep(1500);
    await capture('02_login_page.png', '통합 시스템 로그인 화면');

    // Perform Admin Login via real API call inside browser context
    await client.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'admin', password: 'admin1234' }),
          });
          return res.ok;
        })()
      `,
    });
    await sleep(500);

    // 3. Admin: Leads Tab (Dashboard & All Leads)
    await client.send('Page.navigate', { url: 'http://localhost:3001/admin?tab=leads' });
    await sleep(2500);
    await capture('03_admin_leads.png', '관리자 종합 대시보드 및 전체 상담 관리');

    // 4. Admin: Allocation Tab
    await client.send('Page.navigate', { url: 'http://localhost:3001/admin?tab=allocation' });
    await sleep(2000);
    await capture('04_admin_allocation.png', '상담원 배정 순번 및 실시간 수신 제어');

    // 5. Admin: Sites Tab
    await client.send('Page.navigate', { url: 'http://localhost:3001/admin?tab=sites' });
    await sleep(2000);
    await capture('05_admin_sites.png', '접수 사이트 연동 키 및 전담 상담원 설정');

    // 6. Admin: Simulator Tab
    await client.send('Page.navigate', { url: 'http://localhost:3001/admin?tab=simulator' });
    await sleep(2000);
    await capture('06_admin_simulator.png', '가상 상담 유입 및 실시간 SMS 발송 로그');

    // Perform TM Login
    await client.send('Page.navigate', { url: 'http://localhost:3001/login' });
    await sleep(1000);
    await client.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'tm1', password: 'tm1234' }),
          });
          return res.ok;
        })()
      `,
    });
    await sleep(500);

    // 7. TM Workspace: Desktop
    await client.send('Page.navigate', { url: 'http://localhost:3001/tm' });
    await sleep(2000);
    await capture('07_tm_workspace_desktop.png', 'TM 상담원 전용 업무 데스크톱 화면');

    // 8. TM Workspace: Mobile View
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await client.send('Page.navigate', { url: 'http://localhost:3001/tm' });
    await sleep(2000);
    await capture('08_tm_workspace_mobile.png', 'TM 상담원 전용 모바일 화면 (스마트폰 최적화)');

    console.log('🎉 All 8 screenshots captured successfully!');
  } finally {
    client.close();
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
