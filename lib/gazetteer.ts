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
    name: "Дарницький район / Позняки / Осокорки (Київ)",
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

  // --- МИКОЛАЇВ ТА ОБЛАСТЬ ---
  {
    name: "Миколаїв",
    aliases: ["миколаїв", "николаев", "миколаєві", "николаеве", "місто миколаїв"],
    lat: 46.9750,
    lng: 31.9946,
    type: 'city',
    oblast: "Миколаївська область",
    defaultRadiusKm: 11.0
  },
  {
    name: "Корабельний район (Миколаїв)",
    aliases: ["корабельний миколаїв", "корабельный николаев", "богоявленськ", "широка балка"],
    lat: 46.8800,
    lng: 32.0100,
    type: 'microdistrict',
    parentCity: "Миколаїв",
    oblast: "Миколаївська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Інгульський / Соляні / Варварівка (Миколаїв)",
    aliases: ["соляні", "соляные", "варварівка", "варваровка", "інгульський", "ліски миколаїв", "тернівка миколаїв", "матвіївка"],
    lat: 46.9900,
    lng: 32.0300,
    type: 'microdistrict',
    parentCity: "Миколаїв",
    oblast: "Миколаївська область",
    defaultRadiusKm: 5.0
  },

  // --- СУМИ ТА ОБЛАСТЬ ---
  {
    name: "Суми",
    aliases: ["суми", "сумы", "сумах", "місто суми", "сумський напрямок"],
    lat: 50.9077,
    lng: 34.7981,
    type: 'city',
    oblast: "Сумська область",
    defaultRadiusKm: 10.0
  },
  {
    name: "Ковпаківський / Зарічний (Суми)",
    aliases: ["ковпаківський", "зарічний суми", "баранівка суми", "баси суми", "роменська суми", "тепличний суми"],
    lat: 50.9200,
    lng: 34.8100,
    type: 'microdistrict',
    parentCity: "Суми",
    oblast: "Сумська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Охтирка / Тростянець / Конотоп",
    aliases: ["охтирка", "ахтырка", "тростянець", "конотоп", "ромни", "шостка"],
    lat: 50.3100,
    lng: 34.8900,
    type: 'town',
    oblast: "Сумська область",
    defaultRadiusKm: 7.0
  },

  // --- ЧЕРНІГІВ ТА ОБЛАСТЬ ---
  {
    name: "Чернігів",
    aliases: ["чернігів", "чернигов", "чернігові", "чернигове", "місто чернігів", "чернігівський"],
    lat: 51.4982,
    lng: 31.2893,
    type: 'city',
    oblast: "Чернігівська область",
    defaultRadiusKm: 10.0
  },
  {
    name: "Масани / Подусівка / Бобровиця (Чернігів)",
    aliases: ["масани", "подусівка", "подусовка", "бобровиця чернігів", "деснянський чернігів", "новозаводський чернігів", "коти чернігів", "астра чернігів"],
    lat: 51.5200,
    lng: 31.2600,
    type: 'microdistrict',
    parentCity: "Чернігів",
    oblast: "Чернігівська область",
    defaultRadiusKm: 5.0
  },
  {
    name: "Ніжин / Прилуки",
    aliases: ["ніжин", "нежин", "прилуки", "гончарівське", "козелець"],
    lat: 51.0480,
    lng: 31.8840,
    type: 'town',
    oblast: "Чернігівська область",
    defaultRadiusKm: 7.0
  },

  // --- ПОЛТАВА ТА ОБЛАСТЬ ---
  {
    name: "Полтава",
    aliases: ["полтава", "полтаві", "полтаве", "місто полтава", "полтавський"],
    lat: 49.5883,
    lng: 34.5514,
    type: 'city',
    oblast: "Полтавська область",
    defaultRadiusKm: 10.0
  },
  {
    name: "Левада / Алмазний / Сади (Полтава)",
    aliases: ["левада полтава", "алмазний полтава", "поділ полтава", "сади полтава", "шевченківський полтава", "київський полтава", "розсошенці", "вакуленці"],
    lat: 49.5700,
    lng: 34.5400,
    type: 'microdistrict',
    parentCity: "Полтава",
    oblast: "Полтавська область",
    defaultRadiusKm: 5.0
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
    name: "Миргород / Лубни",
    aliases: ["миргород", "миргороді", "лубни", "аеродром миргород"],
    lat: 49.9667,
    lng: 33.6000,
    type: 'town',
    oblast: "Полтавська область",
    defaultRadiusKm: 7.0
  },

  // --- ПАВЛОГРАД ТА ДНІПРОПЕТРОВЩИНА ---
  {
    name: "Павлоград",
    aliases: ["павлоград", "павлограді", "павлограде", "павлоградський", "західний донбас"],
    lat: 48.5167,
    lng: 35.8667,
    type: 'city',
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 9.0
  },
  {
    name: "Шахтарське / Селище (Павлоград)",
    aliases: ["шахтарське павлоград", "селище 40 років", "литмаш павлоград", "західнодонбаська"],
    lat: 48.5300,
    lng: 35.8900,
    type: 'microdistrict',
    parentCity: "Павлоград",
    oblast: "Дніпропетровська область",
    defaultRadiusKm: 5.0
  },

  // --- БОРИСПІЛЬ ТА КИЇВЩИНА ---
  {
    name: "Бориспіль",
    aliases: ["бориспіль", "борисполь", "бориспільський", "бориспільському", "аеропорт бориспіль", "чубинське", "гора бориспіль", "велика олександрівка"],
    lat: 50.3500,
    lng: 30.9500,
    type: 'town',
    oblast: "Київська область",
    defaultRadiusKm: 8.0
  },

  // --- ЛЬВІВ ТА ЗАХІД ---
  {
    name: "Львів",
    aliases: ["львів", "львов", "львові", "львове"],
    lat: 49.8397,
    lng: 24.0297,
    type: 'city',
    oblast: "Львівська область",
    defaultRadiusKm: 10.0
  }
];

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractLocationsFromText(text: string): GeoLocation[] {
  const normalized = text.toLowerCase();
  const matched: GeoLocation[] = [];
  const seenNames = new Set<string>();

  for (const loc of UKRAINIAN_GAZETTEER) {
    for (const alias of loc.aliases) {
      const escaped = escapeRegex(alias);
      const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu');
      if (regex.test(normalized) || normalized.includes(alias)) {
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

export function calculateBearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

export function getBearingSectorUk(bearingDeg: number): string {
  if (bearingDeg >= 337.5 || bearingDeg < 22.5) return 'Північ (N)';
  if (bearingDeg >= 22.5 && bearingDeg < 67.5) return 'Північний Схід (NE)';
  if (bearingDeg >= 67.5 && bearingDeg < 112.5) return 'Схід (E)';
  if (bearingDeg >= 112.5 && bearingDeg < 157.5) return 'Південний Схід (SE)';
  if (bearingDeg >= 157.5 && bearingDeg < 202.5) return 'Південь (S)';
  if (bearingDeg >= 202.5 && bearingDeg < 247.5) return 'Південний Захід (SW)';
  if (bearingDeg >= 247.5 && bearingDeg < 292.5) return 'Захід (W)';
  return 'Північний Захід (NW)';
}
