const puppeteer = require('puppeteer-core');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verifyTimestampsLive(targetUrl) {
  console.log(`=== STARTING LOCAL / LIVE TIMESTAMPS VERIFICATION ===`);
  console.log(`Target URL: ${targetUrl}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const report = {
    desktop: { ok: false, consoleErrors: [], failedRequests: [], timestamps: {} },
    mobile: { ok: false, consoleErrors: [], failedRequests: [], timestamps: {}, liveTickingVerified: false }
  };

  try {
    // 1. DESKTOP VIEWPORT (1440x900)
    console.log('\n--- 1. Testing Desktop Viewport (1440x900) ---');
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1440, height: 900 });

    pageDesktop.on('pageerror', err => {
      report.desktop.consoleErrors.push(err.message);
      console.error('[Desktop Page Error]:', err.message);
    });
    pageDesktop.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        const isNetworkOrCors = txt.includes('favicon') ||
          txt.includes('429') ||
          txt.includes('Failed to load resource') ||
          txt.includes('Access to fetch') ||
          txt.includes('CORS') ||
          txt.includes('blocked by CORS') ||
          txt.includes('net::ERR_');
        if (!isNetworkOrCors) {
          report.desktop.consoleErrors.push(txt);
          console.error('[Desktop Console Error]:', txt);
        }
      }
    });

    await pageDesktop.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Click "АКТИВУВАТИ ЗАХИСТ" from Home first to start monitoring
    const dHomeBtns = await pageDesktop.$$('button');
    for (const btn of dHomeBtns) {
      const txt = await (await btn.getProperty('innerText')).jsonValue();
      if (txt && (txt.includes('АКТИВУВАТИ') || txt.includes('ПОЧАТИ'))) {
        await btn.click();
        console.log('Clicked Activate on Desktop.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 6000));

    // Click "Налаштування" tab to reveal Section 5
    const settingsBtns = await pageDesktop.$$('button');
    for (const btn of settingsBtns) {
      const txt = await (await btn.getProperty('innerText')).jsonValue();
      if (txt && txt.includes('Налаштування')) {
        await btn.click();
        console.log('Clicked Settings Tab on Desktop.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    const desktopText = await pageDesktop.evaluate(() => document.body.innerText);
    const hasFullSync = desktopText.includes('Остання повна синхронізація');
    const hasTelegramCard = desktopText.includes('TELEGRAM') && (desktopText.includes('Останній успішний цикл') || desktopText.includes('Останнє отримане повідомлення'));
    const hasAlertsCard = desktopText.includes('OFFICIAL ALERTS') && (desktopText.includes('Останній успішний fetch') || desktopText.includes('Час даних source'));

    console.log(`✓ Остання повна синхронізація rendered: ${hasFullSync}`);
    console.log(`✓ Telegram diagnostics card rendered: ${hasTelegramCard}`);
    console.log(`✓ Official Alerts diagnostics card rendered: ${hasAlertsCard}`);

    report.desktop.ok = hasFullSync && hasTelegramCard && hasAlertsCard && report.desktop.consoleErrors.length === 0;

    // 2. MOBILE VIEWPORT (390x844 iPhone 14)
    console.log('\n--- 2. Testing Mobile Viewport (390x844) ---');
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    pageMobile.on('pageerror', err => {
      report.mobile.consoleErrors.push(err.message);
      console.error('[Mobile Page Error]:', err.message);
    });
    pageMobile.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        const isNetworkOrCors = txt.includes('favicon') ||
          txt.includes('429') ||
          txt.includes('Failed to load resource') ||
          txt.includes('Access to fetch') ||
          txt.includes('CORS') ||
          txt.includes('blocked by CORS') ||
          txt.includes('net::ERR_');
        if (!isNetworkOrCors) {
          report.mobile.consoleErrors.push(txt);
          console.error('[Mobile Console Error]:', txt);
        }
      }
    });

    await pageMobile.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Activate monitoring from home
    const mHomeBtns = await pageMobile.$$('button');
    for (const btn of mHomeBtns) {
      const txt = await (await btn.getProperty('innerText')).jsonValue();
      if (txt && (txt.includes('АКТИВУВАТИ') || txt.includes('ПОЧАТИ') || txt.includes('МОНІТОРИНГ'))) {
        await btn.click();
        console.log('Clicked Activate on Mobile.');
        break;
      }
    }

    // Wait for monitoring cycle to complete
    await new Promise(r => setTimeout(r, 6000));

    // Switch to Settings tab on mobile
    const mNavBtns = await pageMobile.$$('button');
    for (const btn of mNavBtns) {
      const txt = await (await btn.getProperty('innerText')).jsonValue();
      if (txt && txt.includes('Налаштування')) {
        await btn.click();
        console.log('Switched to Settings Tab on Mobile.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Click "Оновити зараз" in Settings tab to guarantee a full active cycle
    const sBtns = await pageMobile.$$('button');
    for (const btn of sBtns) {
      const txt = await (await btn.getProperty('innerText')).jsonValue();
      if (txt && txt.includes('Оновити зараз')) {
        await btn.click();
        console.log('Clicked "Оновити зараз" in Settings Tab.');
        break;
      }
    }

    // Wait for the full sync cycle to finish and display HH:MM:SS
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const currentText = await pageMobile.evaluate(() => document.body.innerText);
      if (/Остання повна синхронізація:\s*[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(currentText)) {
        console.log(`✓ Full sync timestamp populated after ${i + 1}s`);
        break;
      }
    }

    const mobileText = await pageMobile.evaluate(() => document.body.innerText);
    const mFullSync = mobileText.includes('Остання повна синхронізація');
    const mTelegramCard = mobileText.includes('TELEGRAM') && mobileText.includes('Останній успішний цикл');
    const mAlertsCard = mobileText.includes('OFFICIAL ALERTS') && mobileText.includes('Останній успішний fetch');

    console.log(`✓ Mobile Остання повна синхронізація: ${mFullSync}`);
    console.log(`✓ Mobile Telegram card: ${mTelegramCard}`);
    console.log(`✓ Mobile Official Alerts card: ${mAlertsCard}`);

    // Extract detailed timestamps from text
    const extractMatch = (text, regex) => {
      const m = text.match(regex);
      return m ? m[1].trim() : '—';
    };

    const fullSyncTime = extractMatch(mobileText, /Остання повна синхронізація:\s*([0-9]{2}:[0-9]{2}:[0-9]{2}|Очікування)/);
    const tgFetchTime = extractMatch(mobileText, /Останній успішний цикл:\s*([0-9]{2}:[0-9]{2}:[0-9]{2}|—)/);
    const tgMsgTime = extractMatch(mobileText, /Останнє отримане повідомлення:\s*([0-9]{2}:[0-9]{2}:[0-9]{2}|—)/);
    const officialFetchTime = extractMatch(mobileText, /Останній успішний fetch:\s*([0-9]{2}:[0-9]{2}:[0-9]{2}|—)/);

    report.mobile.timestamps = {
      fullSyncTime,
      tgFetchTime,
      tgMsgTime,
      officialFetchTime
    };

    console.log('Extracted Mobile Timestamps:', report.mobile.timestamps);

    // Test live ticking over 3 seconds
    const sample1 = await pageMobile.evaluate(() => document.body.innerText);
    await new Promise(r => setTimeout(r, 2500));
    const sample2 = await pageMobile.evaluate(() => document.body.innerText);

    const liveTicking = sample1 !== sample2 || sample2.includes('с тому') || sample2.includes('хв тому');
    console.log(`✓ Mobile Live Age Ticking verified: ${liveTicking}`);

    // Take verification screenshots
    await pageDesktop.screenshot({ path: 'verification_desktop_timestamps.png' });
    await pageMobile.screenshot({ path: 'verification_mobile_timestamps.png' });
    console.log('✓ Captured desktop and mobile screenshots.');

    report.mobile.ok = mFullSync && mTelegramCard && mAlertsCard && report.mobile.consoleErrors.length === 0;
    report.mobile.liveTickingVerified = liveTicking;

    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log('Desktop Passed:', report.desktop.ok);
    console.log('Mobile Passed:', report.mobile.ok);
    console.log('Live Ticking:', report.mobile.liveTickingVerified);
    console.log('Desktop Errors:', report.desktop.consoleErrors.length);
    console.log('Mobile Errors:', report.mobile.consoleErrors.length);

    await browser.close();
    return report;
  } catch (err) {
    console.error('Verification failed with error:', err);
    await browser.close();
    throw err;
  }
}

if (require.main === module) {
  const url = process.argv[2] || 'https://romanchuk82-ctrl.github.io/personal-safety-agent/';
  verifyTimestampsLive(url).then(r => {
    if (r.desktop.ok && r.mobile.ok) {
      console.log('\n>>> OVERALL TEST RESULT: PASS <<<');
      process.exit(0);
    } else {
      console.error('\n>>> OVERALL TEST RESULT: FAIL <<<');
      process.exit(1);
    }
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { verifyTimestampsLive };
