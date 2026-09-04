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
