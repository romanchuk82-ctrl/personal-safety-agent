import { LocationPayload, ThreatEvent, AlertAssessment, ThreatSeverity } from './types.js';

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  return (theta * 180 / Math.PI + 360) % 360;
}

export function degreesToCompassUk(degrees: number): string {
  const directions = [
    'Пн', 'Пн-Сх', 'Сх', 'Пд-Сх',
    'Пд', 'Пд-Зх', 'Зх', 'Пн-Зх'
  ];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

export function evaluateThreatProximity(
  userLoc: LocationPayload,
  threat: ThreatEvent
): AlertAssessment {
  const distanceKm = haversineDistanceKm(
    userLoc.latitude,
    userLoc.longitude,
    threat.lat,
    threat.lon
  );

  const bearing = calculateBearingDegrees(
    userLoc.latitude,
    userLoc.longitude,
    threat.lat,
    threat.lon
  );
  const directionCompass = degreesToCompassUk(bearing);

  let relevance: 'NONE' | 'OBSERVATION' | 'TACTICAL' | 'CRITICAL' = 'NONE';
  let severity: ThreatSeverity = 'INFO';
  let alertRequired = false;
  let alertTitle = '⚠️ СПОСТЕРЕЖЕННЯ';
  let alertBody = `${threat.title} · ~${distanceKm.toFixed(1)} км (${directionCompass})`;

  if (distanceKm <= 5.0) {
    relevance = 'CRITICAL';
    severity = 'DANGER';
    alertRequired = true;
    alertTitle = '🚨 НЕБЕЗПЕКА ПОРУЧ';
    alertBody = `БпЛА / Ціль · ~${distanceKm.toFixed(1)} км · напрямок ${directionCompass}. Терміново в укриття!`;
  } else if (distanceKm <= 15.0) {
    relevance = 'TACTICAL';
    severity = 'WARNING';
    alertRequired = true;
    alertTitle = '⚠️ ПОПЕРЕДЖЕННЯ ПРО ЦІЛЬ';
    alertBody = `Зафіксовано загрозу за ~${distanceKm.toFixed(1)} км (${directionCompass}) від вашої локації.`;
  } else if (distanceKm <= 35.0) {
    relevance = 'OBSERVATION';
    severity = 'INFO';
    alertRequired = false;
    alertTitle = '👁️ СПОСТЕРЕЖЕННЯ В РЕГІОНІ';
    alertBody = `Ціль на дистанції ~${distanceKm.toFixed(1)} км (${directionCompass}). Прямої загрози наразі немає.`;
  }

  return {
    threatId: threat.id,
    category: threat.category,
    distanceKm,
    directionCompass,
    relevance,
    severity,
    alertRequired,
    alertTitle,
    alertBody,
    timestamp: Date.now()
  };
}

export function shouldReAlertMovingUser(
  previousDistanceKm: number | undefined,
  currentDistanceKm: number
): boolean {
  if (previousDistanceKm === undefined) return true;
  // Re-alert if user has closed the distance by at least 2 km
  if (previousDistanceKm - currentDistanceKm >= 2.0) return true;
  // Re-alert if crossed into critical inner zone (< 5 km from > 5 km)
  if (previousDistanceKm > 5.0 && currentDistanceKm <= 5.0) return true;
  return false;
}
