export interface RawAlert {
  id: number;
  location_title: string;
  location_type: 'oblast' | 'raion' | 'hromada' | 'city';
  started_at: string;
  finished_at: string | null;
  updated_at: string;
  alert_type: string;
  location_oblast: string;
  location_raion?: string;
  location_uid: string;
  notes?: string | null;
}

interface CacheEntry {
  data: RawAlert[];
  timestamp: number;
}

let alertsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15000;

export async function fetchActiveAlerts(token?: string): Promise<{ alerts: RawAlert[]; status: 'OK' | 'CACHE' | 'ERROR'; message?: string }> {
  const apiToken = token || process.env.ALERTS_API_TOKEN || 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';
  const now = Date.now();

  if (alertsCache && (now - alertsCache.timestamp) < CACHE_TTL_MS) {
    return { alerts: alertsCache.data, status: 'CACHE' };
  }

  // Try direct API first, then CORS proxies
  const candidateUrls = [
    `https://api.alerts.in.ua/v1/alerts/active.json?token=${apiToken}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.alerts.in.ua/v1/alerts/active.json?token=${apiToken}`)}`
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const alerts: RawAlert[] = data.alerts || [];

        alertsCache = {
          data: alerts,
          timestamp: now
        };

        return { alerts, status: 'OK' };
      }
    } catch (err: any) {
      // Continue to next proxy
    }
  }

  if (alertsCache) {
    return { alerts: alertsCache.data, status: 'CACHE', message: 'Fallback to cache' };
  }

  return { alerts: [], status: 'ERROR', message: 'Could not fetch active alerts' };
}

/**
 * Checks if the user's specific location or oblast is currently under an active official air raid alert.
 */
export function isUserInOfficialAlert(
  userOblast?: string,
  userLocationName?: string,
  alerts: RawAlert[] = []
): boolean {
  if (!alerts || alerts.length === 0) return false;
  const activeAlerts = alerts.filter(a => !a.finished_at);
  if (activeAlerts.length === 0) return false;

  const ob = (userOblast || '').toLowerCase().trim();
  const loc = (userLocationName || '').toLowerCase().trim();

  // Extract stem for oblast matching (e.g. 'київ' from 'Київська область')
  const oblastStem = ob.replace(/(ська|цька|зька|а|\s+область)$/i, '').trim();

  return activeAlerts.some(a => {
    const title = (a.location_title || '').toLowerCase().trim();
    const alertOblast = (a.location_oblast || '').toLowerCase().trim();

    // Direct match with user's oblast
    if (ob && (title === ob || alertOblast === ob)) return true;
    if (oblastStem && oblastStem.length >= 4) {
      if (title.includes(oblastStem) || alertOblast.includes(oblastStem)) return true;
    }

    // Direct match with user's city/town (e.g. "м. Київ", "Крюківщина", "Васильків")
    if (loc && loc.length >= 4) {
      if (title.includes(loc) || alertOblast.includes(loc)) return true;
    }

    // Kyiv special case: user in Kyiv or Kyivska oblast
    if ((ob.includes('київ') || loc.includes('київ')) && (title.includes('київ') || alertOblast.includes('київ'))) {
      return true;
    }

    return false;
  });
}

