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
const CACHE_TTL_MS = 15000; // 15 seconds cache

export async function fetchActiveAlerts(token?: string): Promise<{ alerts: RawAlert[]; status: 'OK' | 'CACHE' | 'ERROR'; message?: string }> {
  const apiToken = token || process.env.ALERTS_API_TOKEN || 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';
  const now = Date.now();

  // Return cached alerts if fresh
  if (alertsCache && (now - alertsCache.timestamp) < CACHE_TTL_MS) {
    return { alerts: alertsCache.data, status: 'CACHE' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://api.alerts.in.ua/v1/alerts/active.json', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'User-Agent': 'PersonalSafetyAgent/1.0',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (alertsCache) {
        return { alerts: alertsCache.data, status: 'CACHE', message: `API responded ${res.status}, using cache` };
      }
      return { alerts: [], status: 'ERROR', message: `API error ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    const alerts: RawAlert[] = data.alerts || [];

    alertsCache = {
      data: alerts,
      timestamp: now
    };

    return { alerts, status: 'OK' };
  } catch (err: any) {
    if (alertsCache) {
      return { alerts: alertsCache.data, status: 'CACHE', message: `Network error: ${err.message}, fallback to cache` };
    }
    return { alerts: [], status: 'ERROR', message: err.message || 'Unknown network error' };
  }
}
