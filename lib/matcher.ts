import { calculateDistanceKm, calculateBearingDegrees, getBearingSectorUk, extractLocationsFromText, findNearestLocation, GeoLocation } from './gazetteer';
import { classifyThreat, ThreatCategory, ThreatClassification } from './threatClassifier';
import { RawAlert } from './sources/alertsInUa';
import { TelegramMessage, clusterTelegramMessages, MessageCluster } from './sources/telegramScraper';

export type SecurityState = 'GREEN' | 'ORANGE' | 'RED' | 'DEGRADED';
export type SpatialPrecision = 'EXACT_MICRODISTRICT' | 'CITY_AREA' | 'RAION_SECTOR' | 'REGIONAL_CORRIDOR';

export interface ThreatEvent {
  id: string;
  source: 'alerts.in.ua' | 'telegram';
  sourceTitle: string;
  category: ThreatCategory;
  categoryNameUk: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  detectedLocation: string;
  detectedOblast: string;
  spatialPrecision: SpatialPrecision;
  threatCoordinates?: { lat: number; lng: number };
  distanceKm: number | null;
  honestDistanceText: string;
  isWithinRadius: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReason: string;
  repostCount: number;
  confirmedByMultipleSources: boolean;
  requiresImmediateShelter: boolean;
  rawText: string;
  timestamp: string;
  voiceAlertText: string;
  flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT';
  bearingDegrees?: number;
  bearingSectorUk?: string;
}

export interface SecurityEvaluationResult {
  overallState: SecurityState;
  stateBadgeUk: string;
  stateDescriptionUk: string;
  hasLocalThreat: boolean; // true ONLY if overallState === 'RED'
  hasAttentionWarning: boolean; // true if overallState === 'ORANGE'
  primaryThreat: ThreatEvent | null;
  threatEvents: ThreatEvent[];
  allClearDetected: boolean;
  userNearestKnownLocation: string;
  userOblast: string;
  totalSourcesEvaluated: number;
  totalClustersAnalyzed: number;
  evaluationTimestamp: string;
  isDataStale: boolean;
}

export function evaluateLocalSecurity(
  userLat: number,
  userLng: number,
  userRadiusKm: number = 15.0,
  userName: string = "Кирил",
  alerts: RawAlert[] = [],
  telegramMessages: TelegramMessage[] = [],
  lastIngestTimeMs?: number
): SecurityEvaluationResult {
  const threatEvents: ThreatEvent[] = [];
  const nearestUserLoc = findNearestLocation(userLat, userLng);
  const now = Date.now();
  const maxMessageAgeMs = 45 * 60 * 1000; // 45 minutes

  const isDataStale = lastIngestTimeMs ? (now - lastIngestTimeMs > 90 * 1000) : false;

  // Filter fresh messages
  const freshMessages = telegramMessages.filter(m => (now - m.unixTimestamp) <= maxMessageAgeMs);

  // Cluster Telegram messages to eliminate duplicate repost noise
  const clusters = clusterTelegramMessages(freshMessages);

  // 1. Process Message Clusters
  for (const cluster of clusters) {
    const repMsg = cluster.representativeMessage;
    const classification = classifyThreat(repMsg.text);
    const locations = extractLocationsFromText(repMsg.text);

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
            id: cluster.id,
            source: 'telegram',
            sourceTitle: cluster.primaryChannelTitle,
            category: 'ALL_CLEAR',
            categoryNameUk: 'Відбій / Чисто',
            severity: 'INFO',
            detectedLocation: loc.name,
            detectedOblast: loc.oblast,
            spatialPrecision: loc.type === 'microdistrict' ? 'EXACT_MICRODISTRICT' : loc.type === 'city' ? 'CITY_AREA' : 'RAION_SECTOR',
            threatCoordinates: { lat: loc.lat, lng: loc.lng },
            distanceKm: dist,
            honestDistanceText: `~${dist.toFixed(1)} км (${loc.name})`,
            isWithinRadius: dist <= userRadiusKm,
            confidence: 'HIGH',
            confidenceReason: `Підтверджено відбій / чисто у секторі ${loc.name}`,
            repostCount: cluster.sourceCount,
            confirmedByMultipleSources: cluster.sourceCount > 1,
            requiresImmediateShelter: false,
            rawText: repMsg.text,
            timestamp: repMsg.timeIso,
            voiceAlertText: `${userName}, увага. Повідомлено про відбій загрози поблизу ${loc.name}.`,
            flugerZone,
            bearingDegrees: bearing,
            bearingSectorUk: sector
          });
        }
      }
      continue;
    }

    if (!classification.isTacticalThreat) {
      // Ignore generic siren noise
      continue;
    }

    // Match locations mentioned in cluster
    for (const loc of locations) {
      const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
      const isDirect = dist <= userRadiusKm;
      const isFlugerCoverage = dist <= 60.0;

      if (isDirect || isFlugerCoverage) {
        const bearing = calculateBearingDegrees(userLat, userLng, loc.lat, loc.lng);
        const sector = getBearingSectorUk(bearing);

        let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
        if (dist <= 15) flugerZone = 'ZONE_15KM';
        else if (dist <= 30) flugerZone = 'ZONE_30KM';
        else if (dist <= 45) flugerZone = 'ZONE_45KM';

        let spatialPrecision: SpatialPrecision = 'RAION_SECTOR';
        let honestDistanceText = `~${dist.toFixed(1)} км (${loc.name}, ${sector})`;

        if (loc.type === 'microdistrict') {
          spatialPrecision = 'EXACT_MICRODISTRICT';
          honestDistanceText = `~${dist.toFixed(1)} км (${loc.name})`;
        } else if (loc.type === 'city') {
          spatialPrecision = 'CITY_AREA';
          honestDistanceText = dist <= 8.0 ? `У межах міста ${loc.name} (~${dist.toFixed(1)} км)` : `Напрямок міста ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
        } else {
          spatialPrecision = 'RAION_SECTOR';
          honestDistanceText = `Сектор району ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
        }

        // Confidence calculation based on source authority + multi-source confirmation
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        let confidenceReason = `Зафіксовано загрозу в радіусі ${dist.toFixed(1)} км (${loc.name}, ${sector})`;

        if (cluster.effectiveAuthority >= 0.94 && (dist <= 15 || loc.type === 'microdistrict')) {
          confidence = 'HIGH';
          confidenceReason = `Підтверджено провідним радаром (@${cluster.primaryChannel}) у вашому секторі (${loc.name})`;
        } else if (cluster.sourceCount >= 2 && dist <= 20) {
          confidence = 'HIGH';
          confidenceReason = `Підтверджено кількома незалежними джерелами у районі ${loc.name}`;
        } else if (dist <= 30) {
          confidence = 'MEDIUM';
          confidenceReason = `Ціль рухається у секторі ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
        } else {
          confidence = 'LOW';
          confidenceReason = `Раннє радарне спостереження (~${dist.toFixed(1)} км, ${sector})`;
        }

        const voiceAlertText = `${userName}, увага. Є підтверджена загроза (${classification.categoryNameUk}) поблизу ${loc.name}, дистанція ${Math.round(dist)} кілометрів, напрямок ${sector}. Негайно пройдіть в укриття!`;

        threatEvents.push({
          id: cluster.id + '_' + loc.name,
          source: 'telegram',
          sourceTitle: cluster.primaryChannelTitle + (cluster.sourceCount > 1 ? ` (+ ${cluster.sourceCount - 1} джерел)` : ''),
          category: classification.category,
          categoryNameUk: classification.categoryNameUk,
          severity: classification.severity,
          detectedLocation: loc.name,
          detectedOblast: loc.oblast,
          spatialPrecision,
          threatCoordinates: { lat: loc.lat, lng: loc.lng },
          distanceKm: dist,
          honestDistanceText,
          isWithinRadius: isDirect,
          confidence,
          confidenceReason,
          repostCount: cluster.sourceCount,
          confirmedByMultipleSources: cluster.sourceCount > 1,
          requiresImmediateShelter: classification.requiresImmediateShelter && (isDirect || dist <= 15),
          rawText: repMsg.text,
          timestamp: repMsg.timeIso,
          voiceAlertText,
          flugerZone,
          bearingDegrees: bearing,
          bearingSectorUk: sector
        });
      }
    }
  }

  // 2. Process Official Tactical Alerts (alerts.in.ua Artillery / Fights)
  for (const alert of alerts) {
    if (alert.finished_at) continue;
    const isTacticalAlert = alert.alert_type === 'artillery_shelling' || alert.alert_type === 'urban_fights';
    if (!isTacticalAlert) continue; // Skip general sirens

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
      const isFlugerCoverage = dist <= 60.0;

      if (isDirect || isFlugerCoverage) {
        const bearing = calculateBearingDegrees(userLat, userLng, matchedLocation.lat, matchedLocation.lng);
        const sector = getBearingSectorUk(bearing);

        let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
        if (dist <= 15) flugerZone = 'ZONE_15KM';
        else if (dist <= 30) flugerZone = 'ZONE_30KM';
        else if (dist <= 45) flugerZone = 'ZONE_45KM';

        threatEvents.push({
          id: `alert_in_ua_${alert.id}`,
          source: 'alerts.in.ua',
          sourceTitle: `Офіційне сповіщення: ${alert.location_title}`,
          category: 'ARTILLERY',
          categoryNameUk: 'Артилерійський обстріл / РСЗВ',
          severity: 'CRITICAL',
          detectedLocation: alert.location_title,
          detectedOblast: alert.location_oblast,
          spatialPrecision: alert.location_type === 'city' ? 'CITY_AREA' : 'RAION_SECTOR',
          threatCoordinates: { lat: matchedLocation.lat, lng: matchedLocation.lng },
          distanceKm: dist,
          honestDistanceText: `~${dist.toFixed(1)} км (${alert.location_title}, ${sector})`,
          isWithinRadius: isDirect,
          confidence: 'HIGH',
          confidenceReason: `Офіційно підтверджено загрозу артобстрілу для ${alert.location_title}`,
          repostCount: 1,
          confirmedByMultipleSources: true,
          requiresImmediateShelter: isDirect || dist <= 15,
          rawText: `Офіційне сповіщення (${alert.alert_type}) для ${alert.location_title}.`,
          timestamp: alert.started_at,
          voiceAlertText: `${userName}, увага. Офіційно підтверджено загрозу артобстрілу поблизу ${alert.location_title}. Терміново в укриття!`,
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

  // Determine Three-Tier State: GREEN vs ORANGE vs RED vs DEGRADED
  const redThreats = threatEvents.filter(
    t => t.category !== 'ALL_CLEAR' &&
         t.category !== 'GENERAL_AIR_RAID' &&
         t.isWithinRadius &&
         (t.confidence === 'HIGH' || t.confidence === 'MEDIUM') &&
         (t.severity === 'CRITICAL' || t.severity === 'HIGH')
  );

  const orangeThreats = threatEvents.filter(
    t => t.category !== 'ALL_CLEAR' &&
         t.category !== 'GENERAL_AIR_RAID' &&
         !t.isWithinRadius &&
         (t.distanceKm !== null && t.distanceKm <= 60.0)
  );

  let overallState: SecurityState = 'GREEN';
  let stateBadgeUk = 'СЕКТОР ЧИСТИЙ';
  let stateDescriptionUk = 'Локальних загроз поблизу не виявлено. Радіус під спостереженням.';

  if (isDataStale) {
    overallState = 'DEGRADED';
    stateBadgeUk = 'МОНІТОРИНГ НЕПОВНИЙ';
    stateDescriptionUk = 'Дані застаріли (>90 сек) або відсутній зв’язок із джерелами. Перевірте мережу.';
  } else if (redThreats.length > 0) {
    overallState = 'RED';
    stateBadgeUk = 'НЕБЕЗПЕКА ПОРУЧ';
    stateDescriptionUk = redThreats[0].confidenceReason || 'Підтверджено пряму загрозу у вашому секторі! Негайно в укриття!';
  } else if (orangeThreats.length > 0) {
    overallState = 'ORANGE';
    stateBadgeUk = 'УВАГА: ЗАГРОЗА В ОБЛАСТІ';
    stateDescriptionUk = `Ціль у секторі ${orangeThreats[0].detectedLocation} (${orangeThreats[0].honestDistanceText}). Прямого заходу у ваш район наразі немає.`;
  }

  const primaryThreat = redThreats.length > 0 ? redThreats[0] : (orangeThreats.length > 0 ? orangeThreats[0] : null);
  const allClear = threatEvents.some(t => t.category === 'ALL_CLEAR');

  return {
    overallState,
    stateBadgeUk,
    stateDescriptionUk,
    hasLocalThreat: overallState === 'RED',
    hasAttentionWarning: overallState === 'ORANGE',
    primaryThreat,
    threatEvents,
    allClearDetected: allClear,
    userNearestKnownLocation: nearestUserLoc.location.name,
    userOblast: nearestUserLoc.location.oblast,
    totalSourcesEvaluated: telegramMessages.length + alerts.length,
    totalClustersAnalyzed: clusters.length,
    evaluationTimestamp: new Date().toISOString(),
    isDataStale
  };
}
