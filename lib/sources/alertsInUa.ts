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
  lastSuccessfulFetchIso?: string;
  lastSuccessfulFetchTs?: number;
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

let lastSuccessfulAlertsFetchIso: string = '';
let lastSuccessfulAlertsFetchTs: number = 0;
let lastAlertsSourceUpdatedIso: string = '';
let lastKnownSuccessfulAlerts: RawAlert[] = [];

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

import { isCoordinateInRenderedAlert } from '../officialAlertGeometry';

function parsePayload(payload: any): { alerts: RawAlert[]; sourceUpdatedIso?: string } {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!parsed || !Array.isArray(parsed.alerts)) throw new Error('Invalid official alerts payload');
  const sourceDate = parsed.meta?.last_updated_at ? new Date(parsed.meta.last_updated_at) : null;
  return {
    alerts: parsed.alerts,
    sourceUpdatedIso: sourceDate && !Number.isNaN(sourceDate.getTime()) ? sourceDate.toISOString() : undefined
  };
}

export const DEFAULT_ALERTS_TOKEN = 'f2184a0fd1d14c5aa291368854cbe654d178883fab2203';

async function performFetch(token: string, options: FetchActiveAlertsOptions): Promise<FetchResult> {
  const effectiveToken = token || DEFAULT_ALERTS_TOKEN;
  const requestedAt = Date.now();
  const directUrl = `https://api.alerts.in.ua/v1/alerts/active.json?token=${effectiveToken}`;
  const endpoints: { name: string; url: string; headers?: Record<string, string>; isJina?: boolean }[] = [];

  const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes('lydian-steed'))
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : 'https://personal-safety-backend.mysterious-structure.workers.dev';
  if (backendBase && (typeof window !== 'undefined' || process.env.NODE_ENV !== 'test')) {
    endpoints.push({
      name: 'worker-proxy',
      url: `${backendBase}/api/alerts/active`,
      headers: { Accept: 'application/json' }
    });
  }

  if (typeof window === 'undefined') {
    endpoints.push({
      name: 'direct',
      url: directUrl,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${effectiveToken}`
      }
    });
  }
  endpoints.push({
    name: 'cors_sh',
    url: `https://proxy.cors.sh/${directUrl}`,
    headers: {
      Accept: 'application/json'
    }
  });
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
      lastSuccessfulAlertsFetchIso = new Date(receivedAt).toISOString();
      lastSuccessfulAlertsFetchTs = receivedAt;
      lastKnownSuccessfulAlerts = alerts;
      if (sourceUpdatedIso) {
        lastAlertsSourceUpdatedIso = sourceUpdatedIso;
      }

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
        lastSuccessfulFetchIso: lastSuccessfulAlertsFetchIso,
        lastSuccessfulFetchTs: lastSuccessfulAlertsFetchTs,
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
    activeAlertsCount: getActiveAirRaidAlerts(lastKnownSuccessfulAlerts).length,
    sourceUpdatedIso: lastAlertsSourceUpdatedIso || '',
    receivedByAgentIso: new Date(requestedAt).toISOString(),
    lastSuccessfulFetchIso: lastSuccessfulAlertsFetchIso || undefined,
    lastSuccessfulFetchTs: lastSuccessfulAlertsFetchTs || undefined,
    dataAgeSec: lastSuccessfulAlertsFetchTs ? Math.max(0, Math.floor((Date.now() - lastSuccessfulAlertsFetchTs) / 1000)) : 0,
    isStale: true,
    lastFetchTime: new Date().toISOString(),
    errorDetails: failures.join('; ')
  };
  lastAlertsFetchDiagnostic = diagnostic;
  return {
    alerts: lastKnownSuccessfulAlerts,
    status: 'ERROR',
    diagnostic,
    message: 'Official alerts source is temporarily unavailable; retaining last confirmed state with stale warning.'
  };
}

export async function fetchActiveAlerts(token?: string, options: FetchActiveAlertsOptions = {}): Promise<FetchResult> {
  const apiToken = token || process.env.NEXT_PUBLIC_ALERTS_API_TOKEN || process.env.ALERTS_API_TOKEN || DEFAULT_ALERTS_TOKEN;
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
export function isUserInOfficialAlert(
  userOblast?: string,
  userLocationName?: string,
  alerts: RawAlert[] = [],
  userCoords?: { lat: number; lng: number }
): boolean {
  const activeAlerts = getActiveAirRaidAlerts(alerts);
  if (activeAlerts.length === 0) return false;

  // 1. Precise GPS Point-in-Polygon check if coordinates are provided
  if (userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number') {
    if (isCoordinateInRenderedAlert(userCoords.lat, userCoords.lng)) {
      return true;
    }
  }

  const userOblastCanonical = canonicalOblast(userOblast);
  const userLocationCanonical = canonicalName(userLocationName);
  const userIsKyivCity = canonicalName(userOblast) === 'київ' || userLocationCanonical === 'київ';

  // Extract individual location tokens from compound names like "Ірпінь / Буча", "Київ (Хрещатик / Центр)"
  const locationTokens: string[] = [];
  if (userLocationName) {
    const rawTokens = userLocationName.split(/[\/\,\;]/);
    for (const tok of rawTokens) {
      const c = canonicalName(tok);
      if (c && !locationTokens.includes(c)) locationTokens.push(c);
    }
    if (userLocationCanonical && !locationTokens.includes(userLocationCanonical)) {
      locationTokens.push(userLocationCanonical);
    }
  }

  return activeAlerts.some(alert => {
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

    if (locationTokens.length === 0) return false;
    const alertCanon = canonicalName(alert.location_title);

    for (const token of locationTokens) {
      if (alertCanon === token) return true;

      // Stem match (e.g. 'бровари' vs 'броварський', 'бориспіль' vs 'бориспільський')
      const userStem = token.slice(0, Math.min(token.length, 5));
      const alertStem = alertCanon.slice(0, Math.min(alertCanon.length, 5));
      if (userStem.length >= 4 && (userStem === alertStem || alertCanon.startsWith(userStem) || token.startsWith(alertStem))) {
        return true;
      }
    }

    return false;
  });
}

export function getLastKnownGoodAlerts(): RawAlert[] {
  return lastKnownSuccessfulAlerts;
}

export function getLastKnownSuccessfulFetchTs(): number {
  return lastSuccessfulAlertsFetchTs;
}

export function __resetAlertsFetchStateForTests(): void {
  inFlightFetch = null;
  lastSuccessfulAlertsFetchIso = '';
  lastSuccessfulAlertsFetchTs = 0;
  lastAlertsSourceUpdatedIso = '';
  lastKnownSuccessfulAlerts = [];
}

