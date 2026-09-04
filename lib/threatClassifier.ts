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
  };
}
