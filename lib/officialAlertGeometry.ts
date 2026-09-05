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
    .replace(/^село\s+/u, '')
    .replace(/^смт\s+/u, '')
    .replace(/^селище\s+/u, '')
    .replace(/\s+(територіальна\s+громада|міська\s+громада|сільська\s+громада|селищна\s+громада|громада|район|область)$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalOblast(value?: string): string {
  return canonicalName(value).replace(/\s+область$/u, '').trim();
}

// City name to hromada root mapper for Ukrainian cities
const CITY_TO_HROMADA_STEMS: Record<string, string> = {
  'харків': 'харківськ',
  'дніпро': 'дніпровськ',
  'запоріжжя': 'запорізьк',
  'кривий ріг': 'криворізьк',
  'одеса': 'одеськ',
  'миколаїв': 'миколаївськ',
  'херсон': 'херсонськ',
  'полтава': 'полтавськ',
  'чернігів': 'чернігівськ',
  'суми': 'сумськ',
  'черкаси': 'черкаськ',
  'житомир': 'житомирськ',
  'вінниця': 'вінницьк',
  'рівне': 'рівненськ',
  'хмельницький': 'хмельницьк',
  'луцьк': 'луцьк',
  'тернопіль': 'тернопільськ',
  'івано-франківськ': 'івано-франківськ',
  'ужгород': 'ужгородськ',
  'чернівці': 'чернівецьк',
  'львів': 'львівськ',
  'нікополь': 'нікопольськ',
  'павлоград': 'павлоградськ',
  'світловодськ': 'світловодськ',
  'кременчук': 'кременчуцьк',
  'луганськ': 'луганськ',
  'донецьк': 'донецьк',
  'маріуполь': 'маріупольськ',
  'краматорськ': 'краматорськ',
  'словʼянськ': 'словʼянськ',
  'бахмут': 'бахмутськ'
};

// Known renamed districts (2024 decommunization)
const RENAMED_RAIONS: Record<string, string> = {
  'самарівський': 'новомосковський',
  'новомосковський': 'самарівський',
  'берестинський': 'красноградський',
  'красноградський': 'берестинський'
};

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

function matchAlertToFeature(
  alert: RawAlert,
  descriptor: OfficialGeometryDescriptor | null,
  datasets: { oblasts: GeoJsonFeatureCollection; raions: GeoJsonFeatureCollection; hromadas: GeoJsonFeatureCollection }
): { feature: GeoJsonFeature; geometryKey: string } | null {
  const alertType = alert.location_type;
  const alertUid = String(alert.location_uid || '').trim();
  const alertCanonTitle = canonicalName(alert.location_title);
  const alertCanonOblast = canonicalOblast(alert.location_oblast);

  // 0. Special case: м. Київ (Oblast UID 31 or title Kyiv)
  if (alertUid === '31' || alertCanonTitle === 'київ' || alertCanonOblast === 'київ') {
    const kyiv = datasets.oblasts.features.find(f => f.properties.uid === '31' || canonicalName(f.properties.name) === 'київ');
    if (kyiv) return { feature: kyiv, geometryKey: 'oblast:31' };
  }

  // 1. OBLAST ALERTS
  if (alertType === 'oblast') {
    const obMatch = datasets.oblasts.features.find(f => {
      const fCanon = canonicalName(f.properties.name);
      return fCanon === alertCanonTitle || (f.properties.uid && f.properties.uid === alertUid);
    });
    if (obMatch) {
      const uid = obMatch.properties.uid || alertUid;
      return { feature: obMatch, geometryKey: `oblast:${uid}` };
    }
    return null;
  }

  // 2. RAION ALERTS
  if (alertType === 'raion') {
    const raionMatch = datasets.raions.features.find(f => {
      const fNameCanon = canonicalName(f.properties.name);
      const fNormCanon = canonicalName(f.properties.normalizedName);
      if (fNameCanon === alertCanonTitle || fNormCanon === alertCanonTitle) return true;
      if (RENAMED_RAIONS[alertCanonTitle] && (fNameCanon === RENAMED_RAIONS[alertCanonTitle] || fNormCanon === RENAMED_RAIONS[alertCanonTitle])) return true;
      return false;
    });
    if (raionMatch) {
      const uid = raionMatch.properties.uid || raionMatch.properties.id || alertUid;
      return { feature: raionMatch, geometryKey: `raion:${uid}` };
    }
    return null;
  }

  // 3. HROMADA & CITY ALERTS
  if (alertType === 'hromada' || alertType === 'city') {
    if (!alertCanonOblast) return null;

    // Filter candidate hromadas strictly within the specified oblast
    const candidates = datasets.hromadas.features.filter(f => {
      const fOblastCanon = canonicalOblast(f.properties.oblast);
      return fOblastCanon === alertCanonOblast;
    });

    if (candidates.length === 0) return null;

    // Step A: Exact canonical match on hromada name
    const exactMatch = candidates.find(f => {
      const fHromadaCanon = canonicalName(f.properties.hromada || f.properties.name);
      return fHromadaCanon === alertCanonTitle;
    });
    if (exactMatch) {
      const uid = exactMatch.properties.uid || exactMatch.properties.id || alertUid;
      return { feature: exactMatch, geometryKey: `hromada:${uid}` };
    }

    // Step B: City stem match (e.g. 'кривий ріг' -> 'криворізьк', 'дніпро' -> 'дніпровськ')
    const cityStem = CITY_TO_HROMADA_STEMS[alertCanonTitle] || alertCanonTitle;
    const stemMatch = candidates.find(f => {
      const fHromadaCanon = canonicalName(f.properties.hromada || f.properties.name);
      return fHromadaCanon.startsWith(cityStem);
    });
    if (stemMatch) {
      const uid = stemMatch.properties.uid || stemMatch.properties.id || alertUid;
      return { feature: stemMatch, geometryKey: `hromada:${uid}` };
    }

    // Step C: Prefix match within the same oblast
    const prefixMatch = candidates.find(f => {
      const fHromadaCanon = canonicalName(f.properties.hromada || f.properties.name);
      return fHromadaCanon.startsWith(alertCanonTitle) || alertCanonTitle.startsWith(fHromadaCanon);
    });
    if (prefixMatch) {
      const uid = prefixMatch.properties.uid || prefixMatch.properties.id || alertUid;
      return { feature: prefixMatch, geometryKey: `hromada:${uid}` };
    }

    return null;
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
    return { geoJson: null, diagnostic: EMPTY_OFFICIAL_GEONT_DIAGNOSTIC() };
  }

  const [oblasts, raions, hromadas] = await Promise.all([
    loadDataset('ukraine_oblasts.json'),
    loadDataset('ukraine_raions.json'),
    loadDataset('ukraine_hromadas.json')
  ]);

  const datasets = { oblasts, raions, hromadas };
  const renderedFeatures: GeoJsonFeature[] = [];
  const renderedKeys = new Set<string>();
  const matches: OfficialGeometryMatch[] = [];

  for (const alert of activeAlerts) {
    const descriptor = getOfficialGeometryDescriptor(alert);
    const matchResult = matchAlertToFeature(alert, descriptor, datasets);

    const matched = Boolean(matchResult);
    const geometryKey = matchResult?.geometryKey || `${alert.location_type}:${alert.location_uid}`;
    const rendered = Boolean(matched && matchResult && !renderedKeys.has(geometryKey));

    if (rendered && matchResult) {
      renderedKeys.add(geometryKey);
      renderedFeatures.push({
        type: 'Feature',
        properties: {
          ...matchResult.feature.properties,
          officialAlert: true,
          sourceId: String(alert.location_uid),
          sourceType: alert.location_type,
          zoneName: alert.location_title,
          geometryKey
        },
        geometry: matchResult.feature.geometry
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

  const geoJsonResult: GeoJsonFeatureCollection | null = renderedFeatures.length > 0 ? { type: 'FeatureCollection', features: renderedFeatures } : null;
  lastRenderedAlertsGeoJson = geoJsonResult;

  return {
    geoJson: geoJsonResult,
    diagnostic
  };
}

let lastRenderedAlertsGeoJson: GeoJsonFeatureCollection | null = null;

export function getLastRenderedAlertsGeoJson(): GeoJsonFeatureCollection | null {
  return lastRenderedAlertsGeoJson;
}

export function isPointInPolygon(point: [number, number], ring: [number, number][]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInGeometry(point: [number, number], geometry: { type: string; coordinates: any }): boolean {
  if (!geometry || !geometry.coordinates) return false;
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates;
    if (!rings || rings.length === 0) return false;
    if (!isPointInPolygon(point, rings[0])) return false;
    for (let h = 1; h < rings.length; h++) {
      if (isPointInPolygon(point, rings[h])) return false;
    }
    return true;
  }
  if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (isPointInGeometry(point, { type: 'Polygon', coordinates: poly })) {
        return true;
      }
    }
  }
  return false;
}

export function isCoordinateInRenderedAlert(lat: number, lng: number, geoJson?: GeoJsonFeatureCollection | null): boolean {
  const collection = geoJson || lastRenderedAlertsGeoJson;
  if (!collection || !collection.features || collection.features.length === 0) return false;
  const pt: [number, number] = [lng, lat];
  for (const feature of collection.features) {
    if (isPointInGeometry(pt, feature.geometry)) {
      return true;
    }
  }
  return false;
}

function EMPTY_OFFICIAL_GEONT_DIAGNOSTIC(): OfficialAlertGeometryDiagnostic {
  return {
    activeZoneCount: 0,
    matchedGeometryCount: 0,
    unmatchedGeometryCount: 0,
    renderedGeometryCount: 0,
    matches: [],
    unmatched: []
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
  lastRenderedAlertsGeoJson = null;
}

