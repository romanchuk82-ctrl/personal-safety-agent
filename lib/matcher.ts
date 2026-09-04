import { calculateDistanceKm, calculateBearingDegrees, getBearingSectorUk, extractGeoFromText, findNearestLocation, GeoLocation, RegionalZone } from './gazetteer';
import { classifyThreat, ThreatCategory, ThreatClassification } from './threatClassifier';
import { RawAlert } from './sources/alertsInUa';
import { TelegramMessage, clusterTelegramMessages, MessageCluster, ClusterSourceEntry } from './sources/telegramScraper';

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
  spatialPrecisionUk: string; // "Точна (мікрорайон)" | "Міська зона" | "Районний сектор" | "Регіональний коридор"
  threatCoordinates?: { lat: number; lng: number };
  distanceKm: number | null;
  honestDistanceText: string;
  isWithinRadius: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceUk: string; // "Висока" | "Середня" | "Низька"
  confidenceReason: string;
  sourceCount: number;
  repostCount: number;
  sourceSummaryText: string; // "2 повідомлення / 1 першоджерело + 1 репост"
  sourcesList: ClusterSourceEntry[];
  whyTriggeredReasons: string[]; // List of transparent checklist items
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

  // Cluster Telegram messages to eliminate duplicate repost noise and extract true provenance
  const clusters = clusterTelegramMessages(freshMessages);

  // 1. Process Message Clusters
  for (const cluster of clusters) {
    const repMsg = cluster.representativeMessage;
    const classification = classifyThreat(repMsg.text);
    const geoResult = extractGeoFromText(repMsg.text);

    const timeAgoMinutes = Math.max(1, Math.round((now - cluster.earliestTimestamp) / 60000));
    const timeFreshnessText = timeAgoMinutes <= 1 ? 'щойно' : `${timeAgoMinutes} хв тому`;

    // A. Handle ALL CLEAR
    if (classification.isAllClear) {
      for (const loc of geoResult.locations) {
        const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
        const bearing = calculateBearingDegrees(userLat, userLng, loc.lat, loc.lng);
        const sector = getBearingSectorUk(bearing);

        if (dist <= Math.max(userRadiusKm, 45.0)) {
          let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
          if (dist <= 15) flugerZone = 'ZONE_15KM';
          else if (dist <= 30) flugerZone = 'ZONE_30KM';
          else if (dist <= 45) flugerZone = 'ZONE_45KM';

          threatEvents.push({
            id: cluster.id + '_clear_' + loc.name,
            source: 'telegram',
            sourceTitle: cluster.primaryChannelTitle,
            category: 'ALL_CLEAR',
            categoryNameUk: 'Відбій / Чисто',
            severity: 'INFO',
            detectedLocation: loc.name,
            detectedOblast: loc.oblast,
            spatialPrecision: loc.type === 'microdistrict' ? 'EXACT_MICRODISTRICT' : loc.type === 'city' ? 'CITY_AREA' : 'RAION_SECTOR',
            spatialPrecisionUk: loc.type === 'microdistrict' ? 'Точна (мікрорайон)' : loc.type === 'city' ? 'Міська зона' : 'Районний сектор',
            threatCoordinates: { lat: loc.lat, lng: loc.lng },
            distanceKm: dist,
            honestDistanceText: `~${dist.toFixed(1)} км (${loc.name})`,
            isWithinRadius: dist <= userRadiusKm,
            confidence: 'HIGH',
            confidenceUk: 'Висока надійність',
            confidenceReason: `Підтверджено відбій / чисто у секторі ${loc.name}`,
            sourceCount: cluster.sourceCount,
            repostCount: cluster.repostCount,
            sourceSummaryText: cluster.sourceSummaryText,
            sourcesList: cluster.sources,
            whyTriggeredReasons: [
              `✓ Ваша локація: ${nearestUserLoc.location.name}`,
              `✓ Знайдено у тексті: «${geoResult.matchedKeywords.join(', ') || loc.name}»`,
              `✓ Першоджерело: @${cluster.primaryChannel} (${cluster.primaryChannelTitle})`,
              `✓ Час надходження: ${timeFreshnessText}`
            ],
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
      // Ignore generic noise
      continue;
    }

    // B. Match Specific Known Locations (Towns, Microdistricts, Cities)
    if (geoResult.isSpecificLocationFound) {
      for (const loc of geoResult.locations) {
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
          let spatialPrecisionUk = 'Районний сектор';
          let honestDistanceText = `~${dist.toFixed(1)} км (${loc.name}, ${sector})`;

          if (loc.type === 'microdistrict') {
            spatialPrecision = 'EXACT_MICRODISTRICT';
            spatialPrecisionUk = 'Точна (мікрорайон)';
            honestDistanceText = `~${dist.toFixed(1)} км (${loc.name})`;
          } else if (loc.type === 'city') {
            spatialPrecision = 'CITY_AREA';
            spatialPrecisionUk = 'Міська зона';
            honestDistanceText = dist <= 8.0 ? `У межах міста ${loc.name} (~${dist.toFixed(1)} км)` : `Напрямок міста ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
          } else {
            spatialPrecision = 'RAION_SECTOR';
            spatialPrecisionUk = 'Район / Населений пункт';
            honestDistanceText = `Сектор району ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
          }

          // Strict distinction between Confidence and Geo Precision
          let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
          let confidenceUk = 'Середня надійність';
          let confidenceReason = `Зафіксовано загрозу в радіусі ${dist.toFixed(1)} км (${loc.name}, ${sector})`;

          if (cluster.effectiveAuthority >= 0.94 && (dist <= 15 || loc.type === 'microdistrict')) {
            confidence = 'HIGH';
            confidenceUk = 'Висока надійність (Офіційний радар)';
            confidenceReason = `Підтверджено провідним радаром (@${cluster.primaryChannel}) у вашому секторі (${loc.name})`;
          } else if (cluster.sourceCount >= 2 && dist <= 20) {
            confidence = 'HIGH';
            confidenceUk = 'Висока надійність (Кілька джерел)';
            confidenceReason = `Підтверджено кількома джерелами у районі ${loc.name}`;
          } else if (dist <= 30) {
            confidence = 'MEDIUM';
            confidenceUk = 'Середня надійність';
            confidenceReason = `Ціль спостерігається у секторі ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
          } else {
            confidence = 'LOW';
            confidenceUk = 'Раннє спостереження';
            confidenceReason = `Раннє радарне спостереження (~${dist.toFixed(1)} км, ${sector})`;
          }

          const voiceAlertText = `${userName}, увага. Є підтверджена загроза (${classification.categoryNameUk}) поблизу ${loc.name}, дистанція ${Math.round(dist)} кілометрів, напрямок ${sector}. Негайно пройдіть в укриття!`;

          threatEvents.push({
            id: cluster.id + '_' + loc.name,
            source: 'telegram',
            sourceTitle: cluster.primaryChannelTitle,
            category: classification.category,
            categoryNameUk: classification.categoryNameUk,
            severity: isDirect ? classification.severity : 'MEDIUM',
            detectedLocation: loc.name,
            detectedOblast: loc.oblast,
            spatialPrecision,
            spatialPrecisionUk,
            threatCoordinates: { lat: loc.lat, lng: loc.lng },
            distanceKm: dist,
            honestDistanceText,
            isWithinRadius: isDirect,
            confidence,
            confidenceUk,
            confidenceReason,
            sourceCount: cluster.sourceCount,
            repostCount: cluster.repostCount,
            sourceSummaryText: cluster.sourceSummaryText,
            sourcesList: cluster.sources,
            whyTriggeredReasons: [
              `✓ Ваша локація: ${nearestUserLoc.location.name}`,
              `✓ Знайдено у тексті: «${geoResult.matchedKeywords.join(', ') || loc.name}»`,
              `✓ Джерело: @${cluster.primaryChannel} (${cluster.primaryChannelTitle}, вага ${cluster.effectiveAuthority.toFixed(2)})`,
              `✓ Підтвердження: ${cluster.sourceSummaryText}`,
              `✓ Час: ${timeFreshnessText}`
            ],
            requiresImmediateShelter: isDirect && classification.requiresImmediateShelter,
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
    // C. Handle Purely Regional Mentions (e.g. "Київщина", "Чернігівщина") without a specific town pin
    else if (geoResult.regionalZones.length > 0) {
      for (const zone of geoResult.regionalZones) {
        // Check if user is in this oblast
        if (nearestUserLoc.location.oblast === zone.oblast) {
          const bearing = calculateBearingDegrees(userLat, userLng, zone.centerLat, zone.centerLng);
          const sector = getBearingSectorUk(bearing);

          threatEvents.push({
            id: cluster.id + '_region_' + zone.name,
            source: 'telegram',
            sourceTitle: cluster.primaryChannelTitle,
            category: classification.category,
            categoryNameUk: classification.categoryNameUk,
            severity: 'MEDIUM', // Regional notice is ALWAYS Attention (ORANGE), never Direct Red
            detectedLocation: zone.name,
            detectedOblast: zone.oblast,
            spatialPrecision: 'REGIONAL_CORRIDOR',
            spatialPrecisionUk: 'Регіональний простір (область)',
            threatCoordinates: undefined, // NO FAKE PIN!
            distanceKm: null,
            honestDistanceText: 'В межах області (місце невизначене, ~30-60 км)',
            isWithinRadius: false,
            confidence: cluster.effectiveAuthority >= 0.94 ? 'HIGH' : 'MEDIUM',
            confidenceUk: 'Підтверджено в області (точне місце невизначене)',
            confidenceReason: `Повідомлення стосується загального простору (${zone.name})`,
            sourceCount: cluster.sourceCount,
            repostCount: cluster.repostCount,
            sourceSummaryText: cluster.sourceSummaryText,
            sourcesList: cluster.sources,
            whyTriggeredReasons: [
              '⚠️ Точне місцезнаходження цілі не вказано у повідомленні',
              `✓ Загроза стосується вашої області: ${zone.name}`,
              `✓ Джерело: @${cluster.primaryChannel} (${cluster.primaryChannelTitle})`,
              `✓ Час: ${timeFreshnessText}`
            ],
            requiresImmediateShelter: false,
            rawText: repMsg.text,
            timestamp: repMsg.timeIso,
            voiceAlertText: `${userName}, увага. Зафіксовано загрозу (${classification.categoryNameUk}) у повітряному просторі ${zone.name}.`,
            flugerZone: 'ZONE_DISTANT',
            bearingDegrees: bearing,
            bearingSectorUk: sector
          });
        }
      }
    }
  }

  // 2. Determine Overall Security State (3-Tier Model + honest degraded)
  let overallState: SecurityState = 'GREEN';
  let stateBadgeUk = 'СЕКТОР ЧИСТИЙ';
  let stateDescriptionUk = 'Локальних загроз поблизу не виявлено. Джерела сканують ваш сектор.';
  let primaryThreat: ThreatEvent | null = null;

  if (isDataStale) {
    overallState = 'DEGRADED';
    stateBadgeUk = 'МОНІТОРИНГ НЕПОВНИЙ';
    stateDescriptionUk = 'Дані застаріли (>90с) або відсутній зв’язок із радарними джерелами.';
  } else {
    // Sort threats: Direct Critical first, then closest distance
    const criticalDirectThreats = threatEvents.filter(t => t.requiresImmediateShelter && t.isWithinRadius && t.category !== 'ALL_CLEAR');
    const warningThreats = threatEvents.filter(t => t.category !== 'ALL_CLEAR');

    if (criticalDirectThreats.length > 0) {
      overallState = 'RED';
      primaryThreat = criticalDirectThreats[0];
      stateBadgeUk = 'НЕБЕЗПЕКА ПОРУЧ';
      stateDescriptionUk = primaryThreat.confidenceReason;
    } else if (warningThreats.length > 0) {
      overallState = 'ORANGE';
      primaryThreat = warningThreats[0];
      stateBadgeUk = 'УВАГА В ОБЛАСТІ';
      stateDescriptionUk = primaryThreat.confidenceReason;
    }
  }

  return {
    overallState,
    stateBadgeUk,
    stateDescriptionUk,
    hasLocalThreat: overallState === 'RED',
    hasAttentionWarning: overallState === 'ORANGE',
    primaryThreat,
    threatEvents,
    allClearDetected: threatEvents.some(t => t.category === 'ALL_CLEAR'),
    userNearestKnownLocation: nearestUserLoc.location.name,
    userOblast: nearestUserLoc.location.oblast,
    totalSourcesEvaluated: telegramMessages.length,
    totalClustersAnalyzed: clusters.length,
    evaluationTimestamp: new Date().toISOString(),
    isDataStale
  };
}
