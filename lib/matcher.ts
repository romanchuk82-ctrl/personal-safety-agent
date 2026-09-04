import { calculateDistanceKm, extractLocationsFromText, findNearestLocation, GeoLocation } from './gazetteer';
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
    // Skip stale messages
    if (now - msg.unixTimestamp > maxMessageAgeMs) {
      continue;
    }

    const classification = classifyThreat(msg.text);
    const locations = extractLocationsFromText(msg.text);

    if (classification.isAllClear) {
      // Check if all clear relates to user area
      for (const loc of locations) {
        const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
        if (dist <= Math.max(userRadiusKm, loc.defaultRadiusKm)) {
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
            voiceAlertText: `${userName}, увага. Повідомлено про відбій загрози поблизу ${loc.name}.`
          });
        }
      }
      continue;
    }

    // Match locations mentioned in message
    for (const loc of locations) {
      const dist = calculateDistanceKm(userLat, userLng, loc.lat, loc.lng);
      const isDirect = dist <= userRadiusKm;
      const isVicinity = dist <= (userRadiusKm + 10);

      if (isDirect || isVicinity) {
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        let confidenceReason = `Зафіксовано загрозу в радіусі ${dist} км (${loc.name})`;

        if (dist <= 3.5 || loc.type === 'microdistrict') {
          confidence = 'HIGH';
          confidenceReason = `Точна фіксація мікрорайону/локації в радіусі ${dist} км від ваших координат`;
        } else if (msg.authorityWeight >= 0.95 && dist <= userRadiusKm) {
          confidence = 'HIGH';
          confidenceReason = `Підтверджено перевіреним каналом радару (@${msg.channel}) у радіусі ${dist} км`;
        } else if (!isDirect && isVicinity) {
          confidence = 'MEDIUM';
          confidenceReason = `Загроза у прилеглому районі (${loc.name}, ~${dist} км). Підвищена готовність.`;
        }

        const voiceAlertText = `${userName}, увага. Є підтверджена інформація про потенційну загрозу (${classification.categoryNameUk}) поблизу вашого району ${loc.name}, приблизно ${dist} км. Рекомендується негайно перейти в безпечне місце.`;

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
          requiresImmediateShelter: classification.requiresImmediateShelter && (isDirect || dist <= 8),
          rawText: msg.text,
          timestamp: msg.timeIso,
          voiceAlertText
        });
      }
    }
  }

  // 2. Evaluate alerts.in.ua (Active Raion & Hromada level alerts)
  for (const alert of alerts) {
    if (alert.finished_at) continue;

    // Check if alert matches user oblast or nearest known location
    const alertTitle = (alert.location_title || '').toLowerCase();
    const alertOblast = (alert.location_oblast || '').toLowerCase();
    const userOblastNorm = nearestUserLoc.location.oblast.toLowerCase();

    // Check if alert matches user hromada / raion / city
    let matchedLocation: GeoLocation | null = null;
    const extracted = extractLocationsFromText(alert.location_title);
    if (extracted.length > 0) {
      matchedLocation = extracted[0];
    } else if (nearestUserLoc.location.aliases.some(alias => alertTitle.includes(alias))) {
      matchedLocation = nearestUserLoc.location;
    }

    if (matchedLocation) {
      const dist = calculateDistanceKm(userLat, userLng, matchedLocation.lat, matchedLocation.lng);
      const isDirect = dist <= (userRadiusKm + 2);

      if (isDirect) {
        const isTacticalAlert = alert.alert_type === 'artillery_shelling' || alert.alert_type === 'urban_fights';
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
          isWithinRadius: dist <= userRadiusKm,
          confidence: alert.location_type === 'hromada' || alert.location_type === 'city' ? 'HIGH' : 'MEDIUM',
          confidenceReason: isTacticalAlert 
            ? `Офіційно підтверджено загрозу артобстрілу для ${alert.location_title} (~${dist} км)`
            : `Загальна сирена тривоги для ${alert.location_title} (~${dist} км, фоновий статус)`,
          requiresImmediateShelter: isTacticalAlert,
          rawText: `Офіційне сповіщення (${alert.alert_type}) для ${alert.location_title}. Початок: ${alert.started_at}`,
          timestamp: alert.started_at,
          voiceAlertText: isTacticalAlert 
            ? `${userName}, увага. Офіційно підтверджено загрозу артобстрілу поблизу ${alert.location_title}. Терміново в укриття!`
            : `${userName}, увага. Оголошено загальну тривогу для сектору ${alert.location_title}.`
        });
      }
    }
  }

  // Deduplicate and prioritize threats
  // Sort: CRITICAL -> HIGH -> MEDIUM -> INFO, then closest distance, then newest
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
         (t.isWithinRadius || (t.distanceKm !== null && t.distanceKm <= 10))
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
