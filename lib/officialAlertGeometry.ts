import { AlertLocationType, RawAlert, getActiveAirRaidAlerts } from './sources/alertsInUa';
import { UKRAINE_REGIONS_GEOJSON } from './ukraineRegions';

export const OFFICIAL_ALERTS_OVERLAY_BOUNDS: [[number, number], [number, number]] = [
  [43.9680599786413, 21.473551245795253],
  [52.99770422470714, 40.796072853651594]
];

export interface OfficialGeometryMatch {
  sourceId: string;
  name: string;
  type: AlertLocationType;
  geometryKey: string;
  matched: boolean;
  rendered: boolean;
}

export interface OfficialAlertGeometryDiagnostic {
  activeZoneCount: number;
  matchedGeometryCount: number;
  unmatchedGeometryCount: number;
  renderedGeometryCount: number;
  matches: OfficialGeometryMatch[];
  unmatched: Array<{ sourceId: string; name: string; type: AlertLocationType }>;
}

export const EMPTY_OFFICIAL_GEOMETRY_DIAGNOSTIC: OfficialAlertGeometryDiagnostic = {
  activeZoneCount: 0,
  matchedGeometryCount: 0,
  unmatchedGeometryCount: 0,
  renderedGeometryCount: 0,
  matches: [],
  unmatched: []
};

export function officialLocationTypeLabel(type: AlertLocationType): string {
  return ({ oblast: 'область', raion: 'район', hromada: 'громада', city: 'місто', unknown: 'невідомий тип' })[type] || type;
}

export interface OfficialGeometryDescriptor {
  geometryKey: string;
  asset: 'simplified' | 'districts' | 'region';
  geometryUid?: string;
  attribute: 'data-oblast' | 'data-uid';
  value: string;
}

function canonicalName(value?: string): string {
  return (value || '')
    .toLocaleLowerCase('uk-UA')
    .replace(/\([^)]*\)/g, '')
    .replace(/^м\.\s*/u, '')
    .replace(/^місто\s+/u, '')
    .replace(/\s+(територіальна\s+громада|міська\s+громада|сільська\s+громада|селищна\s+громада|громада|район|область)$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getOfficialGeometryDescriptor(alert: RawAlert): OfficialGeometryDescriptor | null {
  const uid = String(alert.location_uid || '').trim();
  if (!uid) return null;
  if (alert.location_type === 'oblast') {
    return {
      geometryKey: `oblast:${uid}`,
      asset: 'simplified',
      attribute: 'data-oblast',
      value: alert.location_title.trim()
    };
  }
  if (alert.location_type === 'raion') {
    return { geometryKey: `raion:${uid}`, asset: 'districts', attribute: 'data-uid', value: uid };
  }
  if (alert.location_type === 'hromada') {
    return { geometryKey: `hromada:${uid}`, asset: 'region', geometryUid: uid, attribute: 'data-uid', value: uid };
  }
  if (alert.location_type === 'city') {
    const numericUid = Number(uid);
    if (!Number.isInteger(numericUid) || numericUid < 5000) {
      if (uid === '31' || canonicalName(alert.location_title) === 'київ') {
        return {
          geometryKey: 'oblast:31',
          asset: 'simplified',
          attribute: 'data-oblast',
          value: alert.location_title.trim()
        };
      }
      return null;
    }
    const geometryUid = String(numericUid - 5000);
    return {
      geometryKey: `hromada:${geometryUid}`,
      asset: 'region',
      geometryUid,
      attribute: 'data-uid',
      value: geometryUid
    };
  }
  return null;
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: {
    id?: string;
    uid?: string;
    name?: string;
    normalizedName?: string;
    hromada?: string;
    raion?: string;
    oblast?: string;
    type?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

let cachedOblasts: GeoJsonFeatureCollection | null = null;
let cachedRaions: GeoJsonFeatureCollection | null = null;
let cachedHromadas: GeoJsonFeatureCollection | null = null;

function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const metaBase = process.env.NEXT_PUBLIC_BASE_PATH;
  if (metaBase) return metaBase;
  const pathname = window.location.pathname;
  if (pathname.startsWith('/personal-safety-agent')) {
    return '/personal-safety-agent';
  }
  return '';
}

async function loadDataset(filename: 'ukraine_oblasts.json' | 'ukraine_raions.json' | 'ukraine_hromadas.json'): Promise<GeoJsonFeatureCollection> {
  if (filename === 'ukraine_oblasts.json') {
    if (cachedOblasts) return cachedOblasts;
  } else if (filename === 'ukraine_raions.json') {
    if (cachedRaions) return cachedRaions;
  } else if (filename === 'ukraine_hromadas.json') {
    if (cachedHromadas) return cachedHromadas;
  }

  let data: GeoJsonFeatureCollection | null = null;

  if (typeof window !== 'undefined') {
    const basePath = getBaseUrl();
    const url = `${basePath}/data/${filename}`;
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (response.ok) {
        data = (await response.json()) as GeoJsonFeatureCollection;
      }
    } catch {
      data = null;
    }
  }

  // Fallback to Node.js filesystem in testing / SSR / build environment
  if (!data && typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(process.cwd(), 'public', 'data', filename);
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(text) as GeoJsonFeatureCollection;
      }
    } catch {
      data = null;
    }
  }

  // Fallback for oblasts if file is not accessible
  if (!data && filename === 'ukraine_oblasts.json') {
    data = UKRAINE_REGIONS_GEOJSON as GeoJsonFeatureCollection;
  }

  if (!data) {
    data = { type: 'FeatureCollection', features: [] };
  }

  if (filename === 'ukraine_oblasts.json') cachedOblasts = data;
  else if (filename === 'ukraine_raions.json') cachedRaions = data;
  else if (filename === 'ukraine_hromadas.json') cachedHromadas = data;

  return data;
}

function findFeatureInCollection(
  alert: RawAlert,
  descriptor: OfficialGeometryDescriptor | null,
  collection: GeoJsonFeatureCollection
): GeoJsonFeature | null {
  const uid = String(alert.location_uid || '').trim();
  const canonTitle = canonicalName(alert.location_title);

  // 1. Direct UID match
  if (uid) {
    const directUid = collection.features.find(f => {
      const fUid = String(f.properties?.uid || f.properties?.id || '').trim();
      return fUid === uid;
    });
    if (directUid) return directUid;
  }

  // 2. GeometryUid match for cities (e.g. 5351 -> 351)
  if (descriptor?.geometryUid) {
    const geomMatch = collection.features.find(f => {
      const fUid = String(f.properties?.uid || f.properties?.id || '').trim();
      return fUid === descriptor.geometryUid;
    });
    if (geomMatch) return geomMatch;
  }

  // 3. Special case for м. Київ
  if (alert.location_uid === '31' || canonTitle === 'київ') {
    const kyiv = collection.features.find(f => {
      const fUid = String(f.properties?.uid || f.properties?.id || '').trim();
      const fName = canonicalName(f.properties?.name || '');
      return fUid === '31' || fName === 'київ';
    });
    if (kyiv) return kyiv;
  }

  // 4. Canonical name match
  if (canonTitle) {
    const nameMatch = collection.features.find(f => {
      const fName = canonicalName(f.properties?.name || f.properties?.hromada || '');
      return fName === canonTitle;
    });
    if (nameMatch) return nameMatch;
  }

  return null;
}

export interface OfficialAlertsGeoJsonResult {
  geoJson: GeoJsonFeatureCollection | null;
  diagnostic: OfficialAlertGeometryDiagnostic;
}

export async function buildOfficialAlertsGeoJson(alerts: RawAlert[]): Promise<OfficialAlertsGeoJsonResult> {
  const activeAlerts = getActiveAirRaidAlerts(alerts);
  if (activeAlerts.length === 0) {
    return { geoJson: null, diagnostic: EMPTY_OFFICIAL_GEOMETRY_DIAGNOSTIC };
  }

  const [oblasts, raions, hromadas] = await Promise.all([
    loadDataset('ukraine_oblasts.json'),
    loadDataset('ukraine_raions.json'),
    loadDataset('ukraine_hromadas.json')
  ]);

  const renderedFeatures: GeoJsonFeature[] = [];
  const renderedKeys = new Set<string>();
  const matches: OfficialGeometryMatch[] = [];

  for (const alert of activeAlerts) {
    const descriptor = getOfficialGeometryDescriptor(alert);
    const geometryKey = descriptor?.geometryKey || `${alert.location_type}:${alert.location_uid}`;

    let matchedFeature: GeoJsonFeature | null = null;
    if (alert.location_type === 'oblast') {
      matchedFeature = findFeatureInCollection(alert, descriptor, oblasts);
    } else if (alert.location_type === 'raion') {
      matchedFeature = findFeatureInCollection(alert, descriptor, raions);
    } else if (alert.location_type === 'hromada') {
      matchedFeature = findFeatureInCollection(alert, descriptor, hromadas);
    } else if (alert.location_type === 'city') {
      matchedFeature = findFeatureInCollection(alert, descriptor, hromadas) ||
                       findFeatureInCollection(alert, descriptor, oblasts);
    }

    const matched = Boolean(matchedFeature);
    const rendered = Boolean(matched && !renderedKeys.has(geometryKey));

    if (rendered && matchedFeature) {
      renderedKeys.add(geometryKey);
      renderedFeatures.push({
        type: 'Feature',
        properties: {
          ...matchedFeature.properties,
          officialAlert: true,
          sourceId: String(alert.location_uid),
          sourceType: alert.location_type,
          zoneName: alert.location_title,
          geometryKey
        },
        geometry: matchedFeature.geometry
      });
    }

    matches.push({
      sourceId: String(alert.location_uid),
      name: alert.location_title,
      type: alert.location_type,
      geometryKey,
      matched,
      rendered: matched && (rendered || renderedKeys.has(geometryKey))
    });
  }

  matches.sort((a, b) => a.sourceId.localeCompare(b.sourceId, 'uk-UA', { numeric: true }));
  const unmatched = matches.filter(item => !item.matched).map(({ sourceId, name, type }) => ({ sourceId, name, type }));

  const diagnostic: OfficialAlertGeometryDiagnostic = {
    activeZoneCount: activeAlerts.length,
    matchedGeometryCount: matches.filter(item => item.matched).length,
    unmatchedGeometryCount: unmatched.length,
    renderedGeometryCount: renderedKeys.size,
    matches,
    unmatched
  };

  return {
    geoJson: renderedFeatures.length > 0 ? { type: 'FeatureCollection', features: renderedFeatures } : null,
    diagnostic
  };
}

export async function buildOfficialAlertsSvgOverlay(alerts: RawAlert[]): Promise<{
  svg: SVGSVGElement | null;
  diagnostic: OfficialAlertGeometryDiagnostic;
}> {
  const { diagnostic } = await buildOfficialAlertsGeoJson(alerts);
  return { svg: null, diagnostic };
}

export function __clearOfficialGeometryCacheForTests(): void {
  cachedOblasts = null;
  cachedRaions = null;
  cachedHromadas = null;
}

