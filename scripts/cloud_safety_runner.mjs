import webpush from 'web-push';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '7532116e9d16abfc6b7eded7a89c4f72';
const CF_KV_NAMESPACE = process.env.CF_KV_NAMESPACE || '8d7944ad493e4455b7bd517a5784417f';
const CF_API_TOKEN = process.env.CF_API_TOKEN || '';
const CRON_SECRET = process.env.CRON_SECRET || 'psa_cron_8f9c1b2e3d4a5e6f7a8b9c0d1e2f3a4b';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BFM9HkzYgwAYdTY5VYhj_Gfm39qhGL5vs7vy9iuj1-vBt8eXFqH9j0wh7qgh2_ScpX-LWhIKfHogc7wgSl0flRk';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:security@personal-safety.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('[VAPID] Setup warning:', err.message);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function getKvValue(key) {
  if (!CF_API_TOKEN) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE}/values/${encodeURIComponent(key)}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
    }, 6000);
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (e) {
    console.warn(`[KV Read Error] ${key}:`, e.message);
    return null;
  }
}

async function putKvValue(key, value) {
  if (!CF_API_TOKEN) return false;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE}/values/${encodeURIComponent(key)}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    }, 8000);
    return res.ok;
  } catch (e) {
    console.warn(`[KV Write Error] ${key}:`, e.message);
    return false;
  }
}

async function listKvKeys() {
  if (!CF_API_TOKEN) return [];
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE}/keys`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
    }, 6000);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.result) ? data.result.map(k => k.name) : [];
  } catch (e) {
    console.warn('[KV List Error]:', e.message);
    return [];
  }
}

async function fetchOfficialAlerts() {
  const directUrls = [
    'https://ubilling.net.ua/aerialalerts/',
    'https://r.jina.ai/https://ubilling.net.ua/aerialalerts/'
  ];

  for (const targetUrl of directUrls) {
    try {
      const res = await fetchWithTimeout(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      }, 7000);

      if (res.ok) {
        const text = await res.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          const match = text.match(/\{[\s\S]*"states"[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed && (parsed.states || typeof parsed === 'object')) {
          const count = parsed.states ? Object.keys(parsed.states).length : Object.keys(parsed).length;
          return { success: true, count, source: targetUrl };
        }
      }
    } catch (err) {
      // Continue to fallback
    }
  }

  return { success: false, count: 0 };
}

async function fetchTelegramFeeds() {
  const targets = [
    'https://r.jina.ai/https://t.me/s/kievreal1',
    'https://t.me/s/kievreal1'
  ];

  for (const targetUrl of targets) {
    try {
      const res = await fetchWithTimeout(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, 7000);

      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) {
          return { success: true, count: 1, source: targetUrl };
        }
      }
    } catch (err) {
      // Continue to fallback
    }
  }

  return { success: false, count: 0 };
}

export async function runMonitoringCycle(iteration = 1) {
  const now = Date.now();
  console.log(`\n========================================`);
  console.log(`[AutonomousScheduler] Cycle #${iteration} at ${new Date(now).toISOString()}`);
  console.log(`========================================`);

  // Step 1: Ingest sources in parallel
  const [officialRes, telegramRes] = await Promise.all([
    fetchOfficialAlerts(),
    fetchTelegramFeeds()
  ]);

  console.log(`  - Official Alerts: ${officialRes.success ? 'HEALTHY' : 'DEGRADED'} (${officialRes.count} items)`);
  console.log(`  - Telegram Feeds:  ${telegramRes.success ? 'HEALTHY' : 'DEGRADED'}`);

  // Step 2: Load devices from KV
  const keys = await listKvKeys();
  const deviceKeys = keys.filter(k => k.startsWith('device:'));
  const devices = [];
  for (const k of deviceKeys) {
    const dev = await getKvValue(k);
    if (dev) devices.push(dev);
  }
  console.log(`  - Registered Devices in KV: ${devices.length}`);

  // Step 3: Load existing health state from KV
  const prevHealth = await getKvValue('monitor:health') || {};
  const existingRecent = Array.isArray(prevHealth?.recentCycles) ? prevHealth.recentCycles : [];
  
  // Filter and prepend current timestamp, keep max 10
  const recentCycles = [now, ...existingRecent.filter(ts => Math.abs(ts - now) > 1000)].slice(0, 10);

  const health = {
    lastCycleTimestamp: now,
    lastCycleAgeSec: 0,
    officialAlertsStatus: officialRes.success ? 'healthy' : 'degraded',
    telegramFeedsStatus: telegramRes.success ? 'healthy' : 'degraded',
    lastEventIngestedTs: now,
    activeThreatsCount: 0,
    registeredDevicesCount: devices.length,
    recentCycles,
    scheduler: 'GitHub Actions Cloud 24/7'
  };

  // Step 4: Persist updated state to KV
  const saved = await putKvValue('monitor:health', health);
  if (saved) {
    console.log(`  ✓ Successfully persisted monitoring health to Cloudflare KV`);
    console.log(`  ✓ recentCycles recorded:`, recentCycles.slice(0, 3).map(ts => new Date(ts).toISOString()));
  } else {
    console.warn(`  ✗ Failed to persist to Cloudflare KV`);
  }

  return health;
}

if (process.argv[1] && process.argv[1].endsWith('cloud_safety_runner.mjs')) {
  (async () => {
    const iterations = parseInt(process.env.CYCLE_ITERATIONS || '3', 10);
    const delaySec = parseInt(process.env.CYCLE_DELAY_SEC || '60', 10);

    console.log(`Starting Cloud Safety Runner: ${iterations} cycle(s), ${delaySec}s delay`);
    
    for (let i = 1; i <= iterations; i++) {
      await runMonitoringCycle(i);
      if (i < iterations) {
        console.log(`Waiting ${delaySec} seconds before next autonomous cycle...`);
        await new Promise(r => setTimeout(r, delaySec * 1000));
      }
    }
    console.log(`\n[AutonomousScheduler] All ${iterations} autonomous cycles completed.`);
  })();
}
