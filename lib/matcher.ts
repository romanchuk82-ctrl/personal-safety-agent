import { calculateDistanceKm, calculateBearingDegrees, getBearingSectorUk, extractLocationsFromText, findNearestLocation, GeoLocation } from './gazetteer';
import { classifyThreat, ThreatCategory, ThreatClassification } from './threatClassifier';
import { RawAlert } from './sources/alertsInUa';
import { TelegramMessage } from './sources/telegramScraper';

export interface ThreatEvent {
  id: string;
  source: 'alerts.in.ua' | 'telegram';
  sourceTitle: string;
  category: ThreatCategory;
  categoryNameUk: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  detectedLocation: string;
  detectedOblast: string;
  threatCoordinates?: { lat: number; lng: number };
  distanceKm: number | null;
  isWithinRadius: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReason: string;
  requiresImmediateShelter: boolean;
  rawText: string;
  timestamp: string;
  voiceAlertText: string;
  flugerZone?: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT';
  bearingDegrees?: number;
  bearingSectorUk?: string;
}

export interface SecurityEvaluationResult {
  hasLocalThreat: boolean;
  primaryThreat: ThreatEvent | null;
  threatEvents: ThreatEvent[];
  allClearDetected: boolean;
  userNearestKnownLocation: string;
  userOblast: string;
  totalSourcesEvaluated: number;
  evaluationTimestamp: string;
}

export function evaluateLocalSecurity(
  userLat: number,
  userLng: number,
  userRadiusKm: number = 5.0,
  userName: string = "Кирил",
  alerts: RawAlert[] = [],
  telegramMessages: TelegramMessage[] = []
): SecurityEvaluationResult {
  const threatEvents: ThreatEvent[] = [];
  const nearestUserLoc = findNearestLocation(userLat, userLng);
  const now = Date.now();
  const maxMessageAgeMs = 45 * 60 * 1000; // 45 minutes max age for active tactical alerts

  // 1. Evaluate Telegram OSINT messages
  for (const msg of telegramMessages) {
    if (now - msg.unixTimestamp > maxMessageAgeMs) {
      continue;
    }

    const classification = classifyThreat(msg.text);
    const locations = extractLocationsFromText(msg.text);

    if (classification.isAllClear) {
      for (const loc of locations) {
        const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
        const bearing = calculateBearingDegrees(userLat, userLng, loc.lat, loc.lng);
        const sector = getBearingSectorUk(bearing);

        if (dist <= Math.max(userRadiusKm, 45.0)) {
          let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
          if (dist <= 15) flugerZone = 'ZONE_15KM';
          else if (dist <= 30) flugerZone = 'ZONE_30KM';
          else if (dist <= 45) flugerZone = 'ZONE_45KM';

          threatEvents.push({
            id: msg.id,
            source: 'telegram',
            sourceTitle: msg.channelTitle,
            category: 'ALL_CLEAR',
            categoryNameUk: 'Відбій / Чисто',
            severity: 'INFO',
            detectedLocation: loc.name,
            detectedOblast: loc.oblast,
            threatCoordinates: { lat: loc.lat, lng: loc.lng },
            distanceKm: dist,
            isWithinRadius: dist <= userRadiusKm,
            confidence: 'HIGH',
            confidenceReason: `Офіційне повідомлення про відбій / чисто у секторі ${loc.name}`,
            requiresImmediateShelter: false,
            rawText: msg.text,
            timestamp: msg.timeIso,
            voiceAlertText: `${userName}, увага. Повідомлено про відбій загрози поблизу ${loc.name}.`,
            flugerZone,
            bearingDegrees: bearing,
            bearingSectorUk: sector
          });
        }
      }
      continue;
    }

    // Match locations mentioned in message
    for (const loc of locations) {
      const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
      const isDirect = dist <= userRadiusKm;
      const isFlugerCoverage = dist <= 45.0;

      if (isDirect || isFlugerCoverage) {
        const bearing = calculateBearingDegrees(userLat, userLng, loc.lat, loc.lng);
        const sector = getBearingSectorUk(bearing);

        let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
        if (dist <= 15) flugerZone = 'ZONE_15KM';
        else if (dist <= 30) flugerZone = 'ZONE_30KM';
        else if (dist <= 45) flugerZone = 'ZONE_45KM';

        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        let confidenceReason = `Зафіксовано загрозу в радіусі ${dist} км (${loc.name}, сектор: ${sector})`;

        if (dist <= 5.0 || loc.type === 'microdistrict') {
          confidence = 'HIGH';
          confidenceReason = `Точна фіксація мікрорайону в радіусі ${dist} км (${sector})`;
        } else if (msg.authorityWeight >= 0.95 && dist <= 15) {
          confidence = 'HIGH';
          confidenceReason = `Підтверджено радаром (@${msg.channel}) у зоні прямого ураження (${dist} км)`;
        } else if (dist <= 30) {
          confidence = 'MEDIUM';
          confidenceReason = `Загроза у зоні підльоту (${loc.name}, ~${dist} км, ${sector})`;
        } else {
          confidence = 'LOW';
          confidenceReason = `Раннє радарне спостереження (${loc.name}, ~${dist} км, ${sector})`;
        }

        const voiceAlertText = `${userName}, увага. Є підтверджена інформація про загрозу (${classification.categoryNameUk}) поблизу ${loc.name}, приблизно ${dist} км у секторі ${sector}.`;

        threatEvents.push({
          id: msg.id,
          source: 'telegram',
          sourceTitle: msg.channelTitle,
          category: classification.category,
          categoryNameUk: classification.categoryNameUk,
          severity: classification.severity,
          detectedLocation: loc.name,
          detectedOblast: loc.oblast,
          threatCoordinates: { lat: loc.lat, lng: loc.lng },
          distanceKm: dist,
          isWithinRadius: isDirect,
          confidence,
          confidenceReason,
          requiresImmediateShelter: classification.requiresImmediateShelter && (isDirect || dist <= 15),
          rawText: msg.text,
          timestamp: msg.timeIso,
          voiceAlertText,
          flugerZone,
          bearingDegrees: bearing,
          bearingSectorUk: sector
        });
      }
    }
  }

  // 2. Evaluate alerts.in.ua (Active Raion & Hromada level alerts)
  for (const alert of alerts) {
    if (alert.finished_at) continue;

    const alertTitle = (alert.location_title || '').toLowerCase();
    let matchedLocation: GeoLocation | null = null;
    const extracted = extractLocationsFromText(alert.location_title);
    if (extracted.length > 0) {
      matchedLocation = extracted[0];
    } else if (nearestUserLoc.location.aliases.some(alias => alertTitle.includes(alias))) {
      matchedLocation = nearestUserLoc.location;
    }

    if (matchedLocation) {
      const dist = calculateDistanceKm(userLat, userLng, matchedLocation.lat, matchedLocation.lng);
      const isDirect = dist <= userRadiusKm;
      const isFlugerCoverage = dist <= 45.0;

      if (isDirect || isFlugerCoverage) {
        const isTacticalAlert = alert.alert_type === 'artillery_shelling' || alert.alert_type === 'urban_fights';
        const bearing = calculateBearingDegrees(userLat, userLng, matchedLocation.lat, matchedLocation.lng);
        const sector = getBearingSectorUk(bearing);

        let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
        if (dist <= 15) flugerZone = 'ZONE_15KM';
        else if (dist <= 30) flugerZone = 'ZONE_30KM';
        else if (dist <= 45) flugerZone = 'ZONE_45KM';

        threatEvents.push({
          id: `alert_in_ua_${alert.id}`,
          source: 'alerts.in.ua',
          sourceTitle: `Офіційне сповіщення (${alert.location_type}: ${alert.location_title})`,
          category: isTacticalAlert ? 'ARTILLERY' : 'GENERAL_AIR_RAID',
          categoryNameUk: isTacticalAlert ? 'Артилерійський обстріл / Загроза' : 'Загальна повітряна тривога',
          severity: isTacticalAlert ? 'CRITICAL' : 'INFO',
          detectedLocation: alert.location_title,
          detectedOblast: alert.location_oblast,
          threatCoordinates: { lat: matchedLocation.lat, lng: matchedLocation.lng },
          distanceKm: dist,
          isWithinRadius: isDirect,
          confidence: alert.location_type === 'hromada' || alert.location_type === 'city' ? 'HIGH' : 'MEDIUM',
          confidenceReason: isTacticalAlert 
            ? `Офіційно підтверджено загрозу артобстрілу для ${alert.location_title} (~${dist} км, ${sector})`
            : `Загальна сирена тривоги для ${alert.location_title} (~${dist} км, фоновий статус)`,
          requiresImmediateShelter: isTacticalAlert && (isDirect || dist <= 15),
          rawText: `Офіційне сповіщення (${alert.alert_type}) для ${alert.location_title}. Початок: ${alert.started_at}`,
          timestamp: alert.started_at,
          voiceAlertText: isTacticalAlert 
            ? `${userName}, увага. Офіційно підтверджено загрозу артобстрілу поблизу ${alert.location_title}. Терміново в укриття!`
            : `${userName}, увага. Оголошено загальну тривогу для сектору ${alert.location_title}.`,
          flugerZone,
          bearingDegrees: bearing,
          bearingSectorUk: sector
        });
      }
    }
  }

  // Deduplicate and prioritize threats
  threatEvents.sort((a, b) => {
    const sevScore: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, INFO: 0 };
    const scoreDiff = (sevScore[b.severity] || 0) - (sevScore[a.severity] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const distA = a.distanceKm ?? 999;
    const distB = b.distanceKm ?? 999;
    return distA - distB;
  });

  // Filter out non-tactical generic alerts and all-clear messages for active alarming
  const activeThreats = threatEvents.filter(
    t => t.category !== 'ALL_CLEAR' && 
         t.category !== 'GENERAL_AIR_RAID' && 
         t.isWithinRadius
  );
  
  const primaryThreat = activeThreats.length > 0 ? activeThreats[0] : null;
  const allClear = threatEvents.some(t => t.category === 'ALL_CLEAR');

  return {
    hasLocalThreat: primaryThreat !== null,
    primaryThreat,
    threatEvents,
    allClearDetected: allClear,
    userNearestKnownLocation: nearestUserLoc.location.name,
    userOblast: nearestUserLoc.location.oblast,
    totalSourcesEvaluated: telegramMessages.length + alerts.length,
    evaluationTimestamp: new Date().toISOString()
  };
}
