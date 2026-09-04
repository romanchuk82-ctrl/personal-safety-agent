const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://romanchuk82-ctrl.github.io/personal-safety-agent/';
const ARTIFACTS_DIR = 'C:\\Users\\test\\.gemini\\antigravity\\brain\\0fe2347d-7867-471d-8524-f627165e9a39';

async function verifyLiveCycle() {
  console.log('⚡ Running Live Ingestion & Threat Evaluation Cycle on Production...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const loc = msg.location()?.url || '';
      consoleErrors.push(msg.text() + (loc ? ` (${loc})` : ''));
      console.error(' [Page Error]:', msg.text(), loc);
    }
  });
  page.on('requestfailed', req => {
    console.log(' [Request Failed]:', req.url(), req.failure()?.errorText);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(` [Response ${res.status()}]:`, res.url());
    }
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 35000 });
    await page.waitForSelector('main', { timeout: 10000 });

    // Click "АКТИВУВАТИ ЗАХИСТ"
    console.log('Clicking "АКТИВУВАТИ ЗАХИСТ"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const activateBtn = btns.find(b => b.innerText.includes('АКТИВУВАТИ ЗАХИСТ'));
      if (activateBtn) activateBtn.click();
    });

    // Wait for warmup & first check cycle to complete (about 6 seconds)
    console.log('Waiting for evaluation cycle & Telegram ingestion...');
    await new Promise(r => setTimeout(r, 7000));

    // Inspect status text
    const textAfterActivation = await page.evaluate(() => document.body.innerText);
    const hasActiveMonitoring = textAfterActivation.includes('ЗУПИНИТИ МОНІТОРИНГ');
    const hasStatus = textAfterActivation.includes('СЕКТОР ЧИСТИЙ') || textAfterActivation.includes('НЕБЕЗПЕКА') || textAfterActivation.includes('УВАГА');
    const hasTelemetries = textAfterActivation.includes('ОНОВЛЕННЯ') && textAfterActivation.includes('ЗОНА ЗАХИСТУ');

    console.log(`✓ Active Monitoring state toggled: ${hasActiveMonitoring}`);
    console.log(`✓ Sector Status verified: ${hasStatus}`);
    console.log(`✓ Real-time Telemetry displayed: ${hasTelemetries}`);

    // Open Advanced Settings to check Live Diagnostics metrics
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const advBtn = btns.find(b => b.innerText.includes('РОЗШИРЕНІ НАЛАШТУВАННЯ'));
      if (advBtn) advBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const advText = await page.evaluate(() => document.body.innerText);
    const hasLiveIngestMetrics = advText.includes('Діагностика парсингу') && advText.includes('АКТИВНІ КАНАЛИ');
    console.log(`✓ Live Diagnostics block active: ${hasLiveIngestMetrics}`);

    // Screenshot active state
    const screenshotPath = path.join(ARTIFACTS_DIR, 'active_cycle_production.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`✓ Active monitoring screenshot saved: ${screenshotPath}`);

    const pass = hasActiveMonitoring && hasStatus && hasTelemetries && hasLiveIngestMetrics && consoleErrors.length === 0;
    console.log(`\nLive Cycle Verification: ${pass ? 'PASS' : 'FAIL'} (Console Errors: ${consoleErrors.length})`);
  } catch (err) {
    console.error('Live cycle error:', err);
  } finally {
    await browser.close();
  }
}

verifyLiveCycle();
