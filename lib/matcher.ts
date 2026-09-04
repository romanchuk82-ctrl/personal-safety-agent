import { calculateDistanceKm, calculateBearingDegrees, getBearingSectorUk, extractGeoFromText, findNearestLocation, GeoLocation, RegionalZone } from './gazetteer';
import { classifyThreat, getThreatTtlMinutes, ThreatCategory, ThreatClassification } from './threatClassifier';
import { RawAlert } from './sources/alertsInUa';
import { TelegramMessage, clusterTelegramMessages, MessageCluster, ClusterSourceEntry } from './sources/telegramScraper';

export type SecurityState = 'GREEN' | 'ORANGE' | 'RED' | 'DEGRADED';
export type SpatialPrecision = 'EXACT_MICRODISTRICT' | 'CITY_AREA' | 'RAION_SECTOR' | 'REGIONAL_CORRIDOR';
export type EventStatus = 'active' | 'stale' | 'cleared';
export type ThreatEventType = 'CONFIRMED_THREAT' | 'OBSERVATION';

export interface ThreatEvent {
  id: string;
  source: 'alerts.in.ua' | 'telegram';
  sourceTitle: string;
  category: ThreatCategory;
  categoryNameUk: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  eventType: ThreatEventType; // 'CONFIRMED_THREAT' (direct local threat) vs 'OBSERVATION' (early / surrounding report)

  // Strict Event Lifecycle
  createdAt: string;       // ISO timestamp of first message
  lastConfirmedAt: string; // ISO timestamp of latest confirming message
  lastSourceAt: string;    // ISO timestamp of latest raw message
  status: EventStatus;     // 'active' | 'stale' | 'cleared'
  statusBadgeUk: string;   // 'Активна ціль' | 'Застаріла ціль' | 'Відбій / Знищено'
  ttlMinutes: number;      // Category TTL in minutes without fresh update
  ageMinutes: number;      // Minutes since last confirmation

  detectedLocation: string;
  detectedOblast: string;
  spatialPrecision: SpatialPrecision;
  spatialPrecisionUk: string; // "Точна (мікрорайон)" | "Міська зона" | "Районний сектор" | "Регіональний коридор"
  isApproximateLocation: boolean;
  threatCoordinates?: { lat: number; lng: number };
  distanceKm: number | null;
  honestDistanceText: string;
  isWithinRadius: boolean;
  isSurroundingObservation: boolean; // true if outside monitoring radius but within surrounding range (30-75 km)
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

export type RejectedReason =
  | 'no_geo'             // Геолокація не розпізнана в тексті
  | 'outside_range'      // Поза зоною моніторингу та флюгера (> 75 км)
  | 'duplicate'          // Дублікат / репост у межах кластера
  | 'stale'              // Застаріле повідомлення (> 30 хв)
  | 'low_confidence'     // Низька достовірність
  | 'unsupported_type'   // Інформаційний шум / не є тактичною ціллю
  | 'all_clear';         // Сигнал відбою

export interface RejectedMessageItem {
  id: string;
  channel: string;
  channelTitle: string;
  text: string;
  timeIso: string;
  reason: RejectedReason;
  reasonUk: string;
  detailsUk: string;
}

export interface SecurityEvaluationResult {
  overallState: SecurityState;
  stateBadgeUk: string;
  stateDescriptionUk: string;
  hasLocalThreat: boolean; // true ONLY if overallState === 'RED'
  hasAttentionWarning: boolean; // true if overallState === 'ORANGE'
  primaryThreat: ThreatEvent | null;
  threatEvents: ThreatEvent[];
  observationsList: ThreatEvent[];
  confirmedThreatsList: ThreatEvent[];
  outsideZoneObservations: ThreatEvent[];
  allClearDetected: boolean;
  userNearestKnownLocation: string;
  userOblast: string;
  totalSourcesEvaluated: number;
  totalClustersAnalyzed: number;
  observationsCount: number;
  threatsCount: number;
  outsideZoneObservationsCount: number;
  rejectedCount: number;
  geoUnresolvedCount: number;
  lastTelegramMessageIso: string | null;
  rejectedMessagesLog: RejectedMessageItem[];
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
  const rejectedMessagesLog: RejectedMessageItem[] = [];
  const nearestUserLoc = findNearestLocation(userLat, userLng);
  const now = Date.now();
  
  // Maximum message retention window (30 minutes)
  const maxMessageAgeMs = 30 * 60 * 1000;
  const isDataStale = lastIngestTimeMs ? (now - lastIngestTimeMs > 90 * 1000) : false;

  let geoUnresolvedCount = 0;
  let lastTelegramMessageIso: string | null = null;

  if (telegramMessages.length > 0) {
    lastTelegramMessageIso = telegramMessages[0].timeIso;
  }

  // Filter fresh messages within max retention window, log stale ones
  const freshMessages: TelegramMessage[] = [];
  for (const m of telegramMessages) {
    const msgTs = m.unixTimestamp || (m.timeIso ? new Date(m.timeIso).getTime() : now);
    if ((now - msgTs) > maxMessageAgeMs) {
      if (rejectedMessagesLog.length < 20) {
        rejectedMessagesLog.push({
          id: m.id,
          channel: m.channel,
          channelTitle: m.channelTitle,
          text: m.text,
          timeIso: m.timeIso || new Date(msgTs).toISOString(),
          reason: 'stale',
          reasonUk: 'Застаріле повідомлення (>30 хв)',
          detailsUk: `Надійшло ${Math.round((now - msgTs) / 60000)} хв тому`
        });
      }
    } else {
      freshMessages.push({
        ...m,
        unixTimestamp: msgTs,
        timeIso: m.timeIso || new Date(msgTs).toISOString()
      });
    }
  }

  // Cluster Telegram messages to eliminate duplicate repost noise and extract true provenance
  const clusters = clusterTelegramMessages(freshMessages);

  // 1. First pass: Collect all clear signals to terminate corresponding threats
  const allClearLocations = new Set<string>();
  const allClearOblasts = new Set<string>();

  for (const cluster of clusters) {
    const classification = classifyThreat(cluster.representativeMessage.text);
    if (classification.isAllClear) {
      const geoResult = extractGeoFromText(cluster.representativeMessage.text);
      for (const loc of geoResult.locations) {
        allClearLocations.add(loc.name.toLowerCase());
      }
      for (const zone of geoResult.regionalZones) {
        allClearOblasts.add(zone.oblast.toLowerCase());
      }
    }
  }

  // 2. Process Message Clusters & Build Event Lifecycle
  for (const cluster of clusters) {
    const repMsg = cluster.representativeMessage;
    const classification = classifyThreat(repMsg.text);
    const geoResult = extractGeoFromText(repMsg.text);

    const earliestTs = !isNaN(cluster.earliestTimestamp) && cluster.earliestTimestamp > 0 ? cluster.earliestTimestamp : now;
    const latestTs = !isNaN(cluster.latestTimestamp) && cluster.latestTimestamp > 0 ? cluster.latestTimestamp : now;

    const createdAtIso = new Date(earliestTs).toISOString();
    const lastConfirmedAtIso = new Date(latestTs).toISOString();
    const lastSourceAtIso = repMsg.timeIso || new Date(latestTs).toISOString();

    const ageFromLastConfirmMs = Math.max(0, now - latestTs);
    const ageMinutes = Math.max(0, Math.floor(ageFromLastConfirmMs / 60000));
    const timeFreshnessText = ageMinutes <= 1 ? 'щойно' : `${ageMinutes} хв тому`;

    const ttlMinutes = classification.ttlMinutes || getThreatTtlMinutes(classification.category);
    const ttlMs = ttlMinutes * 60 * 1000;

    // A. Handle ALL CLEAR Events
    if (classification.isAllClear) {
      for (const loc of geoResult.locations) {
        const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
        const bearing = calculateBearingDegrees(userLat, userLng, loc.lat, loc.lng);
        const sector = getBearingSectorUk(bearing);

        if (dist <= Math.max(userRadiusKm, 60.0)) {
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
            eventType: 'OBSERVATION',
            createdAt: createdAtIso,
            lastConfirmedAt: lastConfirmedAtIso,
            lastSourceAt: lastSourceAtIso,
            status: 'cleared',
            statusBadgeUk: 'Відбій / Чисто',
            ttlMinutes,
            ageMinutes,
            detectedLocation: loc.name,
            detectedOblast: loc.oblast,
            spatialPrecision: loc.type === 'microdistrict' ? 'EXACT_MICRODISTRICT' : loc.type === 'city' ? 'CITY_AREA' : 'RAION_SECTOR',
            spatialPrecisionUk: loc.type === 'microdistrict' ? 'Точна (мікрорайон)' : loc.type === 'city' ? 'Міська зона' : 'Районний сектор',
            isApproximateLocation: loc.type !== 'microdistrict',
            threatCoordinates: { lat: loc.lat, lng: loc.lng },
            distanceKm: dist,
            honestDistanceText: `~${dist.toFixed(1)} км (${loc.name})`,
            isWithinRadius: dist <= userRadiusKm,
            isSurroundingObservation: dist > userRadiusKm,
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

    // Check if message is a non-tactical informational message
    if (!classification.isTacticalThreat) {
      if (rejectedMessagesLog.length < 20) {
        rejectedMessagesLog.push({
          id: repMsg.id,
          channel: repMsg.channel,
          channelTitle: repMsg.channelTitle,
          text: repMsg.text,
          timeIso: repMsg.timeIso,
          reason: 'unsupported_type',
          reasonUk: 'Не є повідомленням про загрозу',
          detailsUk: 'Загальна новина або сирена без тактичних цілей'
        });
      }
      continue;
    }

    // Check if geo is completely missing
    if (!geoResult.isSpecificLocationFound && geoResult.regionalZones.length === 0) {
      geoUnresolvedCount++;
      if (rejectedMessagesLog.length < 20) {
        rejectedMessagesLog.push({
          id: repMsg.id,
          channel: repMsg.channel,
          channelTitle: repMsg.channelTitle,
          text: repMsg.text,
          timeIso: repMsg.timeIso,
          reason: 'no_geo',
          reasonUk: 'Геолокація не розпізнана',
          detailsUk: 'Текст не містить назви міста, району чи області'
        });
      }
      continue;
    }

    // Determine lifecycle status based on category TTL and explicit clear signals
    let status: EventStatus = 'active';
    let statusBadgeUk = 'Активна ціль';

    if (ageFromLastConfirmMs > ttlMs) {
      if (ageFromLastConfirmMs > ttlMs + (5 * 60 * 1000)) {
        status = 'cleared';
        statusBadgeUk = 'Загроза минула (Вичерпано TTL)';
      } else {
        status = 'stale';
        statusBadgeUk = 'Застаріла ціль (Очікується оновлення)';
      }
    }

    // B. Match Specific Known Locations (Towns, Microdistricts, Cities)
    if (geoResult.isSpecificLocationFound) {
      for (const loc of geoResult.locations) {
        // If an explicit all-clear was received for this location, mark cleared immediately
        let locStatus = status;
        let locStatusBadgeUk = statusBadgeUk;
        if (allClearLocations.has(loc.name.toLowerCase())) {
          locStatus = 'cleared';
          locStatusBadgeUk = 'Відбій у секторі';
        }

        // If cleared and completely expired beyond grace period, skip adding to threat list
        if (locStatus === 'cleared' && ageFromLastConfirmMs > ttlMs) {
          continue;
        }

        const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
        const isDirect = dist <= userRadiusKm;
        const isSurroundingObservation = !isDirect && dist <= 75.0;

        // If distance is too far (> 75 km) and not in user's immediate surrounding, log rejected
        if (!isDirect && !isSurroundingObservation) {
          if (rejectedMessagesLog.length < 20) {
            rejectedMessagesLog.push({
              id: repMsg.id,
              channel: repMsg.channel,
              channelTitle: repMsg.channelTitle,
              text: repMsg.text,
              timeIso: repMsg.timeIso,
              reason: 'outside_range',
              reasonUk: `Поза зоною моніторингу (~${Math.round(dist)} км)`,
              detailsUk: `Локація ${loc.name} знаходиться далі ніж 75 км`
            });
          }
          continue;
        }

        const bearing = calculateBearingDegrees(userLat, userLng, loc.lat, loc.lng);
        const sector = getBearingSectorUk(bearing);

        let flugerZone: 'ZONE_15KM' | 'ZONE_30KM' | 'ZONE_45KM' | 'ZONE_DISTANT' = 'ZONE_DISTANT';
        if (dist <= 15) flugerZone = 'ZONE_15KM';
        else if (dist <= 30) flugerZone = 'ZONE_30KM';
        else if (dist <= 45) flugerZone = 'ZONE_45KM';

        let spatialPrecision: SpatialPrecision = 'RAION_SECTOR';
        let spatialPrecisionUk = 'Районний сектор';
        let honestDistanceText = isDirect
          ? `~${dist.toFixed(1)} км (${loc.name}, ${sector})`
          : `~${dist.toFixed(1)} км (${loc.name}, поза зоною ${userRadiusKm} км)`;

        if (loc.type === 'microdistrict') {
          spatialPrecision = 'EXACT_MICRODISTRICT';
          spatialPrecisionUk = 'Точна (мікрорайон)';
          honestDistanceText = isDirect
            ? `~${dist.toFixed(1)} км (${loc.name})`
            : `~${dist.toFixed(1)} км (${loc.name}, ${sector})`;
        } else if (loc.type === 'city') {
          spatialPrecision = 'CITY_AREA';
          spatialPrecisionUk = 'Міська зона';
          honestDistanceText = dist <= 8.0
            ? `У межах міста ${loc.name} (~${dist.toFixed(1)} км)`
            : isDirect
            ? `Напрямок міста ${loc.name} (~${dist.toFixed(1)} км, ${sector})`
            : `~${dist.toFixed(1)} км (${loc.name}, ${sector})`;
        } else {
          spatialPrecision = 'RAION_SECTOR';
          spatialPrecisionUk = 'Населений пункт / Сектор';
          honestDistanceText = isDirect
            ? `Сектор ${loc.name} (~${dist.toFixed(1)} км, ${sector})`
            : `~${dist.toFixed(1)} км (${loc.name}, ${sector})`;
        }

        // STRICT SEPARATION: OBSERVATION vs CONFIRMED THREAT
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        let confidenceUk = 'Середня надійність';
        let confidenceReason = `Зафіксовано спостереження у секторі ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;

        if (cluster.effectiveAuthority >= 0.94 && (isDirect || loc.type === 'microdistrict')) {
          confidence = 'HIGH';
          confidenceUk = 'Висока надійність (Офіційний радар)';
          confidenceReason = `Підтверджено провідним радаром (@${cluster.primaryChannel}) у вашому секторі (${loc.name})`;
        } else if (cluster.sourceCount >= 2 && dist <= Math.max(userRadiusKm, 25)) {
          confidence = 'HIGH';
          confidenceUk = 'Висока надійність (Кілька джерел)';
          confidenceReason = `Підтверджено кількома джерелами у районі ${loc.name}`;
        } else if (dist <= userRadiusKm) {
          confidence = 'MEDIUM';
          confidenceUk = 'Середня надійність';
          confidenceReason = `Ціль спостерігається у секторі ${loc.name} (~${dist.toFixed(1)} км, ${sector})`;
        } else {
          confidence = 'LOW';
          confidenceUk = 'Раннє спостереження';
          confidenceReason = `Раннє радарне спостереження (~${dist.toFixed(1)} км, ${sector})`;
        }

        // Event type differentiation
        const isConfirmedThreat = isDirect && (confidence === 'HIGH' || classification.severity === 'CRITICAL' || cluster.sourceCount >= 2);
        const eventType: ThreatEventType = isConfirmedThreat ? 'CONFIRMED_THREAT' : 'OBSERVATION';

        const voiceAlertText = `${userName}, увага. Є підтверджена загроза (${classification.categoryNameUk}) поблизу ${loc.name}, дистанція ${Math.round(dist)} кілометрів, напрямок ${sector}. Негайно пройдіть в укриття!`;

        threatEvents.push({
          id: cluster.id + '_' + loc.name,
          source: 'telegram',
          sourceTitle: cluster.primaryChannelTitle,
          category: classification.category,
          categoryNameUk: classification.categoryNameUk,
          severity: isDirect ? classification.severity : 'MEDIUM',
          eventType,
          createdAt: createdAtIso,
          lastConfirmedAt: lastConfirmedAtIso,
          lastSourceAt: lastSourceAtIso,
          status: locStatus,
          statusBadgeUk: locStatusBadgeUk,
          ttlMinutes,
          ageMinutes,
          detectedLocation: loc.name,
          detectedOblast: loc.oblast,
          spatialPrecision,
          spatialPrecisionUk,
          isApproximateLocation: loc.type !== 'microdistrict',
          threatCoordinates: { lat: loc.lat, lng: loc.lng },
          distanceKm: dist,
          honestDistanceText,
          isWithinRadius: isDirect,
          isSurroundingObservation,
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
            `✓ Час: ${timeFreshnessText} (TTL: ${ttlMinutes} хв)`
          ],
          requiresImmediateShelter: isDirect && isConfirmedThreat && classification.requiresImmediateShelter && locStatus === 'active',
          rawText: repMsg.text,
          timestamp: repMsg.timeIso,
          voiceAlertText,
          flugerZone,
          bearingDegrees: bearing,
          bearingSectorUk: sector
        });
      }
    }
    // C. Handle Purely Regional Mentions (e.g. "Київщина", "Чернігівщина") without a specific town pin
    else if (geoResult.regionalZones.length > 0) {
      for (const zone of geoResult.regionalZones) {
        if (nearestUserLoc.location.oblast === zone.oblast) {
          let regStatus = status;
          let regStatusBadgeUk = statusBadgeUk;
          if (allClearOblasts.has(zone.oblast.toLowerCase())) {
            regStatus = 'cleared';
            regStatusBadgeUk = 'Відбій по області';
          }

          if (regStatus === 'cleared' && ageFromLastConfirmMs > ttlMs) {
            continue;
          }

          const bearing = calculateBearingDegrees(userLat, userLng, zone.centerLat, zone.centerLng);
          const sector = getBearingSectorUk(bearing);

          threatEvents.push({
            id: cluster.id + '_region_' + zone.name,
            source: 'telegram',
            sourceTitle: cluster.primaryChannelTitle,
            category: classification.category,
            categoryNameUk: classification.categoryNameUk,
            severity: 'MEDIUM',
            eventType: 'OBSERVATION', // Regional corridor is ALWAYS an observation, never a direct red threat
            createdAt: createdAtIso,
            lastConfirmedAt: lastConfirmedAtIso,
            lastSourceAt: lastSourceAtIso,
            status: regStatus,
            statusBadgeUk: regStatusBadgeUk,
            ttlMinutes,
            ageMinutes,
            detectedLocation: zone.name,
            detectedOblast: zone.oblast,
            spatialPrecision: 'REGIONAL_CORRIDOR',
            spatialPrecisionUk: 'Регіональний простір (область)',
            isApproximateLocation: true,
            threatCoordinates: undefined, // NO FAKE PIN!
            distanceKm: null,
            honestDistanceText: 'В межах області (місце невизначене, ~30-60 км)',
            isWithinRadius: false,
            isSurroundingObservation: true,
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
              `✓ Час: ${timeFreshnessText} (TTL: ${ttlMinutes} хв)`
            ],
            requiresImmediateShelter: false,
            rawText: repMsg.text,
            timestamp: repMsg.timeIso,
            voiceAlertText: `${userName}, увага. Зафіксовано загрозу (${classification.categoryNameUk}) у повітряному просторі ${zone.name}.`,
            flugerZone: 'ZONE_DISTANT',
            bearingDegrees: bearing,
            bearingSectorUk: sector
          });
        } else {
          if (rejectedMessagesLog.length < 20) {
            rejectedMessagesLog.push({
              id: repMsg.id,
              channel: repMsg.channel,
              channelTitle: repMsg.channelTitle,
              text: repMsg.text,
              timeIso: repMsg.timeIso,
              reason: 'outside_range',
              reasonUk: `Інша область (${zone.name})`,
              detailsUk: `Користувач у ${nearestUserLoc.location.oblast}`
            });
          }
        }
      }
    }
  }

  // 3. Separate Confirmed Threats vs Observations
  const activeEvents = threatEvents.filter(t => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID');
  const confirmedThreatsList = activeEvents.filter(t => t.eventType === 'CONFIRMED_THREAT' && t.isWithinRadius);
  const observationsList = activeEvents.filter(t => t.eventType === 'OBSERVATION' || !t.isWithinRadius);
  const outsideZoneObservations = activeEvents.filter(t => t.isSurroundingObservation || (!t.isWithinRadius && t.distanceKm !== null && t.distanceKm <= 75));

  // 4. Determine Overall Security State (Strictly considering ONLY active threats in local radius)
  let overallState: SecurityState = 'GREEN';
  let stateBadgeUk = 'СЕКТОР ЧИСТИЙ';
  let stateDescriptionUk = 'Локальних загроз поблизу не виявлено. Джерела сканують ваш сектор.';
  let primaryThreat: ThreatEvent | null = null;

  if (isDataStale) {
    overallState = 'DEGRADED';
    stateBadgeUk = 'МОНІТОРИНГ НЕПОВНИЙ';
    stateDescriptionUk = 'Дані застаріли (>90с) або відсутній зв’язок із радарними джерелами.';
  } else {
    if (confirmedThreatsList.length > 0) {
      overallState = 'RED';
      primaryThreat = confirmedThreatsList[0];
      stateBadgeUk = 'НЕБЕЗПЕКА ПОРУЧ';
      stateDescriptionUk = primaryThreat.confidenceReason;
    } else if (activeEvents.some(t => t.isWithinRadius)) {
      overallState = 'ORANGE';
      primaryThreat = activeEvents.find(t => t.isWithinRadius) || null;
      stateBadgeUk = 'УВАГА В СЕКТОРІ';
      stateDescriptionUk = primaryThreat ? primaryThreat.confidenceReason : 'Виявлено спостереження у вашому радіусі.';
    } else {
      overallState = 'GREEN';
      stateBadgeUk = 'СЕКТОР ЧИСТИЙ';
      if (outsideZoneObservations.length > 0) {
        stateDescriptionUk = `Локальної загрози в зоні ${userRadiusKm} км не підтверджено. Активно ${outsideZoneObservations.length} спостережень за межами зони (35–65 км).`;
      } else {
        stateDescriptionUk = `Локальних загроз поблизу не виявлено. 159 радарних джерел сканують ваш сектор.`;
      }
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
    observationsList,
    confirmedThreatsList,
    outsideZoneObservations,
    allClearDetected: threatEvents.some(t => t.category === 'ALL_CLEAR'),
    userNearestKnownLocation: nearestUserLoc.location.name,
    userOblast: nearestUserLoc.location.oblast,
    totalSourcesEvaluated: telegramMessages.length,
    totalClustersAnalyzed: clusters.length,
    observationsCount: observationsList.length,
    threatsCount: confirmedThreatsList.length,
    outsideZoneObservationsCount: outsideZoneObservations.length,
    rejectedCount: rejectedMessagesLog.length,
    geoUnresolvedCount,
    lastTelegramMessageIso,
    rejectedMessagesLog: rejectedMessagesLog.slice(0, 10),
    evaluationTimestamp: new Date().toISOString(),
    isDataStale
  };
}
