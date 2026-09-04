export interface GeoLocation {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  type: 'city' | 'district' | 'microdistrict' | 'town' | 'village';
  parentCity?: string;
  oblast: string;
  defaultRadiusKm: number;
}

export const UKRAINIAN_GAZETTEER: GeoLocation[] = [
  // --- ЗАПОРІЖЖЯ ТА ОБЛАСТЬ ---
  {
    name: "Запоріжжя",
    aliases: ["запоріжжя", "запорожье", "запоріжжі", "запорожья", "зп", "місто запоріжжя"],
    lat: 47.8388,
    lng: 35.1396,
    type: 'city',
    oblast: "Запорізька область",
    defaultRadiusKm: 12.0
  },
  {
    name: "Шевченківський район (Запоріжжя)",
    aliases: ["шевченківський", "шевчик", "шевченковский", "шевченківському"],
    lat: 47.8500,
    lng: 35.2000,
    type: 'microdistrict',
    parentCity: "Запоріжжя",
    oblast: "Запорізька область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Хортицький район / Бабурка (Запоріжжя)",
    aliases: ["бабурка", "хортицький", "хортицкий", "хортиця", "хортице"],
    lat: 47.8300,
    lng: 35.0500,
    type: 'microdistrict',
    parentCity: "Запоріжжя",
    oblast: "Запорізька область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Комунарський район / Космос (Запоріжжя)",
    aliases: ["комунарський", "коммунарский", "космос", "космічний", "південний", "пески", "піски"],
    lat: 47.7800,
    lng: 35.1800,
    type: 'microdistrict',
    parentCity: "Запоріжжя",
    oblast: "Запорізька область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Дніпровський район (Запоріжжя)",
    aliases: ["дніпровський район", "днепровский район", "правый берег", "правий берег зп", "осипенківський", "бородінський", "бородинский"],
    lat: 47.8700,
    lng: 35.0800,
    type: 'microdistrict',
    parentCity: "Запоріжжя",
    oblast: "Запорізька область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Вільнянськ",
    aliases: ["вільнянськ", "вольнянск", "вільнянський", "вольнянский"],
    lat: 47.9425,
    lng: 35.4328,
    type: 'town',
    oblast: "Запорізька область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Кушугум",
    aliases: ["кушугум", "балабине", "малокатеринівка"],
    lat: 47.7120,
    lng: 35.2167,
    type: 'town',
    oblast: "Запорізька область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Оріхів",
    aliases: ["оріхів", "орехов", "оріхівський", "ореховский"],
    lat: 47.5667,
    lng: 35.7833,
    type: 'town',
    oblast: "Запорізька область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Гуляйполе",
    aliases: ["гуляйполе", "гуляйполі"],
    lat: 47.6611,
    lng: 36.2625,
    type: 'town',
    oblast: "Запорізька область",
    defaultRadiusKm: 7.0
  },

  // --- ДНІПРО ТА ОБЛАСТЬ ---
  {
    name: "Дніпро",
    aliases: ["дніпро", "днепр", "дніпрі", "днепре", "місто дніпро"],
    lat: 48.4647,
    lng: 35.0462,
    type: 'city',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 14.0
  },
  {
    name: "Лівий берег (Дніпро)",
    aliases: ["лівий берег дніпро", "левый берег днепр", "калинова", "калиновая", "лівобережний", "левобережный", "індустріальний дніпро", "андир"],
    lat: 48.5100,
    lng: 35.0800,
    type: 'microdistrict',
    parentCity: "Дніпро",
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Правий берег / Центр (Дніпро)",
    aliases: ["перемога дніпро", "победа днепр", "тополя", "тополь", "соборний дніпро", "шевченківський дніпро", "гагаріна дніпро"],
    lat: 48.4300,
    lng: 35.0400,
    type: 'microdistrict',
    parentCity: "Дніпро",
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Кам'янське",
    aliases: ["кам'янське", "каменское", "дніпродзержинськ", "каменском"],
    lat: 48.5167,
    lng: 34.6167,
    type: 'city',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Кривий Ріг",
    aliases: ["кривий ріг", "кривой рог", "кривому розі", "кривом роге", "квр"],
    lat: 47.9105,
    lng: 33.3918,
    type: 'city',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 16.0
  },
  {
    name: "Нікополь",
    aliases: ["нікополь", "никополь", "нікополі", "нікопольський"],
    lat: 47.5667,
    lng: 34.4000,
    type: 'city',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Павлоград",
    aliases: ["павлоград", "павлограді", "павлоградський"],
    lat: 48.5167,
    lng: 35.8667,
    type: 'city',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Самар / Новомосковськ",
    aliases: ["новомосковськ", "новомосковск", "самар", "піщанка"],
    lat: 48.6333,
    lng: 35.2167,
    type: 'town',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 6.0
  },

  // --- КИЇВ ТА ОБЛАСТЬ ---
  {
    name: "Київ",
    aliases: ["київ", "киев", "києві", "киеве", "столиця", "місто київ"],
    lat: 50.4501,
    lng: 30.5234,
    type: 'city',
    oblast: "Київська область",
    defaultRadiusKm: 15.0
  },
  {
    name: "Оболонь (Київ)",
    aliases: ["оболонь", "оболонський", "оболонский", "оболоні"],
    lat: 50.5015,
    lng: 30.4981,
    type: 'microdistrict',
    parentCity: "Київ",
    oblast: "Київська область",
    defaultRadiusKm: 4.5
  },
  {
    name: "Позняки / Осокорки / Харківський (Київ)",
    aliases: ["позняки", "осокорки", "дарницький", "дарницкий", "дарниця", "дарница", "харківський масив"],
    lat: 50.3980,
    lng: 30.6340,
    type: 'microdistrict',
    parentCity: "Київ",
    oblast: "Київська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Троєщина / Деснянський (Київ)",
    aliases: ["троєщина", "троещина", "деснянський", "деснянский", "лісовий масив"],
    lat: 50.5100,
    lng: 30.5900,
    type: 'microdistrict',
    parentCity: "Київ",
    oblast: "Київська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Святошин / Нивки / Академмістечко (Київ)",
    aliases: ["святошин", "нивки", "виноградар", "виноградарь", "академмістечко", "академгородок", "борщагівка", "борщаговка"],
    lat: 50.4580,
    lng: 30.3720,
    type: 'microdistrict',
    parentCity: "Київ",
    oblast: "Київська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Голосіїв (Київ)",
    aliases: ["голосіїв", "голосеево", "голосіївський", "голосеевский", "теремки"],
    lat: 50.3800,
    lng: 30.4900,
    type: 'microdistrict',
    parentCity: "Київ",
    oblast: "Київська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Бориспіль",
    aliases: ["бориспіль", "борисполь", "бориспільський"],
    lat: 50.3500,
    lng: 30.9500,
    type: 'town',
    oblast: "Київська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Бровари",
    aliases: ["бровари", "бровары", "броварський"],
    lat: 50.5114,
    lng: 30.7903,
    type: 'town',
    oblast: "Київська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Ірпінь / Буча / Гостомель",
    aliases: ["ірпінь", "ирпень", "буча", "гостомель", "ворзель"],
    lat: 50.5200,
    lng: 30.2400,
    type: 'town',
    oblast: "Київська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Обухів / Українка",
    aliases: ["обухів", "обухов", "українка", "украинка", "обухівський"],
    lat: 50.1200,
    lng: 30.6300,
    type: 'town',
    oblast: "Київська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Боярка / Вишневе",
    aliases: ["боярка", "боярки", "вишневе", "вишневое", "софіївська борщагівка", "петропавлівська борщагівка", "крюківщина"],
    lat: 50.3200,
    lng: 30.3000,
    type: 'town',
    oblast: "Київська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Біла Церква",
    aliases: ["біла церква", "белая церковь", "білоцерківський"],
    lat: 49.7989,
    lng: 30.1153,
    type: 'city',
    oblast: "Київська область",
    defaultRadiusKm: 8.0
  },

  // --- ХАРКІВ ТА ОБЛАСТЬ ---
  {
    name: "Харків",
    aliases: ["харків", "харьков", "харкові", "харькове", "місто харків"],
    lat: 49.9935,
    lng: 36.2304,
    type: 'city',
    oblast: "Харківська область",
    defaultRadiusKm: 14.0
  },
  {
    name: "Салтівка (Харків)",
    aliases: ["салтівка", "салтовка", "північна салтівка", "северная салтовка"],
    lat: 50.0200,
    lng: 36.3400,
    type: 'microdistrict',
    parentCity: "Харків",
    oblast: "Харківська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Олексіївка / Павлове Поле (Харків)",
    aliases: ["олексіївка", "алексеевка", "павлове поле", "павлово поле", "шеченківський харків"],
    lat: 50.0400,
    lng: 36.2100,
    type: 'microdistrict',
    parentCity: "Харків",
    oblast: "Харківська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "ХТЗ / Рогань / Немишлянський (Харків)",
    aliases: ["хтз", "рогань", "немишлянський", "індустріальний харків", "холодна гора"],
    lat: 49.9500,
    lng: 36.3700,
    type: 'microdistrict',
    parentCity: "Харків",
    oblast: "Харківська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Чугуїв",
    aliases: ["чугуїв", "чугуев", "чугуївський"],
    lat: 49.8356,
    lng: 36.6864,
    type: 'town',
    oblast: "Харківська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Дергачі",
    aliases: ["дергачі", "дергачи", "мала данилівка"],
    lat: 50.1136,
    lng: 36.1194,
    type: 'town',
    oblast: "Харківська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Куп'янськ",
    aliases: ["куп'янськ", "купянск", "куп'янський"],
    lat: 49.7072,
    lng: 37.6167,
    type: 'town',
    oblast: "Харківська область",
    defaultRadiusKm: 6.0
  },

  // --- ОДЕСА ТА ОБЛАСТЬ ---
  {
    name: "Одеса",
    aliases: ["одеса", "одесса", "одесі", "одессе", "місто одеса"],
    lat: 46.4825,
    lng: 30.7233,
    type: 'city',
    oblast: "Одеська область",
    defaultRadiusKm: 12.0
  },
  {
    name: "Посьолок Котовського (Одеса)",
    aliases: ["поскот", "котовського", "суворовський одеса", "пересипський"],
    lat: 46.5700,
    lng: 30.7900,
    type: 'microdistrict',
    parentCity: "Одеса",
    oblast: "Одеська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Таїрова / Черемушки (Одеса)",
    aliases: ["таїрова", "таирова", "черемушки", "київський одеса", "хаджибейський", "фонтан одеса"],
    lat: 46.4000,
    lng: 30.7100,
    type: 'microdistrict',
    parentCity: "Одеса",
    oblast: "Одеська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Чорноморськ",
    aliases: ["чорноморськ", "черноморск", "іллічівськ", "ильичевск"],
    lat: 46.2994,
    lng: 30.6558,
    type: 'town',
    oblast: "Одеська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Південь Одещини / Затока / Ізмаїл",
    aliases: ["затока", "ізмаїл", "измаил", "рені", "рени", "південь одещини", "південь одеської"],
    lat: 45.3500,
    lng: 28.8300,
    type: 'district',
    oblast: "Одеська область",
    defaultRadiusKm: 25.0
  },

  // --- МИКОЛАЇВ ТА ОБЛАСТЬ ---
  {
    name: "Миколаїв",
    aliases: ["миколаїв", "николаев", "миколаєві", "николаеве", "місто миколаїв"],
    lat: 46.9750,
    lng: 31.9946,
    type: 'city',
    oblast: "Миколаївська область",
    defaultRadiusKm: 10.0
  },
  {
    name: "Очаків",
    aliases: ["очаків", "очаков", "очаківський"],
    lat: 46.6186,
    lng: 31.5492,
    type: 'town',
    oblast: "Миколаївська область",
    defaultRadiusKm: 6.0
  },

  // --- СУМИ ТА ОБЛАСТЬ ---
  {
    name: "Суми",
    aliases: ["суми", "сумы", "сумах", "місто суми"],
    lat: 50.9077,
    lng: 34.7981,
    type: 'city',
    oblast: "Сумська область",
    defaultRadiusKm: 9.0
  },
  {
    name: "Конотоп",
    aliases: ["конотоп", "конотопі", "конотопський"],
    lat: 51.2400,
    lng: 33.2000,
    type: 'town',
    oblast: "Сумська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Шостка",
    aliases: ["шостка", "шостці", "шосткинський"],
    lat: 51.8631,
    lng: 33.4797,
    type: 'town',
    oblast: "Сумська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Охтирка",
    aliases: ["охтирка", "ахтырка", "охтирський"],
    lat: 50.3106,
    lng: 34.8989,
    type: 'town',
    oblast: "Сумська область",
    defaultRadiusKm: 6.0
  },

  // --- ПОЛТАВА ТА ОБЛАСТЬ ---
  {
    name: "Полтава",
    aliases: ["полтава", "полтаві", "полтаве", "місто полтава"],
    lat: 49.5883,
    lng: 34.5514,
    type: 'city',
    oblast: "Полтавська область",
    defaultRadiusKm: 9.0
  },
  {
    name: "Кременчук",
    aliases: ["кременчук", "кременчуг", "кременчуці", "кременчуге", "кременчуцький"],
    lat: 49.0631,
    lng: 33.4042,
    type: 'city',
    oblast: "Полтавська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Миргород",
    aliases: ["миргород", "миргороді", "миргородський"],
    lat: 49.9667,
    lng: 33.6000,
    type: 'town',
    oblast: "Полтавська область",
    defaultRadiusKm: 6.0
  },

  // --- ІНШІ МІСТА УКРАЇНИ ---
  {
    name: "Чернігів",
    aliases: ["чернігів", "чернигов", "чернігові", "чернигове"],
    lat: 51.4982,
    lng: 31.2893,
    type: 'city',
    oblast: "Чернігівська область",
    defaultRadiusKm: 9.0
  },
  {
    name: "Черкаси",
    aliases: ["черкаси", "черкассы", "черкасах"],
    lat: 49.4444,
    lng: 32.0598,
    type: 'city',
    oblast: "Черкаська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Умань",
    aliases: ["умань", "умані", "уманський"],
    lat: 48.7484,
    lng: 30.2218,
    type: 'town',
    oblast: "Черкаська область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Вінниця",
    aliases: ["вінниця", "винница", "вінниці"],
    lat: 49.2331,
    lng: 28.4682,
    type: 'city',
    oblast: "Вінницька область",
    defaultRadiusKm: 9.0
  },
  {
    name: "Житомир",
    aliases: ["житомир", "житомирі", "житомирський"],
    lat: 50.2547,
    lng: 28.6587,
    type: 'city',
    oblast: "Житомирська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Кропивницький",
    aliases: ["кропивницький", "кропивницкий", "кропивницькому", "кіровоград"],
    lat: 48.5079,
    lng: 32.2623,
    type: 'city',
    oblast: "Кіровоградська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Херсон",
    aliases: ["херсон", "херсоні", "херсоне", "херсонський"],
    lat: 46.6354,
    lng: 32.6169,
    type: 'city',
    oblast: "Херсонська область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Львів",
    aliases: ["львів", "львов", "львові", "львове"],
    lat: 49.8397,
    lng: 24.0297,
    type: 'city',
    oblast: "Львівська область",
    defaultRadiusKm: 10.0
  },
  {
    name: "Хмельницький",
    aliases: ["хмельницький", "хмельницкий", "хмельницькому"],
    lat: 49.4230,
    lng: 26.9871,
    type: 'city',
    oblast: "Хмельницька область",
    defaultRadiusKm: 8.0
  },
  {
    name: "Старокостянтинів",
    aliases: ["старокостянтинів", "староконстантинов", "старокостянтинові"],
    lat: 49.7564,
    lng: 27.2203,
    type: 'town',
    oblast: "Хмельницька область",
    defaultRadiusKm: 6.0
  },
  {
    name: "Рівне",
    aliases: ["рівне", "ровно", "рівному"],
    lat: 50.6199,
    lng: 26.2516,
    type: 'city',
    oblast: "Рівненська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Луцьк",
    aliases: ["луцьк", "луцк", "луцьку"],
    lat: 50.7472,
    lng: 25.3254,
    type: 'city',
    oblast: "Волинська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Тернопіль",
    aliases: ["тернопіль", "тернополь", "тернополі"],
    lat: 49.5535,
    lng: 25.5948,
    type: 'city',
    oblast: "Тернопільська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Івано-Франківськ",
    aliases: ["івано-франківськ", "ивано-франковск", "франківськ"],
    lat: 48.9226,
    lng: 24.7111,
    type: 'city',
    oblast: "Івано-Франківська область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Чернівці",
    aliases: ["чернівці", "черновцы", "чернівцях"],
    lat: 48.2921,
    lng: 25.9358,
    type: 'city',
    oblast: "Чернівецька область",
    defaultRadiusKm: 7.0
  },
  {
    name: "Ужгород",
    aliases: ["ужгород", "ужгороді"],
    lat: 48.6208,
    lng: 22.2879,
    type: 'city',
    oblast: "Закарпатська область",
    defaultRadiusKm: 6.0
  }
];

// Helper: Haversine distance in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Find nearest known location in gazetteer for given coordinates
export function findNearestLocation(lat: number, lng: number): { location: GeoLocation; distanceKm: number } {
  let nearest = UKRAINIAN_GAZETTEER[0];
  let minDistance = Infinity;

  for (const loc of UKRAINIAN_GAZETTEER) {
    const dist = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  return { location: nearest, distanceKm: minDistance };
}

// Match text mentions against known gazetteer locations
export function extractLocationsFromText(text: string): GeoLocation[] {
  const normalized = text.toLowerCase();
  const matched: GeoLocation[] = [];
  const seenNames = new Set<string>();

  for (const loc of UKRAINIAN_GAZETTEER) {
    for (const alias of loc.aliases) {
      // Regex word boundary matching (supporting Cyrillic words)
      const regex = new RegExp(`(^|[^a-zA-Zа-яА-ЯіїєґІЇЄҐ])${alias}([^a-zA-Zа-яА-ЯіїєґІЇЄҐ]|$)`, 'i');
      if (regex.test(normalized)) {
        if (!seenNames.has(loc.name)) {
          matched.push(loc);
          seenNames.add(loc.name);
        }
        break;
      }
    }
  }

  return matched;
}
