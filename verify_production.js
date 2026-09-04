const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://romanchuk82-ctrl.github.io/personal-safety-agent/';
const ARTIFACTS_DIR = 'C:\\Users\\test\\.gemini\\antigravity\\brain\\0fe2347d-7867-471d-8524-f627165e9a39';

async function runVerification() {
  console.log('🚀 Starting Comprehensive Production Verification for Personal Safety Agent...');
  console.log(`Target: ${TARGET_URL}`);

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content'
    ]
  });

  const report = {
    commit: '',
    desktop: { passed: false, consoleErrors: [], networkFailures: [] },
    mobile: { passed: false, consoleErrors: [], networkFailures: [] }
  };

  try {
    // 1. DESKTOP VIEWPORT VERIFICATION (1440x900)
    console.log('\n--- [1] Testing Desktop Viewport (1440x900) ---');
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1440, height: 900 });

    pageDesktop.on('console', msg => {
      if (msg.type() === 'error') {
        report.desktop.consoleErrors.push(msg.text());
        console.error(' [Desktop Console Error]:', msg.text());
      }
    });

    pageDesktop.on('requestfailed', request => {
      // Ignore aborts or service worker favicon misses
      const failureText = request.failure()?.errorText || '';
      if (!failureText.includes('ERR_ABORTED')) {
        report.desktop.networkFailures.push({ url: request.url(), failure: failureText });
        console.warn(' [Desktop Request Failed]:', request.url(), failureText);
      }
    });

    console.log('Navigating to production URL...');
    const res = await pageDesktop.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`HTTP Status: ${res.status()}`);

    await pageDesktop.waitForSelector('main', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // A. Check Core UI
    const hasHeader = await pageDesktop.$('header') !== null;
    const bodyText = await pageDesktop.evaluate(() => document.body.innerText);
    const hasLocationControls = bodyText.includes('АВТО') && bodyText.includes('ЗАФІКСУВАТИ') && bodyText.includes('ВРУЧНУ');
    const hasHeroStatus = bodyText.includes('ВАРТОВИЙ БЕЗПЕКИ');
    console.log(`✓ Header rendered: ${hasHeader}`);
    console.log(`✓ Location controls bar (АВТО / ЗАФІКСУВАТИ / ВРУЧНУ): ${hasLocationControls}`);
    console.log(`✓ Status Hero Card: ${hasHeroStatus}`);

    // B. Test Location Lock
    console.log('Testing "ЗАФІКСУВАТИ" location lock...');
    await pageDesktop.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const lockBtn = btns.find(b => b.innerText.includes('ЗАФІКСУВАТИ'));
      if (lockBtn) lockBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const lockNotice = await pageDesktop.evaluate(() => document.body.innerText.includes('Локацію зафіксовано'));
    console.log(`✓ Lock confirmation banner: ${lockNotice}`);

    // C. Test Manual Location Modal & Search
    console.log('Testing "ВРУЧНУ" modal & gazetteer search...');
    await pageDesktop.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const manualBtn = btns.find(b => b.innerText.includes('ВРУЧНУ'));
      if (manualBtn) manualBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const modalTitle = await pageDesktop.evaluate(() => document.body.innerText.includes('Вибір локації для захисту'));
    console.log(`✓ Manual location modal opened: ${modalTitle}`);

    // Type "Бориспіль" into search input
    const searchInput = await pageDesktop.$('input[placeholder*="Пошук"]');
    if (searchInput) {
      await searchInput.type('Бориспіль');
      await new Promise(r => setTimeout(r, 500));
      console.log('✓ Typed "Бориспіль" into gazetteer search');
    }

    // Select Boryspil
    await pageDesktop.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const boryspilBtn = btns.find(b => b.innerText.includes('Бориспіль') && b.innerText.includes('Обрати'));
      if (boryspilBtn) boryspilBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const currentLocText = await pageDesktop.evaluate(() => document.body.innerText);
    const hasBoryspilActive = currentLocText.includes('Бориспіль');
    console.log(`✓ Boryspil location set & verified: ${hasBoryspilActive}`);

    // D. Test Advanced Settings & Live Diagnostics
    console.log('Testing Advanced Settings expansion...');
    await pageDesktop.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const advBtn = btns.find(b => b.innerText.includes('РОЗШИРЕНІ НАЛАШТУВАННЯ'));
      if (advBtn) advBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const advContent = await pageDesktop.evaluate(() => document.body.innerText);
    const hasDiagnostics = advContent.includes('Діагностика парсингу') || advContent.includes('ОСТАННЄ TG ПОВІДОМЛЕННЯ');
    console.log(`✓ Live Diagnostics card visible: ${hasDiagnostics}`);

    // E. Test Rejected Messages Audit Modal
    console.log('Testing Rejected Messages Modal...');
    await pageDesktop.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const rejBtn = btns.find(b => b.innerText.includes('відхилені повідомлення'));
      if (rejBtn) rejBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const hasRejModal = await pageDesktop.evaluate(() => document.body.innerText.includes('Журнал відхилених повідомлень'));
    console.log(`✓ Rejected Messages Modal opened: ${hasRejModal}`);

    // Close modal
    await pageDesktop.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const closeBtn = btns.find(b => b.innerText === 'Закрити' || b.innerText === '✕');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Desktop Screenshot
    const desktopScreenshotPath = path.join(ARTIFACTS_DIR, 'desktop_production.png');
    await pageDesktop.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`✓ Desktop screenshot saved: ${desktopScreenshotPath}`);

    report.desktop.passed = hasHeader && hasLocationControls && hasHeroStatus && hasBoryspilActive && hasDiagnostics && hasRejModal;
    await pageDesktop.close();

    // 2. MOBILE IPHONE VIEWPORT VERIFICATION (390x844)
    console.log('\n--- [2] Testing Mobile iPhone Viewport (390x844) ---');
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    pageMobile.on('console', msg => {
      if (msg.type() === 'error') {
        report.mobile.consoleErrors.push(msg.text());
        console.error(' [Mobile Console Error]:', msg.text());
      }
    });

    pageMobile.on('requestfailed', request => {
      const failureText = request.failure()?.errorText || '';
      if (!failureText.includes('ERR_ABORTED')) {
        report.mobile.networkFailures.push({ url: request.url(), failure: failureText });
      }
    });

    await pageMobile.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await pageMobile.waitForSelector('main', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    const mobileBody = await pageMobile.evaluate(() => document.body.innerText);
    const mobileHasControls = mobileBody.includes('АВТО') && mobileBody.includes('ЗАФІКСУВАТИ') && mobileBody.includes('ВРУЧНУ');
    const mobileHasHero = mobileBody.includes('ВАРТОВИЙ БЕЗПЕКИ');
    console.log(`✓ Mobile controls visible: ${mobileHasControls}`);
    console.log(`✓ Mobile hero visible: ${mobileHasHero}`);

    // Mobile Screenshot
    const mobileScreenshotPath = path.join(ARTIFACTS_DIR, 'mobile_production.png');
    await pageMobile.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`✓ Mobile screenshot saved: ${mobileScreenshotPath}`);

    report.mobile.passed = mobileHasControls && mobileHasHero;
    await pageMobile.close();

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('       PRODUCTION VERIFICATION REPORT   ');
  console.log('========================================');
  console.log(`Desktop Viewport (1440x900): ${report.desktop.passed ? 'PASS' : 'FAIL'} | Errors: ${report.desktop.consoleErrors.length}`);
  console.log(`Mobile Viewport (390x844):   ${report.mobile.passed ? 'PASS' : 'FAIL'} | Errors: ${report.mobile.consoleErrors.length}`);
  console.log('========================================\n');

  return report;
}

runVerification();
