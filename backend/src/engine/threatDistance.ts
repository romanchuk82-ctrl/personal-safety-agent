import { LocationPayload, ThreatEvent, AlertAssessment } from '../types.js';

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates Great-Circle Haversine distance between two WGS84 points in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates initial bearing from point 1 to point 2 in degrees (0-360).
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Converts degrees into 8-point compass notation in Ukrainian and English.
 */
export function degreesToCompass(deg: number): { uk: string; en: string } {
  const directions = [
    { uk: 'Пн', en: 'N' },
    { uk: 'Пн-Сх', en: 'NE' },
    { uk: 'Сх', en: 'E' },
    { uk: 'Пд-Сх', en: 'SE' },
    { uk: 'Пд', en: 'S' },
    { uk: 'Пд-Зх', en: 'SW' },
    { uk: 'Зх', en: 'W' },
    { uk: 'Пн-Зх', en: 'NW' }
  ];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

/**
 * Evaluates tactical proximity of a threat to user location.
 */
export function evaluateThreatProximity(
  userLoc: LocationPayload,
  threat: ThreatEvent
): AlertAssessment {
  const dist = haversineDistanceKm(
    userLoc.latitude,
    userLoc.longitude,
    threat.lat,
    threat.lon
  );
  const roundedKm = Math.round(dist * 10) / 10;
  const bearing = calculateBearingDegrees(
    userLoc.latitude,
    userLoc.longitude,
    threat.lat,
    threat.lon
  );
  const compass = degreesToCompass(bearing);

  let relevance: AlertAssessment['relevance'] = 'IRRELEVANT';
  let severity: AlertAssessment['severity'] = 'INFO';
  let alertRequired = false;

  if (dist <= 5.0) {
    relevance = 'CRITICAL';
    severity = 'DANGER';
    alertRequired = true;
  } else if (dist <= 15.0) {
    relevance = 'WARNING';
    severity = 'WARNING';
    alertRequired = true;
  } else if (dist <= 30.0) {
    relevance = 'OBSERVATION';
    alertRequired = false;
  }

  const alertTitle = severity === 'DANGER' ? '🚨 НЕБЕЗПЕКА ПОРУЧ' : '⚠️ ПОПЕРЕДЖЕННЯ ПРО ЗАГРОЗУ';
  const prefix = threat.isSimulated ? '[TEST] ' : '';
  const threatType: Record<string, string> = {
    UAV_STRIKE: 'БпЛА',
    BALLISTIC_MISSILE: 'Балістична ракета',
    CRUISE_MISSILE: 'Крилата ракета',
    AVIATION: 'Авіаційна загроза',
    ARTILLERY: 'Артилерійська загроза',
    GENERAL_AIR_ALARM: 'Повітряна тривога'
  };
  const reliableDirection = Number.isFinite(bearing) && (userLoc.horizontalAccuracy ?? 0) <= 1000;
  const directionPart = reliableDirection ? ` · напрямок ${compass.uk}` : '';
  const locationPart = threat.title ? ` · ${threat.title.replace(/^\[TEST\]\s*/, '')}` : '';
  const alertBody = `${prefix}${threatType[threat.category] || 'Загроза'} · ${roundedKm.toFixed(1)} км${directionPart}${locationPart}`;

  return {
    threatId: threat.id,
    category: threat.category,
    distanceKm: roundedKm,
    directionCompass: compass.en,
    relevance,
    severity,
    alertRequired,
    alertTitle,
    alertBody,
    timestamp: Date.now()
  };
}

/**
 * Re-evaluates threat relevance when a user moves.
 * Returns true if an updated alert should be dispatched due to:
 * 1. User moving closer by at least distanceDeltaKm (default 3km).
 * 2. User entering the critical zone (<= 5km) from a warning zone.
 */
export function shouldReAlertMovingUser(
  previousAlertedDistanceKm: number | undefined,
  currentDistanceKm: number,
  distanceDeltaKm: number = 3.0
): boolean {
  if (previousAlertedDistanceKm === undefined) {
    return currentDistanceKm <= 15.0;
  }

  // If user moved significantly closer
  if (previousAlertedDistanceKm - currentDistanceKm >= distanceDeltaKm) {
    return true;
  }

  // If user transitioned into immediate critical zone (< 5km)
  if (previousAlertedDistanceKm > 5.0 && currentDistanceKm <= 5.0) {
    return true;
  }

  return false;
}
