export type ThreatCategory = 
  | 'KAB'              // Керована авіабомба (КАБ / ФАБ / УМПК)
  | 'BALLISTIC'        // Балістична ракета (Іскандер-М, С-300/С-400, KN-23, Кинджал)
  | 'CRUISE_MISSILE'   // Крилата ракета (Калібр, Х-101/Х-555, Х-59/Х-69)
  | 'UAV_STRIKE'       // Ударний БпЛА (Shahed-136, Герань, реактивний дрон)
  | 'UAV_RECON'        // Розвідувальний БпЛА (Zala, Supercam, Орлан)
  | 'ARTILLERY'        // Артилерійський обстріл / РСЗВ
  | 'EXPLOSION'        // Зафіксовано вибух
  | 'ALL_CLEAR'        // Відбій / Дорозвідка / Чисто
  | 'GENERAL_AIR_RAID';// Загальна тривога

export interface ThreatClassification {
  category: ThreatCategory;
  categoryNameUk: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  isTacticalThreat: boolean; // true ONLY for KAB, Ballistics, Cruise missiles, Strike UAVs, Artillery, Explosions
  directionKeywords: string[];
  isAllClear: boolean;
  requiresImmediateShelter: boolean;
  rawKeywordsMatched: string[];
  ttlMinutes: number;
}

/**
 * Returns conservative Time-To-Live (TTL) in minutes for each threat category
 * without receiving fresh confirmation.
 */
export function getThreatTtlMinutes(category: ThreatCategory): number {
  switch (category) {
    case 'BALLISTIC':
      return 8; // Балістика / Швидкісна ціль: 8 хв (надзвичайно швидкий підліт)
    case 'KAB':
      return 12; // Керована авіабомба (КАБ/ФАБ): 12 хв (планування 3-7 хв)
    case 'CRUISE_MISSILE':
      return 12; // Крилата ракета: 12 хв (~15 км/хв)
    case 'UAV_STRIKE':
      return 18; // Ударний БпЛА (Шахед): 18 хв без нового радарного спостереження
    case 'UAV_RECON':
      return 20; // Розвідувальний БпЛА: 20 хв
    case 'EXPLOSION':
      return 10; // Зафіксовано вибух: 10 хв
    case 'ARTILLERY':
      return 12; // Артобстріл / РСЗВ: 12 хв
    case 'ALL_CLEAR':
      return 10; // Відбій / Чисто: 10 хв
    case 'GENERAL_AIR_RAID':
    default:
      return 15; // Загальна тривога: 15 хв
  }
}



export function classifyThreat(text: string): ThreatClassification {
  const normalized = text.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check for ALL CLEAR first
  const allClearKeywords = ['відбій', 'отбой', 'дорозвідка', 'чисто', 'локаційно втрачено', 'всі цілі знищено', 'без загроз'];
  for (const kw of allClearKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'ALL_CLEAR',
        categoryNameUk: 'Відбій / Дорозвідка',
        severity: 'INFO',
        isTacticalThreat: false,
        directionKeywords: [],
        isAllClear: true,
        requiresImmediateShelter: false,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('ALL_CLEAR'),
      };
    }
  }

  // Direction keywords
  const directionKeywords: string[] = [];
  const dirPatterns = ['курсом на', 'в бік', 'в направлении', 'напрямок', 'підлітає', 'подлетает', 'через', 'в районі', 'в районе', 'наближається', 'приближается', 'над містом', 'над городом'];
  for (const dp of dirPatterns) {
    if (normalized.includes(dp)) {
      directionKeywords.push(dp);
    }
  }

  // 1. KAB / Aviation bombs
  const kabKeywords = ['каб', 'каби', 'кабы', 'фаб', 'умпк', 'авіабомб', 'авиабомб', 'пуск каб', 'скид каб', 'тактична авіація пуски'];
  for (const kw of kabKeywords) {
    if (new RegExp(`(^|[^a-zA-Zа-яА-ЯіїєґІЇЄҐ])${kw}([^a-zA-Zа-яА-ЯіїєґІЇЄҐ]|$)`, 'i').test(normalized) || normalized.includes('каб')) {
      matchedKeywords.push(kw);
      return {
        category: 'KAB',
        categoryNameUk: 'Керована авіабомба (КАБ)',
        severity: 'CRITICAL',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('KAB'),
      };
    }
  }

  // 2. Ballistics
  const ballisticKeywords = ['балістик', 'баллистик', 'іскандер-м', 'искендер', 'іскандер', 'kn-23', 'кинджал', 'кинжал', 'швидкісна ціль', 'скоростная цель', 'с-300', 'с-400'];
  for (const kw of ballisticKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'BALLISTIC',
        categoryNameUk: 'Балістична загроза / Швидкісна ціль',
        severity: 'CRITICAL',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('BALLISTIC'),
      };
    }
  }

  // 3. Cruise missiles
  const missileKeywords = ['крилата ракета', 'крылатая ракета', 'калібр', 'калибр', 'х-101', 'х-59', 'х-69', 'ракета на', 'ракета в бік', 'пуски ракет'];
  for (const kw of missileKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'CRUISE_MISSILE',
        categoryNameUk: 'Крилата ракета',
        severity: 'CRITICAL',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('CRUISE_MISSILE'),
      };
    }
  }

  // 4. Strike UAVs (Shahed / drones)
  const uavStrikeKeywords = ['шахед', 'шахід', 'шахеды', 'шахедів', 'бпла', 'бплa', 'мопед', 'мопеды', 'дрон', 'герань', 'реактивний бпла', 'реактивный мопед'];
  for (const kw of uavStrikeKeywords) {
    if (new RegExp(`(^|[^a-zA-Zа-яА-ЯіїєґІЇЄҐ])${kw}([^a-zA-Zа-яА-ЯіїєґІЇЄҐ]|$)`, 'i').test(normalized) || normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'UAV_STRIKE',
        categoryNameUk: 'Ударний БпЛА (Шахед / Дрон)',
        severity: 'HIGH',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('UAV_STRIKE'),
      };
    }
  }

  // 5. Explosions
  const explosionKeywords = ['вибух', 'взрыв', 'вибухи', 'взрывы', 'гучно', 'громко', 'приліт', 'прилет', 'звук вибуху'];
  for (const kw of explosionKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'EXPLOSION',
        categoryNameUk: 'Зафіксовано вибух / Гучно',
        severity: 'HIGH',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('EXPLOSION'),
      };
    }
  }

  // 6. Artillery / MLRS
  const artKeywords = ['артобстріл', 'артобстрел', 'рсзв', 'град', 'ураган', 'обстріл', 'обстрел'];
  for (const kw of artKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'ARTILLERY',
        categoryNameUk: 'Артилерійський обстріл / РСЗВ',
        severity: 'HIGH',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('ARTILLERY'),
      };
    }
  }

  // 7. General alert fallback (Non-tactical siren)
  return {
    category: 'GENERAL_AIR_RAID',
    categoryNameUk: 'Загальна повітряна тривога',
    severity: 'INFO',
    isTacticalThreat: false,
    directionKeywords,
    isAllClear: false,
    requiresImmediateShelter: false,
    rawKeywordsMatched: ['загальна тривога'],
    ttlMinutes: getThreatTtlMinutes('GENERAL_AIR_RAID'),
  };
}
