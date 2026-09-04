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
const CACHE_TTL_MS = 25000;

export interface AlertsDiagnostic {
  sourceOnline: boolean;
  status: 'OK' | 'CACHE' | 'ERROR';
  activeAlertsCount: number;
  lastFetchTime: string;
  errorDetails?: string;
  usedProxy?: string;
}

export let lastAlertsFetchDiagnostic: AlertsDiagnostic = {
  sourceOnline: false,
  status: 'ERROR',
  activeAlertsCount: 0,
  lastFetchTime: ''
};

export async function fetchActiveAlerts(token?: string): Promise<{ alerts: RawAlert[]; status: 'OK' | 'CACHE' | 'ERROR'; message?: string }> {
  const apiToken = token || process.env.ALERTS_API_TOKEN || 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';
  const now = Date.now();
  const isBrowser = typeof window !== 'undefined';

  if (alertsCache && (now - alertsCache.timestamp) < CACHE_TTL_MS) {
    lastAlertsFetchDiagnostic = {
      sourceOnline: true,
      status: 'CACHE',
      activeAlertsCount: (alertsCache.data || []).filter(a => !a.finished_at).length,
      lastFetchTime: new Date(alertsCache.timestamp).toISOString()
    };
    return { alerts: alertsCache.data, status: 'CACHE' };
  }

  const directUrl = `https://api.alerts.in.ua/v1/alerts/active.json?token=${apiToken}`;

  // In node/server direct fetch works natively. In browser, CORS proxies are required.
  const candidateEndpoints: { name: string; url: string; headers?: Record<string, string>; isJina?: boolean }[] = [];

  if (!isBrowser) {
    candidateEndpoints.push({ name: 'direct', url: directUrl, headers: { 'Accept': 'application/json' } });
  }

  // Jina proxy: fast, reliable CORS-enabled endpoint
  candidateEndpoints.push({
    name: 'jina',
    url: `https://r.jina.ai/${directUrl}`,
    headers: { 'Accept': 'application/json' },
    isJina: true
  });

  // Fallback direct in case browser allows or proxy failed
  candidateEndpoints.push({
    name: 'direct-fallback',
    url: directUrl,
    headers: { 'Accept': 'application/json' }
  });

  // Secondary proxy fallback
  candidateEndpoints.push({
    name: 'allorigins',
    url: `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
  });

  for (const endpoint of candidateEndpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(endpoint.url, {
        headers: endpoint.headers,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        let alerts: RawAlert[] = [];

        if (endpoint.isJina) {
          const jinaJson = await res.json();
          const rawContent = jinaJson?.data?.content;
          if (rawContent) {
            const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
            alerts = parsed.alerts || [];
          }
        } else {
          const data = await res.json();
          alerts = data.alerts || [];
        }

        if (Array.isArray(alerts)) {
          alertsCache = {
            data: alerts,
            timestamp: now
          };

          lastAlertsFetchDiagnostic = {
            sourceOnline: true,
            status: 'OK',
            activeAlertsCount: alerts.filter(a => !a.finished_at).length,
            lastFetchTime: new Date(now).toISOString(),
            usedProxy: endpoint.name
          };

          return { alerts, status: 'OK' };
        }
      }
    } catch (err: any) {
      // Continue to next proxy
    }
  }

  if (alertsCache) {
    lastAlertsFetchDiagnostic = {
      sourceOnline: true,
      status: 'CACHE',
      activeAlertsCount: (alertsCache.data || []).filter(a => !a.finished_at).length,
      lastFetchTime: new Date(alertsCache.timestamp).toISOString(),
      errorDetails: 'Fallback to cached alerts'
    };
    return { alerts: alertsCache.data, status: 'CACHE', message: 'Fallback to cache' };
  }

  lastAlertsFetchDiagnostic = {
    sourceOnline: false,
    status: 'ERROR',
    activeAlertsCount: 0,
    lastFetchTime: new Date(now).toISOString(),
    errorDetails: 'Could not fetch active alerts via candidate endpoints'
  };

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

