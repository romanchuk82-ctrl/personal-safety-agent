export type ThreatCategory = 
  | 'KAB'              // Керована авіабомба (КАБ / ФАБ / УМПК)
  | 'BALLISTIC'        // Балістична ракета (Іскандер-М, С-300/С-400, KN-23, Кинджал)
  | 'CRUISE_MISSILE'   // Крилата ракета (Калібр, Х-101/Х-555, Х-59/Х-69)
  | 'UAV_STRIKE'       // Ударний / Реактивний БпЛА (Shahed-136, Герань, реактивний дрон, мопед)
  | 'UAV_RECON'        // Розвідувальний БпЛА (Zala, Supercam, Орлан)
  | 'ARTILLERY'        // Артилерійський обстріл / РСЗВ
  | 'EXPLOSION'        // Зафіксовано вибух / приліт
  | 'ALL_CLEAR'        // Відбій / Дорозвідка / Чисто
  | 'GENERAL_AIR_RAID';// Загальна тривога

export interface ThreatClassification {
  category: ThreatCategory;
  categoryNameUk: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  isTacticalThreat: boolean; // true for KAB, Ballistics, Cruise missiles, Strike UAVs, Artillery, Explosions, Tactical targets
  directionKeywords: string[];
  isAllClear: boolean;
  requiresImmediateShelter: boolean;
  rawKeywordsMatched: string[];
  ttlMinutes: number;
}

/**
 * Returns conservative Time-To-Live (TTL) in minutes for each threat category
 * without receiving fresh confirmation. Moving targets (UAV, missiles, ballistic)
 * have short operational TTL to prevent ghost threats.
 */
export function getThreatTtlMinutes(category: ThreatCategory, text?: string): number {
  switch (category) {
    case 'BALLISTIC':
      return 5; // Балістика / Швидкісна гіперзвукова ціль: 5 хв (політ триває 2-4 хв)
    case 'CRUISE_MISSILE':
      return 7; // Крилата ракета: 7 хв (при швидкості 800 км/год за 7 хв долає ~90 км)
    case 'KAB':
      return 7; // Керована авіабомба (КАБ/ФАБ): 7 хв (планування 3-7 хв)
    case 'UAV_STRIKE':
      // Реактивний або високошвидкісний дрон: коротший TTL
      if (text && /реактивн|швидкісн|ракета-дрон/i.test(text)) {
        return 6;
      }
      return 8; // Ударний БпЛА (Шахед): 8 хв operational TTL без нового підтвердження
    case 'UAV_RECON':
      return 8; // Розвідувальний БпЛА: 8 хв
    case 'EXPLOSION':
      return 7; // Зафіксовано вибух / робота ППО: 7 хв
    case 'ARTILLERY':
      return 10; // Артобстріл / РСЗВ: 10 хв
    case 'ALL_CLEAR':
      return 0; // Відбій / Дорозвідка / Знищено: 0 хв (очищається одразу)
    case 'GENERAL_AIR_RAID':
    default:
      return 15; // Загальна повітряна тривога: 15 хв
  }
}

export function classifyThreat(text: string): ThreatClassification {
  const normalized = text.toLowerCase();
  const matchedKeywords: string[] = [];

  // Active incoming intent check: prevents treating "Шахед на Васильків, попередній збито" as pure all-clear
  const hasIncomingMotion = /(?:курс(?:ом)?\s+на|в\s+бік|у\s+бік|рухається|наближається|підлітає|зафіксовано\s+пуск|пуски\s+каб|пуски\s+ракет|летить\s+на|прямує)/iu.test(normalized);

  // Check for ALL CLEAR, destruction, or exit signals first
  const allClearKeywords = [
    'відбій', 'отбой', 'дорозвідка', 'чисто', 'локаційно втрачено', 'втрачено з радарів',
    'всі цілі знищено', 'всі цілі збито', 'ціль знищено', 'цілі знищено', 'ціль збито', 'цілі збито',
    'шахед знищено', 'шахеда знищено', 'шахеди знищено', 'шахед збито', 'шахеда збито', 'шахеди збито',
    'збито шахед', 'збито ракету', 'збито бпла', 'збито ціль', 'збили шахед', 'збили ціль',
    'ракета збита', 'ракету збито', 'ракети збито', 'ракети знищено', 'збиття цілі', 'збиття ракети', 'збиття шахеда',
    'цілей немає', 'без загроз', 'загроза минула', 'попередньо чисто',
    'по цілях мінус', 'всі мінус', 'по шахедах мінус', 'мінус шахед', 'мінус ціль',
    'вийшов з', 'вийшла з', 'вийшли з', 'покинув', 'покинула', 'покинули',
    'вийшов за межі', 'вийшла за межі', 'вийшли за межі',
    'перелетів у', 'перелетіла у', 'перелетіли у'
  ];

  for (const kw of allClearKeywords) {
    if (normalized.includes(kw) && !hasIncomingMotion) {
      matchedKeywords.push(kw);
      return {
        category: 'ALL_CLEAR',
        categoryNameUk: 'Відбій / Знищено / Чисто',
        severity: 'INFO',
        isTacticalThreat: false,
        directionKeywords: [],
        isAllClear: true,
        requiresImmediateShelter: false,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('ALL_CLEAR', normalized),
      };
    }
  }

  // Standalone clear/destruction keywords if not describing a fresh active launch
  const standaloneClearRx = /(?:^|\s|\b)(?:збито|знищено|збили|ліквідовано|приземлили|перехоплено)(?:$|\s|\b|[!.,])/iu;
  if (standaloneClearRx.test(normalized) && !hasIncomingMotion) {
    matchedKeywords.push('збито/знищено');
    return {
      category: 'ALL_CLEAR',
      categoryNameUk: 'Ціль знищено / збито',
      severity: 'INFO',
      isTacticalThreat: false,
      directionKeywords: [],
      isAllClear: true,
      requiresImmediateShelter: false,
      rawKeywordsMatched: matchedKeywords,
      ttlMinutes: getThreatTtlMinutes('ALL_CLEAR', normalized),
    };
  }

  // Direction keywords
  const directionKeywords: string[] = [];
  const dirPatterns = [
    'курсом на', 'курс на', 'в бік', 'у бік', 'в напрямку', 'у напрямку',
    'напрямок на', 'напрямок', 'в направлении', 'підлітає до', 'підлітає',
    'подлетает', 'на підльоті', 'підліт', 'через', 'повз', 'в районі',
    'у районі', 'в районе', 'наближається', 'приближается', 'над містом',
    'над районом', 'над селом', 'заходить на', 'рухається на', 'рухається у напрямку',
    'рухається в напрямку', 'вектор на', 'вектор руху', 'прямує на'
  ];
  for (const dp of dirPatterns) {
    if (normalized.includes(dp)) {
      directionKeywords.push(dp);
    }
  }

  // Check leading motion prepositions (e.g. "на Вишневе", "повз Бровари", "до Києва")
  const leadingDirMatch = normalized.match(/^(?:на|до|повз|через|під|у напрямку|в напрямку|в бік|у бік)\s+/iu);
  if (leadingDirMatch) {
    directionKeywords.push(leadingDirMatch[0].trim());
  }

  // 1. KAB / Aviation bombs
  const kabKeywords = [
    'каб', 'каби', 'кабы', 'кабам', 'кабами', 'фаб', 'умпк', 'авіабомб', 'авиабомб',
    'пуск каб', 'пуски каб', 'скид каб', 'скиди каб', 'тактична авіація пуски', 'загроза каб'
  ];
  for (const kw of kabKeywords) {
    const rx = new RegExp(`(^|[^a-zA-Zа-яА-ЯіїєґІЇЄҐ])${kw}([^a-zA-Zа-яА-ЯіїєґІЇЄҐ]|$)`, 'iu');
    if (rx.test(normalized) || normalized.includes(kw)) {
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
        ttlMinutes: getThreatTtlMinutes('KAB', normalized),
      };
    }
  }

  // 2. Ballistics & High-speed threats
  const ballisticKeywords = [
    'балістик', 'баллистик', 'іскандер-м', 'іскандер', 'искендер',
    'kn-23', 'кинджал', 'кинжал', 'швидкісна ціль', 'швидкісні цілі',
    'скоростная цель', 'с-300', 'с-400', 'циркон', 'х-47м2', 'балістика'
  ];
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
        ttlMinutes: getThreatTtlMinutes('BALLISTIC', normalized),
      };
    }
  }

  // 3. Cruise missiles
  const missileKeywords = [
    'крилата ракета', 'крилаті ракети', 'крылатая ракета', 'калібр', 'калибр',
    'х-101', 'х-555', 'х-59', 'х-69', 'х-22', 'х-32', 'ракета на', 'ракети на',
    'ракета в бік', 'пуски ракет', 'пуск ракет', 'зафіксовано пуски', 'ракета'
  ];
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
        ttlMinutes: getThreatTtlMinutes('CRUISE_MISSILE', normalized),
      };
    }
  }

  // 4. Strike UAVs (Shahed, Jet UAVs, Mopeds, Drones, Target Counts like 1x/2x)
  const uavStrikeKeywords = [
    'шахед', 'шахеди', 'шахід', 'шахеды', 'шахедів', 'шахедам', 'шахедами', 'шахеду',
    'бпла', 'бплa', 'мопед', 'мопеди', 'мопедів', 'мопедов', 'дрон', 'дрони', 'дронів', 'дронами',
    'герань', 'реактивн', 'реактивний', 'реактивні', 'реактивна', 'реактивну', 'реактивного',
    'реактивним', 'реактивне', 'реактивний бпла', 'реактивний мопед', 'ударний бпла',
    'ударні дрони', 'бандерол'
  ];
  for (const kw of uavStrikeKeywords) {
    const rx = new RegExp(`(^|[^a-zA-Zа-яА-ЯіїєґІЇЄҐ])${kw}`, 'iu');
    if (rx.test(normalized) || normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'UAV_STRIKE',
        categoryNameUk: 'Ударний / Реактивний БпЛА (Шахед / Дрон)',
        severity: 'HIGH',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('UAV_STRIKE', normalized),
      };
    }
  }

  // Target count patterns: e.g. "1х", "2х", "3х", "1x", "2x" used by tactical radars (monitor, vanek, etc.)
  const targetCountRx = /(?:^|\s|\b)(\d+)\s*[xх]\s+([^\n\r]+)/iu;
  if (targetCountRx.test(normalized)) {
    matchedKeywords.push('радарний облік цілей');
    return {
      category: 'UAV_STRIKE',
      categoryNameUk: 'Повітряна ціль (Радарне спостереження)',
      severity: 'HIGH',
      isTacticalThreat: true,
      directionKeywords,
      isAllClear: false,
      requiresImmediateShelter: true,
      rawKeywordsMatched: matchedKeywords,
      ttlMinutes: getThreatTtlMinutes('UAV_STRIKE', normalized),
    };
  }

  // 5. Explosions
  const explosionKeywords = [
    'вибух', 'взрыв', 'вибухи', 'взрывы', 'гучно', 'громко', 'приліт', 'прилет',
    'звук вибуху', 'звуки вибухів', 'працює ппо', 'робота ппо', 'збиття'
  ];
  for (const kw of explosionKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'EXPLOSION',
        categoryNameUk: 'Зафіксовано вибух / Робота ППО',
        severity: 'HIGH',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('EXPLOSION', normalized),
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
        ttlMinutes: getThreatTtlMinutes('ARTILLERY', normalized),
      };
    }
  }

  // 7. Tactical target / Shelter directives without specific ammo named (e.g. "Ціль на Київ", "Крюківщина - в укриття!", "на Вишневе")
  const tacticalGenericKeywords = [
    'ціль на', 'цілі на', 'ціль у напрямку', 'ціль в напрямку', 'цілі курсом',
    'повітряна ціль', 'повітряні цілі', 'група цілей', 'рух цілі', 'рух цілей',
    'в укриття', 'в укрытия', 'терміново в укриття', 'негайно в укриття',
    'знаходьтесь в укриттях', 'прямуйте в укриття', 'перебувайте в укриттях'
  ];
  for (const kw of tacticalGenericKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
      return {
        category: 'UAV_STRIKE',
        categoryNameUk: 'Повітряна ціль у секторі',
        severity: 'HIGH',
        isTacticalThreat: true,
        directionKeywords,
        isAllClear: false,
        requiresImmediateShelter: true,
        rawKeywordsMatched: matchedKeywords,
        ttlMinutes: getThreatTtlMinutes('UAV_STRIKE', normalized),
      };
    }
  }

  // 8. If text contains motion vectors towards a town/district (e.g. "курсом на...", "вектор на...", "на Васильків")
  if (directionKeywords.length > 0) {
    matchedKeywords.push(...directionKeywords);
    return {
      category: 'UAV_STRIKE',
      categoryNameUk: 'Спостереження руху цілі',
      severity: 'MEDIUM',
      isTacticalThreat: true,
      directionKeywords,
      isAllClear: false,
      requiresImmediateShelter: false,
      rawKeywordsMatched: matchedKeywords,
      ttlMinutes: getThreatTtlMinutes('UAV_STRIKE', normalized),
    };
  }

  // 9. General alert fallback (Non-tactical siren)
  return {
    category: 'GENERAL_AIR_RAID',
    categoryNameUk: 'Загальна повітряна тривога',
    severity: 'INFO',
    isTacticalThreat: false,
    directionKeywords,
    isAllClear: false,
    requiresImmediateShelter: false,
    rawKeywordsMatched: ['загальна тривога'],
    ttlMinutes: getThreatTtlMinutes('GENERAL_AIR_RAID', normalized),
  };
}
