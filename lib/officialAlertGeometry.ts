import { AlertLocationType, RawAlert, getActiveAirRaidAlerts } from './sources/alertsInUa';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAP_VIEW_BOX = '0 0 4961 3508';
const SIMPLIFIED_URL = 'https://cdn.alerts.in.ua/assets/maps/simplified.svg?v=4';
const DISTRICTS_URL = 'https://cdn.alerts.in.ua/assets/regions/v2/districts.svg?v=12';

// The alerts.in.ua SVG is Web-Mercator projected. These bounds extend the
// official country-content bbox to its full 4961×3508 viewBox.
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
  return ({ oblast: 'область', raion: 'район', hromada: 'громада', city: 'місто', unknown: 'невідомий тип' })[type];
}

export interface OfficialGeometryDescriptor {
  geometryKey: string;
  asset: 'simplified' | 'districts' | 'region';
  geometryUid?: string;
  attribute: 'data-oblast' | 'data-uid';
  value: string;
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
    if (!Number.isInteger(numericUid) || numericUid < 5000) return null;
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

const assetTextCache = new Map<string, Promise<string>>();

async function fetchSvgText(url: string): Promise<string> {
  let pending = assetTextCache.get(url);
  if (!pending) {
    pending = fetch(url, { cache: 'force-cache' }).then(async response => {
      if (!response.ok) throw new Error(`Geometry HTTP ${response.status}`);
      return response.text();
    }).catch(error => {
      assetTextCache.delete(url);
      throw error;
    });
    assetTextCache.set(url, pending);
  }
  return pending;
}

function parseSvg(text: string): Document {
  // districts.svg is intentionally published as an SVG fragment containing
  // sibling <g> nodes, while the other assets are full SVG documents.
  const source = /^\s*<svg[\s>]/i.test(text)
    ? text
    : `<svg xmlns="${SVG_NS}" viewBox="${MAP_VIEW_BOX}">${text}</svg>`;
  const documentNode = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (documentNode.querySelector('parsererror')) throw new Error('Invalid official SVG geometry');
  return documentNode;
}

function findExactGeometry(documentNode: Document, descriptor: OfficialGeometryDescriptor): Element | null {
  const candidates = Array.from(documentNode.querySelectorAll(`[${descriptor.attribute}]`));
  const exact = candidates.filter(node => node.getAttribute(descriptor.attribute) === descriptor.value);
  if (exact.length === 0) return null;
  if (exact.length === 1) return exact[0];

  const group = documentNode.createElementNS(SVG_NS, 'g');
  exact.forEach(node => group.appendChild(node.cloneNode(true)));
  return group;
}

function styleGeometry(root: Element): void {
  const drawable = root.matches('path,polygon,polyline') ? [root] : Array.from(root.querySelectorAll('path,polygon,polyline'));
  drawable.forEach(node => {
    node.setAttribute('fill', '#991b1b');
    node.setAttribute('fill-opacity', '0.22');
    node.setAttribute('stroke', '#dc2626');
    node.setAttribute('stroke-width', '1');
    node.setAttribute('stroke-opacity', '0.7');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('vector-effect', 'non-scaling-stroke');
  });
}

async function loadGeometry(descriptor: OfficialGeometryDescriptor): Promise<Element | null> {
  const url = descriptor.asset === 'simplified'
    ? SIMPLIFIED_URL
    : descriptor.asset === 'districts'
      ? DISTRICTS_URL
      : `https://cdn.alerts.in.ua/assets/regions/${descriptor.geometryUid}.svg?v=3`;
  return findExactGeometry(parseSvg(await fetchSvgText(url)), descriptor);
}

export async function buildOfficialAlertsSvgOverlay(alerts: RawAlert[]): Promise<{
  svg: SVGSVGElement | null;
  diagnostic: OfficialAlertGeometryDiagnostic;
}> {
  const activeAlerts = getActiveAirRaidAlerts(alerts);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', MAP_VIEW_BOX);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-label', 'Активні офіційні зони повітряної тривоги');

  const renderedKeys = new Set<string>();
  const matches: OfficialGeometryMatch[] = [];

  await Promise.all(activeAlerts.map(async alert => {
    const descriptor = getOfficialGeometryDescriptor(alert);
    let geometry: Element | null = null;
    if (descriptor) {
      try { geometry = await loadGeometry(descriptor); } catch { geometry = null; }
    }
    const matched = Boolean(descriptor && geometry);
    const rendered = Boolean(matched && descriptor && !renderedKeys.has(descriptor.geometryKey));

    if (rendered && descriptor && geometry) {
      renderedKeys.add(descriptor.geometryKey);
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('data-official-alert-zone', 'true');
      group.setAttribute('data-source-id', String(alert.location_uid));
      group.setAttribute('data-source-type', alert.location_type);
      group.setAttribute('data-zone-name', alert.location_title);
      group.setAttribute('data-geometry-key', descriptor.geometryKey);
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = `${alert.location_title} — ${officialLocationTypeLabel(alert.location_type)}`;
      group.appendChild(title);
      const clone = geometry.cloneNode(true) as Element;
      styleGeometry(clone);
      group.appendChild(clone);
      svg.appendChild(group);
    }

    matches.push({
      sourceId: String(alert.location_uid),
      name: alert.location_title,
      type: alert.location_type,
      geometryKey: descriptor?.geometryKey || '',
      matched,
      rendered: matched && (rendered || Boolean(descriptor && renderedKeys.has(descriptor.geometryKey)))
    });
  }));

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
  return { svg: renderedKeys.size > 0 ? svg : null, diagnostic };
}

export function __clearOfficialGeometryCacheForTests(): void { assetTextCache.clear(); }
