export interface TelegramMessage {
  id: string;
  channel: string;
  channelTitle: string;
  authorityWeight: number;
  text: string;
  timeIso: string;
  unixTimestamp: number;
}

export type ChannelCategory = 
  | 'military_official' 
  | 'radar_national' 
  | 'tactical_south' 
  | 'tactical_east' 
  | 'tactical_north' 
  | 'tactical_center' 
  | 'tactical_west' 
  | 'strategic_launch'
  | 'osint_network'
  | 'user_custom';

export type SourceTier = 'USER_PRIORITY' | 'CRITICAL' | 'TACTICAL' | 'REGIONAL' | 'OSINT' | 'CUSTOM';

export interface ChannelConfig {
  username: string;
  title: string;
  category: ChannelCategory;
  region: string;
  weight: number;
  priority: number; // 1 (highest) to 3
  tier?: SourceTier;
  hasWebPreview?: boolean;
  enabled?: boolean;
  reason?: string;
}

export const USER_PRIORITY_CHANNELS: ChannelConfig[] = [
  {
    "username": "kievreal1",
    "title": "Київ Інфо / Реальний Київ (Радар столиці & БпЛА)",
    "category": "user_custom",
    "region": "Київ та область",
    "weight": 0.98,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "Hajun_BY",
    "title": "Беларускі Гаюн (Моніторинг авіації та Шахедів)",
    "category": "user_custom",
    "region": "Північ / Білоруський кордон",
    "weight": 0.97,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "tlknews",
    "title": "ТЛК Новини (TLK News / Оперативно)",
    "category": "user_custom",
    "region": "Вся Україна",
    "weight": 0.96,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_ukraine",
    "title": "Труха Украина (Оперативні тривоги & вибухи)",
    "category": "user_custom",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "lachentyt",
    "title": "Лачен пише (Ігор Лаченков / Безпека)",
    "category": "user_custom",
    "region": "Вся Україна",
    "weight": 0.96,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "insiderUKR",
    "title": "Инсайдер UA (Оперативні повідомлення)",
    "category": "user_custom",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "suspilnenews",
    "title": "Суспільне Новини (Офіційний мовник)",
    "category": "user_custom",
    "region": "Вся Україна",
    "weight": 0.97,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_dnepr",
    "title": "Труха Днепр (Оперативно)",
    "category": "user_custom",
    "region": "Дніпропетровська область",
    "weight": 0.93,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_odessa",
    "title": "Труха Одесса (Оперативно)",
    "category": "user_custom",
    "region": "Одеська область",
    "weight": 0.93,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_nikolaev",
    "title": "Труха Николаев (Оперативно)",
    "category": "user_custom",
    "region": "Миколаївська область",
    "weight": 0.93,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_poltava",
    "title": "Труха Полтава (Оперативно)",
    "category": "user_custom",
    "region": "Полтавська область",
    "weight": 0.93,
    "priority": 1,
    "tier": "USER_PRIORITY",
    "hasWebPreview": true,
    "enabled": true
  }
];

export const MONITORED_CHANNELS: ChannelConfig[] = [
  {
    "username": "kpszsu",
    "title": "Командування Повітряних Сил ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 1,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "war_monitor",
    "title": "War Monitor (Радар повітряного простору)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "vanek_nikolaev",
    "title": "Николаевский Ванёк (Тактичний радар & загрози)",
    "category": "radar_national",
    "region": "Вся Україна / Південь",
    "weight": 0.98,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "air_alert_ua",
    "title": "Повітряний Простір України",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "monitorwarr",
    "title": "Monitor (Оперативна тактика & Авіація)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "AFUStratCom",
    "title": "Стратегічні комунікації ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "operativnoZSU",
    "title": "Оперативний ЗСУ (Військові зведення)",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "DPSUkr",
    "title": "Державна прикордонна служба України",
    "category": "military_official",
    "region": "Прикордоння",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "landforcesofukraine",
    "title": "Сухопутні війська ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "osirskiy",
    "title": "Головнокомандувач ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "raketa_radar",
    "title": "Радар Ракет & Шахедів",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "ok_pivnich",
    "title": "Оперативне командування «Північ»",
    "category": "military_official",
    "region": "Північ",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "GeneralStaffZSU",
    "title": "Генеральний штаб ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "zp_now",
    "title": "Запоріжжя Радар (ППО & Загрози)",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "eRadarrua",
    "title": "єРадар (Виявлення цілей, висоти, курси)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "zoda_gov_ua",
    "title": "Іван Федоров / Запорізька ОВА (КАБ & РСЗВ)",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "liveukraine_media",
    "title": "Live Ukraine Alerts & Radar",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "sinelnikovo_radar",
    "title": "Синельникове / Покровський сектор Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "deepstateua",
    "title": "DeepState UA (Оперативна інформація)",
    "category": "radar_national",
    "region": "Фронт / Україна",
    "weight": 0.9,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dnipro_radar",
    "title": "Дніпро Оперативний Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "vilniansk",
    "title": "Вільнянськ / Запорізький р-н Радар",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.85,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kamianske_radar",
    "title": "Камʼянське Радар ППО",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dnipro_alerts",
    "title": "Дніпро Тактична Обстановка",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dnipropetrovskaODA",
    "title": "Сергій Лисак / Дніпропетровська ОВА",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "samar_novomoskovsk",
    "title": "Самар (Новомосковськ) Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.85,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "odesa_radar",
    "title": "Одеса ППО Монітор",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "ihor_terekhov",
    "title": "Ігор Терехов / Мер Харкова (Оперативно)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "synegubov",
    "title": "Олег Синєгубов / Харківська ОВА (КАБ/С-300)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "vilkul",
    "title": "Олександр Вілкул / Кривий Ріг Захист",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "mykolaivskaODA",
    "title": "Віталій Кім / Миколаївська ОВА",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "odeskaODA",
    "title": "Олег Кіпер / Одеська ОВА",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "our_odessa",
    "title": "Одеса Радар (Дрони & Ракети Чорного моря)",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "sumy_radar",
    "title": "Суми Радар / Тактика & КАБ",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "senkevichonline",
    "title": "Олександр Сєнкевич / Мер Миколаєва",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "nizhyn_radar",
    "title": "Ніжин Радар ППО",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "poltava_radar",
    "title": "Полтава Радар ППО & Шахеди",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "chernigivskaODA",
    "title": "Вʼячеслав Чаус / Чернігівська ОВА",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "poltavskaODA",
    "title": "Філіп Пронін / Полтавська ОВА",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "mena_live",
    "title": "Мена / Сновськ Радар",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.85,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "AerisRimor",
    "title": "Aeris Rimor (Радар БПЛА & Ракетної небезпеки)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.96,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "tlk_news",
    "title": "TLK News Ukraine",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "crimeanwind",
    "title": "Кримський вітер (Пуски ракет & Шахедів з Криму)",
    "category": "strategic_launch",
    "region": "Крим / Південь",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "vseok450",
    "title": "Все Ок 4.5.0 (Вектори руху Шахедів)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.94,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "mon1tor_ua",
    "title": "Monitor UA (Оперативний трекінг цілей)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.93,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "operinform",
    "title": "Оперативні зведення / Ситуація",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.89,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "Tsaplienko",
    "title": "Андрій Цаплієнко (Оперативні воєнні сповіщення)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dsns_telegram",
    "title": "ДСНС України (Офіційні надзвичайні ситуації та укриття)",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "hyevuy_dnepr",
    "title": "Ху*вый Днепр (Оперативно)",
    "category": "osint_network",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "vitaliyklychko",
    "title": "Віталій Кличко (Мер Києва / Оперативно)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "novostiniko",
    "title": "Новости N (Миколаїв оперативний)",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "ssternenko",
    "title": "Сергій Стерненко (Оперативна аналітика та загрози БПЛА)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.93,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kharkiv_1654",
    "title": "Харьков 1654 (КАБи та балістика С-300)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.91,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "VA_Kyiv",
    "title": "КМВА (Сергій Попко / Повітряні загрози Києва)",
    "category": "military_official",
    "region": "Київська область",
    "weight": 0.98,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "KyivCityOfficial",
    "title": "КМДА (Офіційний портал Києва)",
    "category": "military_official",
    "region": "Київська область",
    "weight": 0.98,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kyivmonitoring1",
    "title": "Київ Моніторинг / Радар (Київщина, Бориспіль)",
    "category": "tactical_north",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "gunpKyiv",
    "title": "Поліція Києва (Оперативні патрулі)",
    "category": "military_official",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dnepr_operativ",
    "title": "Дніпро Оперативний (Дніпро & Павлоград)",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.91,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kyivoperat",
    "title": "Київ Оперативний (Тривоги та загрози)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "boryspil_live",
    "title": "Бориспіль Оперативний / Чубинське / Гора",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "boryspil_radar",
    "title": "Бориспіль Радар (Аеропорт & Східний коридор)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "brovary_radar",
    "title": "Бровари Радар ППО",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "obukhiv_radar",
    "title": "Обухів / Українка / Трипілля Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "bucha_live",
    "title": "Буча / Ірпінь / Гостомель Монітор",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "tier": "REGIONAL",
    "hasWebPreview": true,
    "enabled": true
  }
];

export function getPrioritizedChannels(
  userOblast?: string,
  customChannels: ChannelConfig[] = [],
  userPriorityUsernames?: string[]
): ChannelConfig[] {
  // Deduplicate user custom channels and USER_PRIORITY_CHANNELS
  const seenUsernames = new Set<string>();
  const userPriorityMerged: ChannelConfig[] = [];
  const prioritySet = userPriorityUsernames && userPriorityUsernames.length > 0
    ? new Set(userPriorityUsernames.map(u => u.trim().toLowerCase().replace(/^@/, '')))
    : new Set(USER_PRIORITY_CHANNELS.map(u => u.username.toLowerCase()));

  // 1. First add any custom channels passed dynamically from storage
  for (const ch of customChannels) {
    const u = ch.username.toLowerCase().replace(/^@/, '');
    if (!seenUsernames.has(u)) {
      seenUsernames.add(u);
      const isUserPriority = prioritySet.has(u);
      userPriorityMerged.push({
        ...ch,
        tier: isUserPriority ? 'USER_PRIORITY' : (ch.tier || 'CUSTOM'),
        category: 'user_custom',
        priority: isUserPriority ? 1 : (ch.priority || 2)
      });
    }
  }

  // 2. Add built-in USER_PRIORITY_CHANNELS if not already in list
  for (const ch of USER_PRIORITY_CHANNELS) {
    const u = ch.username.toLowerCase().replace(/^@/, '');
    if (!seenUsernames.has(u)) {
      seenUsernames.add(u);
      const isUserPriority = prioritySet.has(u);
      userPriorityMerged.push({
        ...ch,
        tier: isUserPriority ? 'USER_PRIORITY' : 'REGIONAL',
        priority: isUserPriority ? 1 : 2
      });
    }
  }

  // 3. Add system MONITORED_CHANNELS (excluding duplicates of user channels)
  const systemAvailable = MONITORED_CHANNELS.filter(c => !seenUsernames.has(c.username.toLowerCase().replace(/^@/, ''))).map(c => {
    const u = c.username.toLowerCase().replace(/^@/, '');
    if (prioritySet.has(u)) {
      return {
        ...c,
        tier: 'USER_PRIORITY' as SourceTier,
        priority: 1
      };
    }
    return c;
  });

  const combined = [...userPriorityMerged, ...systemAvailable];

  if (!userOblast) {
    return combined.sort((a, b) => {
      if (a.tier === 'USER_PRIORITY' && b.tier !== 'USER_PRIORITY') return -1;
      if (a.tier !== 'USER_PRIORITY' && b.tier === 'USER_PRIORITY') return 1;
      if (a.tier === 'CRITICAL' && b.tier !== 'CRITICAL') return -1;
      if (a.tier !== 'CRITICAL' && b.tier === 'CRITICAL') return 1;
      return (a.priority || 2) - (b.priority || 2);
    });
  }

  const normUserOblast = userOblast.toLowerCase();
  
  return combined.sort((a, b) => {
    // USER_PRIORITY always first
    if (a.tier === 'USER_PRIORITY' && b.tier !== 'USER_PRIORITY') return -1;
    if (a.tier !== 'USER_PRIORITY' && b.tier === 'USER_PRIORITY') return 1;

    // CRITICAL tier second
    if (a.tier === 'CRITICAL' && b.tier !== 'CRITICAL') return -1;
    if (a.tier !== 'CRITICAL' && b.tier === 'CRITICAL') return 1;

    const aMatches = a.region.toLowerCase().includes(normUserOblast) || normUserOblast.includes(a.region.toLowerCase()) || a.region === 'Вся Україна';
    const bMatches = b.region.toLowerCase().includes(normUserOblast) || normUserOblast.includes(b.region.toLowerCase()) || b.region === 'Вся Україна';

    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;

    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    return b.weight - a.weight;
  });
}

interface ChannelCache {
  messages: TelegramMessage[];
  timestamp: number;
  lastSuccessIso?: string;
}

const telegramCache: Record<string, ChannelCache> = {};
let rollingBatchIndex = 0;
let lastKnownSuccessfulCycleTs: number = 0;

export interface ChannelReaderState {
  preferredReader: string;
  activeReader: string;
  fallbackReader?: string;
  lastSuccessfulReadTs: number;
  lastMessageId?: string;
  lastMessageTimeIso?: string;
  health: 'ONLINE' | 'DEGRADED' | 'FAILED';
  failoverCount: number;
}

export const channelReaderStates: Record<string, ChannelReaderState> = {};

export interface TelegramReader {
  id: string;
  name: string;
  buildUrl: (username: string) => string;
  headers?: (options?: FetchTelegramOptions) => Record<string, string>;
  isBrowserSupported: boolean;
}

export const TELEGRAM_READERS: TelegramReader[] = [
  {
    id: 'jina_html',
    name: 'Jina HTML Proxy',
    buildUrl: (u) => `https://r.jina.ai/https://t.me/s/${u}`,
    headers: (opts) => ({
      'x-return-format': 'html',
      'Accept': 'text/html',
      ...(opts?.force ? { 'X-No-Cache': 'true', 'X-Cache-Tolerance': '0' } : {})
    }),
    isBrowserSupported: true,
  },
  {
    id: 'corsproxy_io',
    name: 'CorsProxy.io',
    buildUrl: (u) => `https://corsproxy.io/?url=${encodeURIComponent('https://t.me/s/' + u)}`,
    headers: () => ({
      'Accept': 'text/html'
    }),
    isBrowserSupported: true,
  },
  {
    id: 'codetabs_proxy',
    name: 'CodeTabs Proxy',
    buildUrl: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://t.me/s/' + u)}`,
    headers: () => ({
      'Accept': 'text/html'
    }),
    isBrowserSupported: true,
  },
  {
    id: 'allorigins_raw',
    name: 'AllOrigins Raw',
    buildUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent('https://t.me/s/' + u)}`,
    headers: () => ({
      'Accept': 'text/html'
    }),
    isBrowserSupported: true,
  },
  {
    id: 'widget_embed',
    name: 'Telegram Widget Embed',
    buildUrl: (u) => `https://r.jina.ai/https://t.me/${u}?embed=1`,
    headers: (opts) => ({
      'x-return-format': 'html',
      'Accept': 'text/html',
      ...(opts?.force ? { 'X-No-Cache': 'true', 'X-Cache-Tolerance': '0' } : {})
    }),
    isBrowserSupported: true,
  },
  {
    id: 'direct_preview',
    name: 'Direct Preview',
    buildUrl: (u) => `https://t.me/s/${u}`,
    headers: () => ({
      'Accept': 'text/html'
    }),
    isBrowserSupported: false,
  }
];

export interface ChannelIngestStatus {
  channel: string;
  title: string;
  ok: boolean;
  count: number;
  lastMessageText?: string;
  lastMessageTimeIso?: string;
  lastMessageId?: string;
  lastCheckTimestamp: number;
  lastSuccessfulReadTs?: number;
  preferredReader?: string;
  activeReader?: string;
  fallbackReader?: string;
  isFallbackActive?: boolean;
  error?: string;
  tier?: SourceTier;
  hasWebPreview?: boolean;
  statusCategory: 'healthy' | 'unavailable' | 'disabled';
  health: 'ONLINE' | 'DEGRADED' | 'FAILED';
}

export interface TelegramIngestMetrics {
  totalSources: number;
  monitoredSources: number;
  healthyCount: number;
  unavailableCount: number;
  timeoutCount?: number;
  disabledCount: number;
  userPriorityTotal: number;
  userPriorityHealthy: number;
  userPriorityFallbackCount: number;
  userPriorityFailedCount: number;
  userPriorityUnavailable: number;
  criticalTotal: number;
  criticalHealthy: number;
  criticalError: number;
  regionalTotal: number;
  regionalHealthy: number;
  regionalUnavailable: number;
  temporarilyUnavailableCount: number;
  removedUnusableCount: number;
  lastSuccessfulCycleTs: number;
  lastSuccessfulCycleIso?: string;
  lastRealDataTimestamp: number;
  lastRealDataIso: string | null;
  lastMessageTimestamp?: number;
  lastMessageIso?: string | null;
  refreshDiagnostics?: RefreshDiagnostics;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function parseTelegramHtml(html: string, channel: ChannelConfig): TelegramMessage[] {
  if (!html || typeof html !== 'string') return [];
  const messages: TelegramMessage[] = [];
  const now = Date.now();

  // Split by message container: either tgme_widget_message_wrap (web preview) or tgme_widget_message (widget embed)
  const blocks = html.split(/(?:<div class="tgme_widget_message_wrap|<div class="tgme_widget_message\b(?!\s*_\w)[^>]*data-post)/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i);
    const timeMatch = block.match(/<time[^>]*\bdatetime="([^"]+)"/i);

    if (textMatch) {
      const rawText = textMatch[1]
        .replace(/<tg-emoji[^>]*>([\s\S]*?)<\/tg-emoji>/gi, '$1')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();

      const decodedText = decodeHtmlEntities(rawText);
      const timeIso = timeMatch ? timeMatch[1] : new Date().toISOString();
      const unixTimestamp = new Date(timeIso).getTime();

      if (
        decodedText.length > 3 &&
        !decodedText.includes('document.body') &&
        !decodedText.includes('no_transition') &&
        !decodedText.startsWith('<script')
      ) {
        const id = channel.username + '_' + (isNaN(unixTimestamp) ? now : unixTimestamp) + '_' + decodedText.slice(0, 15).replace(/\s+/g, '_');
        messages.push({
          id,
          channel: channel.username,
          channelTitle: channel.title,
          authorityWeight: channel.weight,
          text: decodedText,
          timeIso,
          unixTimestamp: isNaN(unixTimestamp) ? now : unixTimestamp
        });
      }
    }
  }
  return messages;
}

export interface RefreshDiagnostics {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  successfulSources: number;
  timeoutSources: number;
  failedSources: number;
  totalSources: number;
  status: 'full' | 'partial' | 'timeout' | 'failed';
  statusSummaryUk: string;
  stageProgress: {
    userPriority: 'done' | 'partial' | 'timeout' | 'pending';
    critical: 'done' | 'partial' | 'timeout' | 'pending';
    officialAlerts: 'done' | 'error' | 'timeout' | 'pending';
    otherSources: 'done' | 'partial' | 'timeout' | 'pending';
  };
}

export interface FetchTelegramOptions {
  force?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface FetchChannelResult {
  messages: TelegramMessage[];
  error?: string;
  statusCategory: 'healthy' | 'timeout' | 'unavailable';
  health: 'ONLINE' | 'DEGRADED' | 'FAILED';
  readerUsed?: string;
  isFallback?: boolean;
  durationMs: number;
}

export async function fetchChannelMessages(
  channel: ChannelConfig,
  options?: FetchTelegramOptions
): Promise<FetchChannelResult> {
  const now = Date.now();
  const cleanUser = channel.username.trim().toLowerCase().replace(/^@/, '');
  const cached = telegramCache[cleanUser];
  const startTime = Date.now();

  let state = channelReaderStates[cleanUser];
  if (!state) {
    state = {
      preferredReader: 'jina_html',
      activeReader: 'jina_html',
      lastSuccessfulReadTs: 0,
      health: 'ONLINE',
      failoverCount: 0
    };
    channelReaderStates[cleanUser] = state;
  }

  // Rate-limit safety: 15s normal cycle, 0s forced refresh threshold
  const minInterval = options?.force ? 0 : 15000;
  if (!options?.force && cached && (now - cached.timestamp) < minInterval) {
    return {
      messages: cached.messages,
      statusCategory: 'healthy',
      health: state.health || 'ONLINE',
      readerUsed: state.activeReader,
      isFallback: !!state.fallbackReader,
      durationMs: 0
    };
  }

  if (options?.signal?.aborted) {
    return {
      messages: cached?.messages || [],
      error: 'Запит скасовано за таймаутом',
      statusCategory: 'timeout',
      health: (cached && cached.messages.length > 0) ? 'DEGRADED' : 'FAILED',
      readerUsed: state.activeReader,
      durationMs: 0
    };
  }

  const isBrowser = typeof window !== 'undefined';
  const availableReaders = TELEGRAM_READERS.filter(r => !isBrowser || r.isBrowserSupported);

  // Preferred reader first, then remaining readers in priority sequence
  const preferred = availableReaders.find(r => r.id === state.preferredReader) || availableReaders[0];
  const readersToTry = [
    preferred,
    ...availableReaders.filter(r => r.id !== preferred.id)
  ];

  const perReaderTimeoutMs = options?.timeoutMs || (options?.force ? 2800 : 3800);
  let lastError = 'Тимчасово не відповідає';
  let isTimeout = false;

  for (const reader of readersToTry) {
    if (options?.signal?.aborted) {
      isTimeout = true;
      break;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perReaderTimeoutMs);
    const abortHandler = () => controller.abort();
    if (options?.signal) {
      options.signal.addEventListener('abort', abortHandler, { once: true });
    }

    try {
      const url = reader.buildUrl(cleanUser);
      const headers = reader.headers ? reader.headers(options) : { 'Accept': 'text/html' };

      const res = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: options?.force ? 'no-store' : 'default'
      });

      clearTimeout(timer);
      if (options?.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }

      if (res.ok) {
        const html = await res.text();
        const messages = parseTelegramHtml(html, channel);

        if (messages.length > 0) {
          const recent = messages.slice(-20);
          telegramCache[cleanUser] = {
            messages: recent,
            timestamp: now,
            lastSuccessIso: new Date(now).toISOString()
          };

          const isFallback = reader.id !== state.preferredReader;
          state.activeReader = reader.id;
          state.fallbackReader = isFallback ? reader.id : undefined;
          if (isFallback) {
            state.failoverCount++;
          }
          state.lastSuccessfulReadTs = now;
          state.lastMessageId = recent[recent.length - 1]?.id;
          state.lastMessageTimeIso = recent[recent.length - 1]?.timeIso;
          state.health = 'ONLINE';

          return {
            messages: recent,
            statusCategory: 'healthy',
            health: 'ONLINE',
            readerUsed: reader.name,
            isFallback,
            durationMs: Date.now() - startTime
          };
        }
      } else {
        lastError = `HTTP ${res.status} (${reader.name})`;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || options?.signal?.aborted) {
        isTimeout = true;
        lastError = `Таймаут (${reader.name})`;
      } else {
        lastError = err?.message || `Помилка (${reader.name})`;
      }
    } finally {
      clearTimeout(timer);
      if (options?.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  if (cached && cached.messages.length > 0) {
    state.health = 'DEGRADED';
    return {
      messages: cached.messages,
      error: isTimeout ? 'Таймаут (використано кеш)' : `Кеш (${lastError})`,
      statusCategory: isTimeout ? 'timeout' : 'healthy',
      health: 'DEGRADED',
      readerUsed: state.activeReader,
      isFallback: !!state.fallbackReader,
      durationMs
    };
  }

  state.health = 'FAILED';
  return {
    messages: [],
    error: isTimeout ? 'Таймаут усіх рідерів' : `Усі рідери недоступні: ${lastError}`,
    statusCategory: isTimeout ? 'timeout' : 'unavailable',
    health: 'FAILED',
    readerUsed: state.activeReader,
    durationMs
  };
}

export async function fetchAllTelegramFeeds(
  userOblast?: string,
  _ignoredMaxParallel?: number,
  customChannels: ChannelConfig[] = [],
  options?: FetchTelegramOptions,
  userPriorityUsernames?: string[]
): Promise<{
  messages: TelegramMessage[];
  sourceStatus: Record<string, ChannelIngestStatus>;
  metrics: TelegramIngestMetrics;
}> {
  const allMessagesMap = new Map<string, TelegramMessage>();
  const sourceStatus: Record<string, ChannelIngestStatus> = {};
  const now = Date.now();

  const allAvailable = getPrioritizedChannels(userOblast, customChannels, userPriorityUsernames);
  const activeChannels = allAvailable.filter(c => c.enabled !== false);

  const userPriorityChannels = activeChannels.filter(c => c.tier === 'USER_PRIORITY');
  const criticalChannels = activeChannels.filter(c => c.tier === 'CRITICAL');

  const mandatoryUsernames = new Set([
    ...userPriorityChannels.map(c => c.username.toLowerCase().replace(/^@/, '')),
    ...criticalChannels.map(c => c.username.toLowerCase().replace(/^@/, ''))
  ]);

  const regionalChannels = activeChannels.filter(c => !mandatoryUsernames.has(c.username.toLowerCase().replace(/^@/, '')));
  const BATCH_SIZE = 15;
  const startIndex = (rollingBatchIndex * BATCH_SIZE) % Math.max(1, regionalChannels.length);
  const selectedBatch = regionalChannels.slice(startIndex, startIndex + BATCH_SIZE);
  rollingBatchIndex = (rollingBatchIndex + 1) % Math.max(1, Math.ceil(regionalChannels.length / BATCH_SIZE));

  const CONCURRENCY = 4;
  let timeoutSourcesCount = 0;
  let failedSourcesCount = 0;

  const fetchChannelTier = async (channels: ChannelConfig[]) => {
    for (let i = 0; i < channels.length; i += CONCURRENCY) {
      if (options?.signal?.aborted) {
        for (let j = i; j < channels.length; j++) {
          const ch = channels[j];
          const cleanU = ch.username.toLowerCase().replace(/^@/, '');
          if (!sourceStatus[cleanU]) {
            const cached = telegramCache[cleanU];
            if (cached && cached.messages.length > 0) {
              cached.messages.forEach(m => allMessagesMap.set(m.id, m));
            }
            const rState = channelReaderStates[cleanU];
            sourceStatus[cleanU] = {
              channel: ch.username,
              title: ch.title,
              ok: (cached?.messages.length ?? 0) > 0,
              count: cached?.messages.length || 0,
              lastMessageText: cached?.messages[cached.messages.length - 1]?.text,
              lastMessageTimeIso: cached?.messages[cached.messages.length - 1]?.timeIso,
              lastMessageId: cached?.messages[cached.messages.length - 1]?.id,
              lastCheckTimestamp: cached?.timestamp || now,
              lastSuccessfulReadTs: rState?.lastSuccessfulReadTs || cached?.timestamp || 0,
              preferredReader: rState?.preferredReader || 'jina_html',
              activeReader: rState?.activeReader || 'jina_html',
              fallbackReader: rState?.fallbackReader,
              isFallbackActive: !!rState?.fallbackReader,
              error: 'Таймаут (ліміт часу перевищено)',
              tier: ch.tier,
              hasWebPreview: true,
              statusCategory: 'unavailable',
              health: (cached && cached.messages.length > 0) ? 'DEGRADED' : 'FAILED'
            };
            timeoutSourcesCount++;
          }
        }
        break;
      }

      const chunk = channels.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(chunk.map(ch => fetchChannelMessages(ch, options)));

      chunkResults.forEach((res, idx) => {
        const ch = chunk[idx];
        const cleanU = ch.username.toLowerCase().replace(/^@/, '');
        const rState = channelReaderStates[cleanU];
        if (res.status === 'fulfilled') {
          const { messages, error, statusCategory, health, readerUsed, isFallback } = res.value;
          messages.forEach(m => allMessagesMap.set(m.id, m));
          const latestMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
          const isOk = messages.length > 0 && (statusCategory === 'healthy' || health === 'ONLINE');

          if (statusCategory === 'timeout') timeoutSourcesCount++;
          else if (!isOk) failedSourcesCount++;

          sourceStatus[cleanU] = {
            channel: ch.username,
            title: ch.title,
            ok: isOk,
            count: messages.length,
            lastMessageText: latestMsg?.text,
            lastMessageTimeIso: latestMsg?.timeIso,
            lastMessageId: latestMsg?.id,
            lastCheckTimestamp: now,
            lastSuccessfulReadTs: rState?.lastSuccessfulReadTs || (isOk ? now : 0),
            preferredReader: rState?.preferredReader || 'jina_html',
            activeReader: readerUsed || rState?.activeReader || 'jina_html',
            fallbackReader: rState?.fallbackReader,
            isFallbackActive: isFallback ?? !!rState?.fallbackReader,
            error: isOk ? undefined : (error || 'Немає свіжих повідомлень'),
            tier: ch.tier,
            hasWebPreview: true,
            statusCategory: isOk ? 'healthy' : (statusCategory === 'timeout' ? 'unavailable' : 'unavailable'),
            health: health || (isOk ? 'ONLINE' : 'FAILED')
          };
        } else {
          failedSourcesCount++;
          sourceStatus[cleanU] = {
            channel: ch.username,
            title: ch.title,
            ok: false,
            count: 0,
            lastCheckTimestamp: now,
            lastSuccessfulReadTs: rState?.lastSuccessfulReadTs || 0,
            preferredReader: rState?.preferredReader || 'jina_html',
            activeReader: rState?.activeReader || 'jina_html',
            fallbackReader: rState?.fallbackReader,
            isFallbackActive: !!rState?.fallbackReader,
            error: res.reason?.message || 'Помилка з’єднання',
            tier: ch.tier,
            hasWebPreview: true,
            statusCategory: 'unavailable',
            health: 'FAILED'
          };
        }
      });

      if (i + CONCURRENCY < channels.length && !options?.signal?.aborted) {
        await new Promise(r => setTimeout(r, 30));
      }
    }
  };

  // 1. TIER 1: USER PRIORITY FIRST
  await fetchChannelTier(userPriorityChannels);

  // 2. TIER 2: CRITICAL SECOND
  if (!options?.signal?.aborted) {
    await fetchChannelTier(criticalChannels);
  }

  // 3. TIER 3: REGIONAL BATCH THIRD
  if (!options?.signal?.aborted) {
    await fetchChannelTier(selectedBatch);
  }

  // Populate remaining regional channels from cache
  regionalChannels.forEach(ch => {
    const cleanU = ch.username.toLowerCase().replace(/^@/, '');
    if (!sourceStatus[cleanU]) {
      const cached = telegramCache[cleanU];
      const rState = channelReaderStates[cleanU];
      if (cached && cached.messages.length > 0) {
        cached.messages.forEach(m => allMessagesMap.set(m.id, m));
        const latestMsg = cached.messages[cached.messages.length - 1];
        sourceStatus[cleanU] = {
          channel: ch.username,
          title: ch.title,
          ok: true,
          count: cached.messages.length,
          lastMessageText: latestMsg?.text,
          lastMessageTimeIso: latestMsg?.timeIso,
          lastMessageId: latestMsg?.id,
          lastCheckTimestamp: cached.timestamp,
          lastSuccessfulReadTs: rState?.lastSuccessfulReadTs || cached.timestamp,
          preferredReader: rState?.preferredReader || 'jina_html',
          activeReader: rState?.activeReader || 'jina_html',
          fallbackReader: rState?.fallbackReader,
          isFallbackActive: !!rState?.fallbackReader,
          tier: ch.tier,
          hasWebPreview: true,
          statusCategory: 'healthy',
          health: 'DEGRADED'
        };
      } else {
        sourceStatus[cleanU] = {
          channel: ch.username,
          title: ch.title,
          ok: false,
          count: 0,
          lastCheckTimestamp: now,
          lastSuccessfulReadTs: 0,
          preferredReader: rState?.preferredReader || 'jina_html',
          activeReader: rState?.activeReader || 'jina_html',
          error: 'Очікує черги опитування',
          tier: ch.tier,
          hasWebPreview: true,
          statusCategory: 'unavailable',
          health: 'FAILED'
        };
      }
    }
  });

  const allMessages = Array.from(allMessagesMap.values());
  allMessages.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

  const healthyCount = Object.values(sourceStatus).filter(s => s.statusCategory === 'healthy').length;
  const unavailableCount = Object.values(sourceStatus).filter(s => s.statusCategory === 'unavailable').length;

  const userPriorityTotal = userPriorityChannels.length;
  const userPriorityHealthy = userPriorityChannels.filter(c => sourceStatus[c.username.toLowerCase().replace(/^@/, '')]?.ok).length;
  const userPriorityFallbackCount = userPriorityChannels.filter(c => {
    const s = sourceStatus[c.username.toLowerCase().replace(/^@/, '')];
    return s && s.ok && s.isFallbackActive;
  }).length;
  const userPriorityFailedCount = userPriorityTotal - userPriorityHealthy;
  const userPriorityUnavailable = userPriorityFailedCount;

  const criticalTotal = criticalChannels.length;
  const criticalHealthy = criticalChannels.filter(c => sourceStatus[c.username.toLowerCase().replace(/^@/, '')]?.ok).length;
  const criticalError = criticalTotal - criticalHealthy;

  const regionalTotal = regionalChannels.length;
  const regionalHealthy = regionalChannels.filter(c => sourceStatus[c.username.toLowerCase().replace(/^@/, '')]?.ok).length;
  const regionalUnavailable = regionalTotal - regionalHealthy;

  if (healthyCount > 0) {
    lastKnownSuccessfulCycleTs = now;
  }

  let newestMessageTs = 0;
  let newestMessageIso: string | null = null;
  if (allMessages.length > 0) {
    newestMessageTs = allMessages[0].unixTimestamp;
    newestMessageIso = allMessages[0].timeIso;
  }

  const metrics: TelegramIngestMetrics = {
    totalSources: allAvailable.length,
    monitoredSources: activeChannels.length,
    healthyCount,
    unavailableCount,
    timeoutCount: timeoutSourcesCount,
    disabledCount: 0,
    userPriorityTotal,
    userPriorityHealthy,
    userPriorityFallbackCount,
    userPriorityFailedCount,
    userPriorityUnavailable,
    criticalTotal,
    criticalHealthy,
    criticalError,
    regionalTotal,
    regionalHealthy,
    regionalUnavailable,
    temporarilyUnavailableCount: unavailableCount,
    removedUnusableCount: 98,
    lastSuccessfulCycleTs: lastKnownSuccessfulCycleTs || now,
    lastSuccessfulCycleIso: (lastKnownSuccessfulCycleTs || now) ? new Date(lastKnownSuccessfulCycleTs || now).toISOString() : undefined,
    lastRealDataTimestamp: newestMessageTs,
    lastRealDataIso: newestMessageIso,
    lastMessageTimestamp: newestMessageTs,
    lastMessageIso: newestMessageIso
  };

  return { messages: allMessages, sourceStatus, metrics };
}

export function getAllMonitoredSources(): ChannelConfig[] {
  return [...USER_PRIORITY_CHANNELS, ...MONITORED_CHANNELS];
}

export interface ClusterSourceEntry {
  username: string;
  title: string;
  weight: number;
  timeIso: string;
  timeFormatted: string;
  text: string;
  telegramUrl: string;
  isOriginal: boolean;
}

export interface MessageCluster {
  id: string;
  representativeMessage: TelegramMessage;
  primaryChannel: string;
  primaryChannelTitle: string;
  sourceCount: number;
  independentSourceCount: number;
  repostCount: number;
  sourceSummaryText: string;
  sources: ClusterSourceEntry[];
  effectiveAuthority: number;
  earliestTimestamp: number;
  latestTimestamp: number;
  normalizedText: string;
}

export function cleanMessageText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/@\w+/gi, '')
    .replace(/\[\s*підписатися\s*\]/gi, '')
    .replace(/підписатись|підпишись|подписаться/gi, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function calculateTextSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function clusterTelegramMessages(messages: TelegramMessage[], timeWindowMs: number = 8 * 60 * 1000): MessageCluster[] {
  const clusters: MessageCluster[] = [];

  for (const msg of messages) {
    const cleaned = cleanMessageText(msg.text);
    if (cleaned.length < 5) continue;

    let matchedCluster: MessageCluster | null = null;

    for (const cluster of clusters) {
      const timeDiff = Math.abs(msg.unixTimestamp - cluster.earliestTimestamp);
      if (timeDiff <= timeWindowMs) {
        const similarity = calculateTextSimilarity(cleaned, cluster.normalizedText);
        if (similarity >= 0.55 || (cleaned.length > 20 && cluster.normalizedText.includes(cleaned.slice(0, 30))) || (cluster.normalizedText.length > 20 && cleaned.includes(cluster.normalizedText.slice(0, 30)))) {
          matchedCluster = cluster;
          break;
        }
      }
    }

    const timeFormatted = new Date(msg.unixTimestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const telegramUrl = 'https://t.me/' + msg.channel;

    if (matchedCluster) {
      const isDuplicateChannel = matchedCluster.sources.some(s => s.username === msg.channel);
      if (!isDuplicateChannel) {
        matchedCluster.sources.push({
          username: msg.channel,
          title: msg.channelTitle,
          weight: msg.authorityWeight,
          timeIso: msg.timeIso,
          timeFormatted,
          text: msg.text,
          telegramUrl,
          isOriginal: false
        });
        matchedCluster.sourceCount++;
        matchedCluster.repostCount++;
      }

      if (msg.authorityWeight > matchedCluster.effectiveAuthority) {
        matchedCluster.representativeMessage = msg;
        matchedCluster.primaryChannel = msg.channel;
        matchedCluster.primaryChannelTitle = msg.channelTitle;
      }

      matchedCluster.effectiveAuthority = Math.min(
        1.0,
        Math.max(...matchedCluster.sources.map(s => s.weight)) + (Math.min(matchedCluster.sourceCount - 1, 4) * 0.015)
      );
      matchedCluster.earliestTimestamp = Math.min(matchedCluster.earliestTimestamp, msg.unixTimestamp);
      matchedCluster.latestTimestamp = Math.max(matchedCluster.latestTimestamp, msg.unixTimestamp);

      if (matchedCluster.repostCount > 0) {
        matchedCluster.sourceSummaryText = `${matchedCluster.sourceCount} повідомлень (1 першоджерело + ${matchedCluster.repostCount} репост)`;
      } else {
        matchedCluster.sourceSummaryText = '1 незалежне джерело';
      }
    } else {
      clusters.push({
        id: 'cluster_' + msg.id,
        representativeMessage: msg,
        primaryChannel: msg.channel,
        primaryChannelTitle: msg.channelTitle,
        sourceCount: 1,
        independentSourceCount: 1,
        repostCount: 0,
        sourceSummaryText: '1 джерело (первинне)',
        sources: [{
          username: msg.channel,
          title: msg.channelTitle,
          weight: msg.authorityWeight,
          timeIso: msg.timeIso,
          timeFormatted,
          text: msg.text,
          telegramUrl,
          isOriginal: true
        }],
        effectiveAuthority: msg.authorityWeight,
        earliestTimestamp: msg.unixTimestamp,
        latestTimestamp: msg.unixTimestamp,
        normalizedText: cleaned
      });
    }
  }

  return clusters;
}

export function __resetTelegramScraperStateForTests(): void {
  lastKnownSuccessfulCycleTs = 0;
  rollingBatchIndex = 0;
  for (const key of Object.keys(telegramCache)) {
    delete telegramCache[key];
  }
  for (const key of Object.keys(channelReaderStates)) {
    delete channelReaderStates[key];
  }
}
