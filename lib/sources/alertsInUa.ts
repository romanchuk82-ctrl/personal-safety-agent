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
  sourceUpdatedIso: string;
}

let alertsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5000; // 5 seconds cache for real-time responsiveness

export interface AlertsDiagnostic {
  sourceOnline: boolean;
  status: 'OK' | 'CACHE' | 'ERROR';
  activeAlertsCount: number;
  sourceUpdatedIso: string;
  receivedByAgentIso: string;
  mapUpdatedIso?: string;
  dataAgeSec: number;
  isStale: boolean;
  lastFetchTime: string;
  errorDetails?: string;
  usedProxy?: string;
}

export let lastAlertsFetchDiagnostic: AlertsDiagnostic = {
  sourceOnline: false,
  status: 'ERROR',
  activeAlertsCount: 0,
  sourceUpdatedIso: '',
  receivedByAgentIso: '',
  dataAgeSec: 0,
  isStale: false,
  lastFetchTime: ''
};

export async function fetchActiveAlerts(token?: string): Promise<{
  alerts: RawAlert[];
  status: 'OK' | 'CACHE' | 'ERROR';
  diagnostic?: AlertsDiagnostic;
  message?: string;
}> {
  const apiToken = token || process.env.ALERTS_API_TOKEN || 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';
  const now = Date.now();
  const isBrowser = typeof window !== 'undefined';

  if (alertsCache && (now - alertsCache.timestamp) < CACHE_TTL_MS) {
    const dataAgeSec = alertsCache.sourceUpdatedIso
      ? Math.max(0, Math.floor((now - new Date(alertsCache.sourceUpdatedIso).getTime()) / 1000))
      : Math.max(0, Math.floor((now - alertsCache.timestamp) / 1000));

    lastAlertsFetchDiagnostic = {
      sourceOnline: true,
      status: 'CACHE',
      activeAlertsCount: (alertsCache.data || []).filter(a => !a.finished_at).length,
      sourceUpdatedIso: alertsCache.sourceUpdatedIso,
      receivedByAgentIso: new Date(alertsCache.timestamp).toISOString(),
      dataAgeSec,
      isStale: dataAgeSec > 60,
      lastFetchTime: new Date(alertsCache.timestamp).toISOString()
    };
    return { alerts: [...alertsCache.data], status: 'CACHE', diagnostic: lastAlertsFetchDiagnostic };
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
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(endpoint.url, {
        headers: endpoint.headers,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        let alerts: RawAlert[] = [];
        let sourceUpdatedIso = new Date(now).toISOString();

        if (endpoint.isJina) {
          const jinaJson = await res.json();
          const rawContent = jinaJson?.data?.content;
          if (rawContent) {
            const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
            alerts = parsed.alerts || [];
            if (parsed.meta?.last_updated_at) {
              const dt = new Date(parsed.meta.last_updated_at);
              if (!isNaN(dt.getTime())) {
                sourceUpdatedIso = dt.toISOString();
              }
            }
          }
        } else {
          const data = await res.json();
          alerts = data.alerts || [];
          if (data.meta?.last_updated_at) {
            const dt = new Date(data.meta.last_updated_at);
            if (!isNaN(dt.getTime())) {
              sourceUpdatedIso = dt.toISOString();
            }
          }
        }

        if (Array.isArray(alerts)) {
          alertsCache = {
            data: alerts,
            timestamp: now,
            sourceUpdatedIso
          };

          const dataAgeSec = Math.max(0, Math.floor((now - new Date(sourceUpdatedIso).getTime()) / 1000));

          lastAlertsFetchDiagnostic = {
            sourceOnline: true,
            status: 'OK',
            activeAlertsCount: alerts.filter(a => !a.finished_at).length,
            sourceUpdatedIso,
            receivedByAgentIso: new Date(now).toISOString(),
            dataAgeSec,
            isStale: dataAgeSec > 60,
            lastFetchTime: new Date(now).toISOString(),
            usedProxy: endpoint.name
          };

          return { alerts: [...alerts], status: 'OK', diagnostic: lastAlertsFetchDiagnostic };
        }
      }
    } catch (err: any) {
      // Continue to next proxy
    }
  }

  if (alertsCache) {
    const dataAgeSec = alertsCache.sourceUpdatedIso
      ? Math.max(0, Math.floor((now - new Date(alertsCache.sourceUpdatedIso).getTime()) / 1000))
      : Math.max(0, Math.floor((now - alertsCache.timestamp) / 1000));

    lastAlertsFetchDiagnostic = {
      sourceOnline: true,
      status: 'CACHE',
      activeAlertsCount: (alertsCache.data || []).filter(a => !a.finished_at).length,
      sourceUpdatedIso: alertsCache.sourceUpdatedIso,
      receivedByAgentIso: new Date(alertsCache.timestamp).toISOString(),
      dataAgeSec,
      isStale: dataAgeSec > 60,
      lastFetchTime: new Date(alertsCache.timestamp).toISOString(),
      errorDetails: 'Fallback to cached alerts'
    };
    return { alerts: [...alertsCache.data], status: 'CACHE', diagnostic: lastAlertsFetchDiagnostic, message: 'Fallback to cache' };
  }

  lastAlertsFetchDiagnostic = {
    sourceOnline: false,
    status: 'ERROR',
    activeAlertsCount: 0,
    sourceUpdatedIso: '',
    receivedByAgentIso: '',
    dataAgeSec: 999,
    isStale: true,
    lastFetchTime: new Date(now).toISOString(),
    errorDetails: 'Could not fetch active alerts via candidate endpoints'
  };

  return { alerts: [], status: 'ERROR', diagnostic: lastAlertsFetchDiagnostic, message: 'Could not fetch active alerts' };
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

