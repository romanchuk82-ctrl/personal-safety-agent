export type AlertLocationType = 'oblast' | 'raion' | 'hromada' | 'city' | 'unknown';

export interface RawAlert {
  id: number;
  location_title: string;
  location_type: AlertLocationType;
  started_at: string;
  finished_at: string | null;
  updated_at: string;
  alert_type: string;
  location_oblast: string;
  location_raion?: string;
  location_uid: string;
  location_oblast_uid?: string;
  notes?: string | null;
  calculated?: boolean;
}

export interface AlertsDiagnostic {
  sourceOnline: boolean;
  status: 'OK' | 'ERROR';
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

export interface FetchActiveAlertsOptions {
  force?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
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

type FetchResult = {
  alerts: RawAlert[];
  status: 'OK' | 'ERROR';
  diagnostic: AlertsDiagnostic;
  message?: string;
};

let inFlightFetch: Promise<FetchResult> | null = null;

export function getActiveAirRaidAlerts(alerts: RawAlert[] = []): RawAlert[] {
  return alerts.filter(alert => !alert.finished_at && alert.alert_type === 'air_raid');
}

function parsePayload(payload: any): { alerts: RawAlert[]; sourceUpdatedIso?: string } {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!parsed || !Array.isArray(parsed.alerts)) throw new Error('Invalid official alerts payload');
  const sourceDate = parsed.meta?.last_updated_at ? new Date(parsed.meta.last_updated_at) : null;
  return {
    alerts: parsed.alerts,
    sourceUpdatedIso: sourceDate && !Number.isNaN(sourceDate.getTime()) ? sourceDate.toISOString() : undefined
  };
}

async function performFetch(token: string, options: FetchActiveAlertsOptions): Promise<FetchResult> {
  const requestedAt = Date.now();
  const directUrl = `https://api.alerts.in.ua/v1/alerts/active.json?token=${token}`;
  const endpoints: { name: string; url: string; headers?: Record<string, string>; isJina?: boolean }[] = [];

  if (typeof window === 'undefined') {
    endpoints.push({ name: 'direct', url: directUrl, headers: { Accept: 'application/json' } });
  }
  endpoints.push({
    name: 'jina',
    url: `https://r.jina.ai/${directUrl}`,
    headers: {
      Accept: 'application/json',
      'X-Cache-Tolerance': options.force ? '0' : '5',
      ...(options.force ? { 'X-No-Cache': 'true' } : {})
    },
    isJina: true
  });
  endpoints.push({ name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}` });

  const endpointTimeoutMs = options.timeoutMs || (options.force ? 3200 : 4500);
  const failures: string[] = [];

  for (const endpoint of endpoints) {
    if (options.signal?.aborted) {
      failures.push(`${endpoint.name}: aborted by signal`);
      break;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), endpointTimeoutMs);
    const abortHandler = () => controller.abort();

    if (options.signal) {
      options.signal.addEventListener('abort', abortHandler, { once: true });
    }

    try {
      const response = await fetch(endpoint.url, {
        headers: endpoint.headers,
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const { alerts, sourceUpdatedIso = new Date().toISOString() } = parsePayload(endpoint.isJina ? json?.data?.content : json);
      const receivedAt = Date.now();
      // `meta.last_updated_at` is the time of the last alert-state mutation, not
      // the age of this HTTP response. A successful no-store/bypassed fetch is a
      // current snapshot even when no zone has changed for several minutes.
      const dataAgeSec = 0;
      const diagnostic: AlertsDiagnostic = {
        sourceOnline: true,
        status: 'OK',
        activeAlertsCount: getActiveAirRaidAlerts(alerts).length,
        sourceUpdatedIso,
        receivedByAgentIso: new Date(receivedAt).toISOString(),
        dataAgeSec,
        isStale: false,
        lastFetchTime: new Date(receivedAt).toISOString(),
        usedProxy: endpoint.name
      };
      lastAlertsFetchDiagnostic = diagnostic;
      return { alerts, status: 'OK', diagnostic };
    } catch (error: any) {
      failures.push(`${endpoint.name}: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }
    }
  }

  const diagnostic: AlertsDiagnostic = {
    sourceOnline: false,
    status: 'ERROR',
    activeAlertsCount: 0,
    sourceUpdatedIso: '',
    receivedByAgentIso: new Date(requestedAt).toISOString(),
    dataAgeSec: 0,
    isStale: true,
    lastFetchTime: new Date().toISOString(),
    errorDetails: failures.join('; ')
  };
  lastAlertsFetchDiagnostic = diagnostic;
  return {
    alerts: [],
    status: 'ERROR',
    diagnostic,
    message: 'Official alerts source is unavailable; stale polygons were cleared.'
  };
}

export async function fetchActiveAlerts(token?: string, options: FetchActiveAlertsOptions = {}): Promise<FetchResult> {
  const apiToken = token || process.env.ALERTS_API_TOKEN || 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';
  // Overlapping timers share only the active network request. Completed results are
  // never cached, so manual refresh always reaches the official source.
  if (inFlightFetch) {
    if (!options.force) return inFlightFetch;
    await inFlightFetch;
  }
  inFlightFetch = performFetch(apiToken, options).finally(() => { inFlightFetch = null; });
  return inFlightFetch;
}

function canonicalName(value?: string): string {
  return (value || '')
    .toLocaleLowerCase('uk-UA')
    .replace(/\([^)]*\)/g, '')
    .replace(/^м\.\s*/u, '')
    .replace(/^місто\s+/u, '')
    .replace(/^село\s+/u, '')
    .replace(/^смт\s+/u, '')
    .replace(/\s+(територіальна\s+громада|міська\s+громада|сільська\s+громада|селищна\s+громада|громада|район|область|р-н)$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalOblast(value?: string): string {
  return canonicalName(value).replace(/\s+область$/u, '').trim();
}

/** Local alerts are deliberately never promoted to their whole oblast. */
export function isUserInOfficialAlert(userOblast?: string, userLocationName?: string, alerts: RawAlert[] = []): boolean {
  const userOblastCanonical = canonicalOblast(userOblast);
  const userLocationCanonical = canonicalName(userLocationName);
  const userIsKyivCity = canonicalName(userOblast) === 'київ' || userLocationCanonical === 'київ';

  return getActiveAirRaidAlerts(alerts).some(alert => {
    if (alert.location_type === 'oblast') {
      const alertIsKyivCity = alert.location_title.trim().startsWith('м.') && canonicalName(alert.location_title) === 'київ';
      if (alertIsKyivCity !== userIsKyivCity && (alertIsKyivCity || userIsKyivCity)) return false;
      return Boolean(userOblastCanonical) && canonicalOblast(alert.location_title) === userOblastCanonical;
    }

    // Raion / Hromada / City alert matching
    const alertOblast = canonicalOblast(alert.location_oblast);
    if (userOblastCanonical && alertOblast && alertOblast !== userOblastCanonical) {
      return false;
    }

    if (!userLocationCanonical) return false;
    const alertCanon = canonicalName(alert.location_title);

    if (alertCanon === userLocationCanonical) return true;

    // Stem match (e.g. 'бровари' vs 'броварський', 'бориспіль' vs 'бориспільський')
    const userStem = userLocationCanonical.slice(0, Math.min(userLocationCanonical.length, 5));
    const alertStem = alertCanon.slice(0, Math.min(alertCanon.length, 5));
    if (userStem.length >= 4 && userStem === alertStem) {
      return true;
    }

    return false;
  });
}

export function __resetAlertsFetchStateForTests(): void { inFlightFetch = null; }
