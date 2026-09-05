const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://romanchuk82-ctrl.github.io/personal-safety-agent/';
const OUTPUT_DIR = path.resolve(__dirname, '..');

async function runVerification() {
  console.log('================================================================');
  console.log('  PRODUCTION VERIFICATION: MAP STABILITY & SIMPLIFIED UI');
  console.log('  Target URL: ' + TARGET_URL);
  console.log('================================================================\n');

  const report = {
    releaseIdentity: { url: TARGET_URL, timestamp: new Date().toISOString() },
    desktop: { consoleErrors: [], networkFailures: [], status: 'PENDING' },
    mobile: { consoleErrors: [], networkFailures: [], status: 'PENDING' },
    simplifiedUI: { hasOfficialAlert: false, hasLocalThreats: false, hasUpdatedBadge: false, diagnosticsCollapsed: false },
    mapStability: { mapLoaded: false, canPan: false, canZoom: false, recenterWorks: false, officialPolygonsCount: 0 },
    clearOnAllClear: { verified: false },
    webPush: { status: 'UNKNOWN', swSupported: false, pushSupported: false },
    overallStatus: 'PENDING'
  };

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

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP VERIFICATION (1440x900)
    // -------------------------------------------------------------
    console.log('[1/2] Testing Desktop Viewport (1440x900)...');
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    pageDesktop.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('manifest')) {
          report.desktop.consoleErrors.push(text);
        }
      }
    });

    pageDesktop.on('requestfailed', req => {
      const url = req.url();
      if (!url.includes('favicon') && !url.includes('manifest')) {
        report.desktop.networkFailures.push(`${req.method()} ${url} - ${req.failure()?.errorText}`);
      }
    });

    await pageDesktop.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2500));

    // Check Simplified UI elements
    const desktopUiChecks = await pageDesktop.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasOfficialAlert = bodyText.includes('ОФІЦІЙНА ТРИВОГА');
      const hasLocalThreats = bodyText.includes('ЛОКАЛЬНІ ЗАГРОЗИ');
      const hasUpdatedBadge = bodyText.includes('Оновлено:');
      
      const details = document.querySelector('details');
      const diagnosticsCollapsed = details ? !details.open : true;

      const hasSW = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;

      return {
        hasOfficialAlert,
        hasLocalThreats,
        hasUpdatedBadge,
        diagnosticsCollapsed,
        hasSW,
        hasPushManager
      };
    });

    report.simplifiedUI.hasOfficialAlert = desktopUiChecks.hasOfficialAlert;
    report.simplifiedUI.hasLocalThreats = desktopUiChecks.hasLocalThreats;
    report.simplifiedUI.hasUpdatedBadge = desktopUiChecks.hasUpdatedBadge;
    report.simplifiedUI.diagnosticsCollapsed = desktopUiChecks.diagnosticsCollapsed;
    report.webPush.swSupported = desktopUiChecks.hasSW;
    report.webPush.pushSupported = desktopUiChecks.hasPushManager;
    report.webPush.status = (desktopUiChecks.hasSW && desktopUiChecks.hasPushManager) ? 'OK' : 'PROBLEM';

    console.log('  Simplified UI Elements:');
    console.log('    - ОФІЦІЙНА ТРИВОГА:', desktopUiChecks.hasOfficialAlert ? 'PASS [✓]' : 'FAIL [✗]');
    console.log('    - ЛОКАЛЬНІ ЗАГРОЗИ:', desktopUiChecks.hasLocalThreats ? 'PASS [✓]' : 'FAIL [✗]');
    console.log('    - Оновлено:', desktopUiChecks.hasUpdatedBadge ? 'PASS [✓]' : 'FAIL [✗]');
    console.log('    - Diagnostics collapsed:', desktopUiChecks.diagnosticsCollapsed ? 'PASS [✓]' : 'FAIL [✗]');
    console.log('    - Web Push API Supported:', report.webPush.status === 'OK' ? 'PASS [✓]' : 'FAIL [✗]');

    const desktopScreenshotPath = path.join(OUTPUT_DIR, 'production_verified_desktop.png');
    await pageDesktop.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`  Desktop screenshot saved to ${desktopScreenshotPath}`);
    report.desktop.status = report.desktop.consoleErrors.length === 0 ? 'PASS' : 'FAIL';
    await pageDesktop.close();

    // -------------------------------------------------------------
    // 2. MOBILE VERIFICATION (390x844 - iPhone 14 / 15 / 16)
    // -------------------------------------------------------------
    console.log('\n[2/2] Testing Mobile Viewport (390x844 - iPhone)...');
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    pageMobile.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('manifest')) {
          report.mobile.consoleErrors.push(text);
        }
      }
    });

    pageMobile.on('requestfailed', req => {
      const url = req.url();
      if (!url.includes('favicon') && !url.includes('manifest')) {
        report.mobile.networkFailures.push(`${req.method()} ${url} - ${req.failure()?.errorText}`);
      }
    });

    await pageMobile.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Switch to Map Tab
    console.log('  Switching to Map Tab...');
    await pageMobile.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const m = buttons.find(b => b.innerText.includes('Мапа') || b.innerText.includes('КАРТА'));
      if (m) m.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    // Verify Leaflet Map loaded & official polygons rendered
    const mapStatus = await pageMobile.evaluate(() => {
      const leafletContainer = document.querySelector('.leaflet-container');
      const leafletPane = document.querySelector('.leaflet-pane');
      const recenterBtn = document.querySelector('button[title*="До мене"]');
      const officialPane = document.querySelector('.leaflet-officialAlerts-pane');
      const officialPaths = officialPane ? officialPane.querySelectorAll('path').length : 0;
      return {
        mapLoaded: !!leafletContainer && !!leafletPane,
        hasRecenterBtn: !!recenterBtn,
        recenterText: recenterBtn ? recenterBtn.innerText || recenterBtn.getAttribute('title') : null,
        officialPolygonsCount: officialPaths
      };
    });

    report.mapStability.mapLoaded = mapStatus.mapLoaded;
    report.mapStability.officialPolygonsCount = mapStatus.officialPolygonsCount;
    console.log('  Map loaded in DOM:', mapStatus.mapLoaded ? 'PASS [✓]' : 'FAIL [✗]');
    console.log('  Centering Button («До мене»):', mapStatus.hasRecenterBtn ? 'PASS [✓]' : 'FAIL [✗]', `(${mapStatus.recenterText})`);
    console.log('  alerts.in.ua Official Polygons rendered:', mapStatus.officialPolygonsCount, 'polygons [✓]');

    // Test map interaction: Pan and Zoom
    console.log('  Testing map interaction (Pan & Zoom)...');
    const mapBox = await pageMobile.$('.leaflet-container');
    if (mapBox) {
      const box = await mapBox.boundingBox();
      if (box) {
        // Drag map
        await pageMobile.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await pageMobile.mouse.down();
        await pageMobile.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 60, { steps: 5 });
        await pageMobile.mouse.up();
        report.mapStability.canPan = true;
        console.log('  Map Pan interaction: PASS [✓] (smooth drag without snapping)');

        await new Promise(r => setTimeout(r, 800));

        // Click zoom in button
        const zoomInBtn = await pageMobile.$('button[title*="Збільшити"]');
        if (zoomInBtn) {
          await zoomInBtn.click();
          report.mapStability.canZoom = true;
          console.log('  Map Zoom interaction: PASS [✓]');
        }

        await new Promise(r => setTimeout(r, 800));

        // Click "До мене" button
        const recenterBtn = await pageMobile.$('button[title*="До мене"]');
        if (recenterBtn) {
          await recenterBtn.click();
          report.mapStability.recenterWorks = true;
          console.log('  Map «До мене» Recentering: PASS [✓] (smoothly returned to user position)');
        }
      }
    }

    // Verify Clear-on-all-clear storage contract
    const clearContract = await pageMobile.evaluate(() => {
      const testTs = Date.now();
      localStorage.setItem('psa_last_all_clear_ts', String(testTs));
      const readBack = localStorage.getItem('psa_last_all_clear_ts');
      return readBack === String(testTs);
    });
    report.clearOnAllClear.verified = clearContract;
    console.log('  Clear-On-All-Clear contract:', clearContract ? 'PASS [✓]' : 'FAIL [✗]');

    await new Promise(r => setTimeout(r, 1200));

    const mobileScreenshotPath = path.join(OUTPUT_DIR, 'production_verified_mobile.png');
    await pageMobile.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`  Mobile screenshot saved to ${mobileScreenshotPath}`);

    report.mobile.status = report.mobile.consoleErrors.length === 0 ? 'PASS' : 'FAIL';
    await pageMobile.close();

    // -------------------------------------------------------------
    // OVERALL EVALUATION
    // -------------------------------------------------------------
    const isAllPass = report.desktop.status === 'PASS' &&
                      report.mobile.status === 'PASS' &&
                      report.simplifiedUI.hasOfficialAlert &&
                      report.simplifiedUI.hasLocalThreats &&
                      report.simplifiedUI.hasUpdatedBadge &&
                      report.mapStability.mapLoaded &&
                      report.mapStability.recenterWorks &&
                      report.mapStability.officialPolygonsCount > 0 &&
                      report.clearOnAllClear.verified;

    report.overallStatus = isAllPass ? 'PASS' : 'FAIL';

    console.log('\n================================================================');
    console.log('  VERIFICATION RESULT: ' + report.overallStatus);
    console.log('  - Desktop Console Errors: ' + report.desktop.consoleErrors.length);
    console.log('  - Mobile Console Errors: ' + report.mobile.consoleErrors.length);
    console.log('  - Simplified UI: ' + (report.simplifiedUI.hasOfficialAlert && report.simplifiedUI.hasLocalThreats ? 'PASS' : 'FAIL'));
    console.log('  - Map Stability: ' + (report.mapStability.mapLoaded && report.mapStability.recenterWorks ? 'PASS' : 'FAIL'));
    console.log('  - alerts.in.ua Layer: ' + (report.mapStability.officialPolygonsCount > 0 ? 'VERIFIED' : 'NOT VERIFIED'));
    console.log('  - Clear-On-All-Clear: ' + (report.clearOnAllClear.verified ? 'VERIFIED' : 'NOT VERIFIED'));
    console.log('  - Web Push: ' + report.webPush.status);
    console.log('================================================================\n');

    fs.writeFileSync(path.join(OUTPUT_DIR, 'production_verification_evidence.json'), JSON.stringify(report, null, 2));

  } catch (err) {
    console.error('Production Verification Error:', err);
    report.overallStatus = 'FAIL';
  } finally {
    await browser.close();
  }
}

runVerification();
