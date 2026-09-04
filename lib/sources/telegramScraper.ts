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

export type SourceTier = 'CRITICAL' | 'TACTICAL' | 'REGIONAL' | 'OSINT' | 'CUSTOM';

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
    "priority": 2,
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
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "raketa_radar",
    "title": "Радар Ракет & Шахедів",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "tier": "CRITICAL",
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
    "priority": 2,
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
    "priority": 1,
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "sinelnikovo_radar",
    "title": "Синельникове / Покровський сектор Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "deepstateua",
    "title": "DeepState UA (Оперативна інформація)",
    "category": "radar_national",
    "region": "Фронт / Україна",
    "weight": 0.9,
    "priority": 2,
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
    "priority": 1,
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dnipro_alerts",
    "title": "Дніпро Тактична Обстановка",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "odesa_radar",
    "title": "Одеса ППО Монітор",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "TACTICAL",
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
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "sumy_radar",
    "title": "Суми Радар / Тактика & КАБ",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "senkevichonline",
    "title": "Олександр Сєнкевич / Мер Миколаєва",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.92,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "nizhyn_radar",
    "title": "Ніжин Радар ППО",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "poltava_radar",
    "title": "Полтава Радар ППО & Шахеди",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.9,
    "priority": 1,
    "tier": "TACTICAL",
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
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_ukraine",
    "title": "Труха Украина (Оперативні тривоги & вибухи)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "tier": "OSINT",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_dnepr",
    "title": "Труха Днепр / Павлоград",
    "category": "osint_network",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_nikolaev",
    "title": "Труха Николаев",
    "category": "osint_network",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_poltava",
    "title": "Труха Полтава",
    "category": "osint_network",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "truha_odessa",
    "title": "Труха Одесса",
    "category": "osint_network",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "tlknews",
    "title": "ТЛК Новини (TLK News / Оперативно)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1,
    "tier": "OSINT",
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
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "crimeanwind",
    "title": "Кримський вітер (Пуски ракет & Шахедів з Криму)",
    "category": "strategic_launch",
    "region": "Крим / Південь",
    "weight": 0.92,
    "priority": 1,
    "tier": "TACTICAL",
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
    "priority": 1,
    "tier": "TACTICAL",
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
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "insiderUKR",
    "title": "Инсайдер UA (Оперативні повідомлення)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "Tsaplienko",
    "title": "Андрій Цаплієнко (Оперативні воєнні сповіщення)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dsns_telegram",
    "title": "ДСНС України (Офіційні надзвичайні ситуації та укриття)",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 2,
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
    "priority": 1,
    "tier": "OSINT",
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
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "ssternenko",
    "title": "Сергій Стерненко (Оперативна аналітика та загрози БПЛА)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.93,
    "priority": 1,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kharkiv_1654",
    "title": "Харьков 1654 (КАБи та балістика С-300)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.91,
    "priority": 1,
    "tier": "TACTICAL",
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
    "username": "kievreal1",
    "title": "Київ Інфо (Радар столиці & БпЛА)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kyivmonitoring1",
    "title": "Київ Моніторинг / Радар (Київщина, Бориспіль)",
    "category": "tactical_north",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 1,
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "dnepr_operativ",
    "title": "Дніпро Оперативний (Дніпро & Павлоград)",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.91,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "kyivoperat",
    "title": "Київ Оперативний (Тривоги та загрози)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "boryspil_live",
    "title": "Бориспіль Оперативний / Чубинське / Гора",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "boryspil_radar",
    "title": "Бориспіль Радар (Аеропорт & Східний коридор)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "brovary_radar",
    "title": "Бровари Радар ППО",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1,
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "obukhiv_radar",
    "title": "Обухів / Українка / Трипілля Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1,
    "tier": "TACTICAL",
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
    "tier": "TACTICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "lachentyt",
    "title": "Лачен пише (Ігор Лаченков / Безпека)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "tier": "CRITICAL",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "suspilnenews",
    "title": "Суспільне Новини (Офіційний мовник)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 2,
    "tier": "OSINT",
    "hasWebPreview": true,
    "enabled": true
  },
  {
    "username": "StratComUA",
    "title": "СтратКом ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "motuzka_zsu",
    "title": "ППО України / Черговий сектор",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pivden_mil_ua",
    "title": "Оперативне командування «Південь»",
    "category": "military_official",
    "region": "Південь",
    "weight": 0.95,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "armyinform_ua",
    "title": "АрміяInform (Офіційне медіа Міноборони)",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "chub_inform",
    "title": "ЧУБ Інформ (Пуски ракет & КАБ)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "uawarinfobot",
    "title": "UA War Radar Bot Channel",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "front1line",
    "title": "Фронт News (Тактична обстановка)",
    "category": "radar_national",
    "region": "Фронт",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "oper_radar",
    "title": "Оперативний Радар ППО",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "povitryani_syly",
    "title": "Повітряні Цілі / Радар ППО",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "shahed_tracker",
    "title": "Трекер Дронів & Курси БпЛА",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "zaporizhzhia_alarm",
    "title": "Запоріжжя Інфо Тактика",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "orikhiv_live",
    "title": "Оріхів / Гуляйполе фронтовий радар",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "baburka_radar",
    "title": "Хортицький р-н / Бабурка Радар",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kushuhum_radar",
    "title": "Кушугум / Балабине / Південний напрямок",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "shevchik_radar",
    "title": "Шевченківський р-н Запоріжжя Монітор",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "dniproraion_zp",
    "title": "Дніпровський р-н / Правий берег ЗП",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "huliaipole_war",
    "title": "Гуляйпільський напрямок тактична обстановка",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kryvyirih_radar",
    "title": "Кривий Ріг Радар ППО",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "nikopol_radar",
    "title": "Нікополь & Марганець (Загрози артобстрілу)",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pavlohrad_live",
    "title": "Павлоград Оперативний / Західний Донбас",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pavlohrad_radar",
    "title": "Павлоград Радар & Загрози",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "saltivka_radar",
    "title": "Салтівка / Північ Харкова Монітор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kharkiv_radar",
    "title": "Харків Радар (Загрози КАБ & Балістика)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "alekseevka_kh",
    "title": "Олексіївка / Холодна Гора Радар",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "izium_live",
    "title": "Ізюм / Балаклія Радар",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "derhachi_radar",
    "title": "Дергачі / Золочів прикордонний монітор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kupiansk_front",
    "title": "Купʼянськ / Вовчанськ Фронтовий Монітор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "chuhuiv_radar",
    "title": "Чугуїв / Печеніги Радар ППО",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "poskot_radar",
    "title": "Посьолок Котовського / Пересип Монітор",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "tairova_radar",
    "title": "Таїрова / Фонтан / Чорноморка Радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "liubotyn_radar",
    "title": "Люботин / Пісочин сектор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "zatoka_radar",
    "title": "Затока / Білгород-Дністровський",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "chornomorsk_radar",
    "title": "Чорноморськ / Овідіополь Радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "izmail_radar",
    "title": "Ізмаїл / Рені / Подунавʼя (Дрони)",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "podilsk_radar",
    "title": "Подільськ / Північ Одещини Радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "mykolaiv_radar",
    "title": "Миколаїв Радар ППО & Дрони",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "korabelny_nikolaev",
    "title": "Корабельний район Миколаєва Монітор",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "solyani_radar",
    "title": "Соляні / Інгульський / Варварівка",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "ochakiv_radar",
    "title": "Очаків / Куцуруб (Загрози РСЗВ & КАБ)",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "voznesensk_radar",
    "title": "Вознесенськ / Южноукраїнськ Радар",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "bashtanka_radar",
    "title": "Баштанка / Снігурівка сектор",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pervomaisk_radar",
    "title": "Первомайськ Радар",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "sumskaODA",
    "title": "Сумська ОВА (КАБ & Прикордонні удари)",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.95,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "sumy_kovpak",
    "title": "Ковпаківський / Зарічний р-ни Суми",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "okhtyrka_radar",
    "title": "Охтирка / Тростянець Радар",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "yuzhne_live",
    "title": "Южне / Коблеве прибережний радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "konotop_radar",
    "title": "Конотоп / Ромни Радар",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "shostka_radar",
    "title": "Шостка / Глухів прикордонний монітор",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "krasnopillia_front",
    "title": "Краснопілля / Велика Писарівка (КАБ & РСЗВ)",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "chernihiv_radar",
    "title": "Чернігів Радар ППО & Дрони",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "horodnia_radar",
    "title": "Городня / Корюківка прикордонний монітор",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kozelets_radar",
    "title": "Козелець / Остер / Київський напрямок",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "lebedyn_live",
    "title": "Лебедин / Сумський район",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pryluki_radar",
    "title": "Прилуки / Південь Чернігівщини",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "bilopillia_radar",
    "title": "Білопілля / Ворожба тактична обстановка",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "masany_chernihiv",
    "title": "Масани / Подусівка / Бобровиця (Чернігів)",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "krolevets_radar",
    "title": "Кролевець / Путивль сектор",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "novhorod_radar",
    "title": "Новгород-Сіверський / Семенівка (КАБ)",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kremenchuk_radar",
    "title": "Кременчук Радар ППО",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "tu95ms_tracker",
    "title": "Трекер Стратегічної Авіації (ТУ-95МС / ТУ-22М3)",
    "category": "strategic_launch",
    "region": "Стратегічний моніторинг",
    "weight": 0.95,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kobeliaky_radar",
    "title": "Кобеляки / Решетилівка коридор",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "blacksea_radar",
    "title": "Чорне Море (Носії крилатих ракет «Калібр»)",
    "category": "strategic_launch",
    "region": "Чорне море",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "poltava_levada",
    "title": "Левада / Алмазний / Сади (Полтава)",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "myrgorod_radar",
    "title": "Миргород (Авіаційний сектор & Ракети)",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "belgorod_launches",
    "title": "Бєлгородський напрямок (Пуски балістики & КАБ)",
    "category": "strategic_launch",
    "region": "Прикордонний радар",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "tlk_radar",
    "title": "ТЛК Радар (TLK Radar / Загрози)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "truha_zp",
    "title": "Труха Запорожье",
    "category": "osint_network",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "horishni_plavni",
    "title": "Горішні Плавні Радар",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "hadiach_radar",
    "title": "Гадяч / Північ Полтавщини",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.85,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "lubny_radar",
    "title": "Лубни / Пирятин Радар",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "truha_kharkiv",
    "title": "Труха Харьков (С-300 / КАБ)",
    "category": "osint_network",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "truha_chernigov",
    "title": "Труха Чернигов",
    "category": "osint_network",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "truha_sumy",
    "title": "Труха Сумы",
    "category": "osint_network",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "its_zp",
    "title": "Це Запоріжжя / Новини & Загрози",
    "category": "osint_network",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "war_real4",
    "title": "Реальна Війна (Оперативний моніторинг)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "hueviy_kharkov",
    "title": "Ху*вый Харьков (Прильоти & КАБ)",
    "category": "osint_network",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "chyste_nebo",
    "title": "Чисте Небо (Моніторинг балістики, крилатих ракет & КАБ)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "zaporozhye_radar",
    "title": "Запоріжжя Радар (КАБи та РСЗВ з ТОТ)",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "ePPO_app",
    "title": "єППО Офіційний (КБ Технарі / Розробники «Флюгер»)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.98,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "ePPO_news",
    "title": "єППО Новини & Радарний моніторинг",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "technari_ua",
    "title": "КБ «Технарі» (Розробники єППО та «Флюгер»)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.94,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "suldin_odesa",
    "title": "Геннадій Сульдін (Керівник проєкту єППО / «Флюгер»)",
    "category": "osint_network",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "radar_kyiv",
    "title": "Радар Київ (ППО, Шахеди & Ракети)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kievnow",
    "title": "Київ Зараз (Екстрені сповіщення)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "dtp_kiev",
    "title": "ДТП та Надзвичайні події Києва",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "kiev_alerts",
    "title": "Київська ОВА / Руслан Кравченко",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.95,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "tlk_kyiv",
    "title": "ТЛК Київ (Тривога / Локації / Курси)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.92,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "obolon_live",
    "title": "Оболонь / Куренівка / Мінський Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "poznyaki_live",
    "title": "Дарниця / Позняки / Осокорки Live",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "troeshchina_live",
    "title": "Деснянський / Троєщина Live",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pechersk_monitor",
    "title": "Печерськ / Центр / Поділ Монітор",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "svyatoshin_live",
    "title": "Святошин / Нивки / Академмістечко Live",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "vyshhorod_live",
    "title": "Вишгород / ГЕС / Північний сектор",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "solomianka_radar",
    "title": "Солом'янка / Жуляни Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "bila_tserkva_radar",
    "title": "Біла Церква Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "vasylkiv_aviation",
    "title": "Васильків / Фастів Авіаційний сектор",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "pereyaslav_radar",
    "title": "Переяслав / Яготин / Березань Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "TACTICAL",
    "hasWebPreview": false,
    "enabled": false
  },
  {
    "username": "truha_kyiv",
    "title": "Труха Киев / Борисполь",
    "category": "osint_network",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1,
    "reason": "Немає публічного веб-прев’ю в Telegram",
    "tier": "OSINT",
    "hasWebPreview": false,
    "enabled": false
  }
];

export function getPrioritizedChannels(userOblast?: string, customChannels: ChannelConfig[] = []): ChannelConfig[] {
  const combined = [...customChannels, ...MONITORED_CHANNELS];

  if (!userOblast) {
    return combined;
  }

  const normUserOblast = userOblast.toLowerCase();
  
  return combined.sort((a, b) => {
    if (a.category === 'user_custom' && b.category !== 'user_custom') return -1;
    if (a.category !== 'user_custom' && b.category === 'user_custom') return 1;

    // Prioritize critical tier
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
  error?: string;
}

const telegramCache: Record<string, ChannelCache> = {};
const TG_CACHE_TTL_MS = 45000;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#33;/g, '!')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

export interface ChannelIngestStatus {
  channel: string;
  title: string;
  ok: boolean;
  count: number;
  lastMessageText?: string;
  lastMessageTimeIso?: string;
  lastMessageId?: string;
  lastCheckTimestamp: number;
  error?: string;
  tier?: SourceTier;
  hasWebPreview: boolean;
  statusCategory: 'healthy' | 'unavailable' | 'disabled';
}

export interface TelegramIngestMetrics {
  totalSources: number;
  monitoredSources: number;
  healthyCount: number;
  unavailableCount: number;
  disabledCount: number;
  criticalTotal: number;
  criticalHealthy: number;
  lastSuccessfulCycleTs: number;
  lastRealDataTimestamp: number;
  lastRealDataIso: string | null;
}

let rollingBatchIndex = 0;
let lastKnownSuccessfulCycleTs = 0;

export async function fetchChannelMessages(channel: ChannelConfig): Promise<{ messages: TelegramMessage[]; error?: string }> {
  // If channel is explicitly marked as having no public web preview in Telegram
  if (channel.hasWebPreview === false) {
    return { messages: [], error: channel.reason || 'Немає публічного веб-прев’ю в Telegram' };
  }

  const now = Date.now();
  const cached = telegramCache[channel.username];

  if (cached && (now - cached.timestamp) < TG_CACHE_TTL_MS && cached.messages.length > 0) {
    return { messages: cached.messages };
  }

  const targetUrl = 'https://t.me/s/' + channel.username;
  const isBrowser = typeof window !== 'undefined';
  const fetchUrls: string[] = [];

  if (!isBrowser) {
    fetchUrls.push(targetUrl);
  }
  fetchUrls.push(`https://proxy.cors.sh/${targetUrl}`);
  fetchUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);

  for (const url of fetchUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const messages: TelegramMessage[] = [];

        // Split by Telegram message wrapper blocks for rock-solid parsing
        const blocks = html.split(/<div class="tgme_widget_message_wrap/i);

        for (let i = 1; i < blocks.length; i++) {
          const block = blocks[i];
          const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i);
          const timeMatch = block.match(/<time datetime="([^"]+)"/i);

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

        if (messages.length > 0) {
          const recent = messages.slice(-20);
          telegramCache[channel.username] = {
            messages: recent,
            timestamp: now,
            lastSuccessIso: new Date(now).toISOString()
          };
          return { messages: recent };
        }
      }
    } catch (err) {
      // Try next candidate proxy
    }
  }

  if (cached && cached.messages.length > 0) {
    return { messages: cached.messages, error: 'Кеш (останнє оновлення)' };
  }
  return { messages: [], error: 'Тимчасово не відповідає' };
}

export async function fetchAllTelegramFeeds(
  userOblast?: string,
  _ignoredMaxParallel?: number,
  customChannels: ChannelConfig[] = []
): Promise<{
  messages: TelegramMessage[];
  sourceStatus: Record<string, ChannelIngestStatus>;
  metrics: TelegramIngestMetrics;
}> {
  const allMessagesMap = new Map<string, TelegramMessage>();
  const sourceStatus: Record<string, ChannelIngestStatus> = {};
  const now = Date.now();

  const allAvailable = getPrioritizedChannels(userOblast, customChannels);
  
  // Separate into active channels with web preview and unsupported channels
  const activeChannels = allAvailable.filter(c => c.hasWebPreview !== false && c.enabled !== false);
  const disabledChannels = allAvailable.filter(c => c.hasWebPreview === false || c.enabled === false);

  // Fill status for disabled / no-web-preview channels upfront without wasting network
  disabledChannels.forEach(ch => {
    sourceStatus[ch.username] = {
      channel: ch.username,
      title: ch.title,
      ok: false,
      count: 0,
      lastCheckTimestamp: now,
      error: ch.reason || 'Немає публічного веб-прев’ю в Telegram',
      tier: ch.tier || 'TACTICAL',
      hasWebPreview: false,
      statusCategory: 'disabled'
    };
  });

  // TIERED POLLING ARCHITECTURE:
  // 1. Critical channels (Tier 1: National Radars + Local Oblast Radars) - ALWAYS POLLED EVERY CYCLE
  const criticalChannels = activeChannels.filter(c => c.tier === 'CRITICAL' || (userOblast && (c.region.includes(userOblast) || userOblast.includes(c.region))));
  const criticalUsernames = new Set(criticalChannels.map(c => c.username));

  // 2. Rolling batch from remaining active tactical/OSINT channels
  const remainingActive = activeChannels.filter(c => !criticalUsernames.has(c.username));
  const BATCH_SIZE = 15;
  const startIndex = (rollingBatchIndex * BATCH_SIZE) % Math.max(1, remainingActive.length);
  const selectedBatch = remainingActive.slice(startIndex, startIndex + BATCH_SIZE);
  rollingBatchIndex = (rollingBatchIndex + 1) % Math.max(1, Math.ceil(remainingActive.length / BATCH_SIZE));

  const channelsToQueryThisCycle = [...criticalChannels, ...selectedBatch];

  // Concurrently fetch this cycle's channels (limited to ~25-30 requests, fast & safe)
  const results = await Promise.allSettled(
    channelsToQueryThisCycle.map(ch => fetchChannelMessages(ch))
  );

  results.forEach((res, idx) => {
    const ch = channelsToQueryThisCycle[idx];
    if (res.status === 'fulfilled') {
      const { messages, error } = res.value;
      messages.forEach(m => allMessagesMap.set(m.id, m));
      const latestMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
      const isOk = messages.length > 0;
      sourceStatus[ch.username] = {
        channel: ch.username,
        title: ch.title,
        ok: isOk,
        count: messages.length,
        lastMessageText: latestMsg?.text,
        lastMessageTimeIso: latestMsg?.timeIso,
        lastMessageId: latestMsg?.id,
        lastCheckTimestamp: now,
        error: isOk ? undefined : (error || 'Немає свіжих повідомлень'),
        tier: ch.tier,
        hasWebPreview: true,
        statusCategory: isOk ? 'healthy' : 'unavailable'
      };
    } else {
      sourceStatus[ch.username] = {
        channel: ch.username,
        title: ch.title,
        ok: false,
        count: 0,
        lastCheckTimestamp: now,
        error: res.reason?.message || 'Помилка з’єднання',
        tier: ch.tier,
        hasWebPreview: true,
        statusCategory: 'unavailable'
      };
    }
  });

  // Pull existing cache for channels not queried in this specific micro-cycle
  activeChannels.forEach(ch => {
    if (!sourceStatus[ch.username]) {
      const cached = telegramCache[ch.username];
      if (cached && cached.messages.length > 0) {
        cached.messages.forEach(m => allMessagesMap.set(m.id, m));
        const latestMsg = cached.messages[cached.messages.length - 1];
        sourceStatus[ch.username] = {
          channel: ch.username,
          title: ch.title,
          ok: true,
          count: cached.messages.length,
          lastMessageText: latestMsg?.text,
          lastMessageTimeIso: latestMsg?.timeIso,
          lastMessageId: latestMsg?.id,
          lastCheckTimestamp: cached.timestamp,
          tier: ch.tier,
          hasWebPreview: true,
          statusCategory: 'healthy'
        };
      } else {
        sourceStatus[ch.username] = {
          channel: ch.username,
          title: ch.title,
          ok: false,
          count: 0,
          lastCheckTimestamp: now,
          error: 'Очікує черги опитування',
          tier: ch.tier,
          hasWebPreview: true,
          statusCategory: 'unavailable'
        };
      }
    }
  });

  const allMessages = Array.from(allMessagesMap.values());
  allMessages.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

  // Calculate Metrics
  const healthyCount = Object.values(sourceStatus).filter(s => s.statusCategory === 'healthy').length;
  const unavailableCount = Object.values(sourceStatus).filter(s => s.statusCategory === 'unavailable').length;
  const disabledCount = Object.values(sourceStatus).filter(s => s.statusCategory === 'disabled').length;

  const criticalHealthy = criticalChannels.filter(c => sourceStatus[c.username]?.ok).length;

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
    disabledCount,
    criticalTotal: criticalChannels.length,
    criticalHealthy,
    lastSuccessfulCycleTs: lastKnownSuccessfulCycleTs || now,
    lastRealDataTimestamp: newestMessageTs,
    lastRealDataIso: newestMessageIso
  };

  return { messages: allMessages, sourceStatus, metrics };
}

export function getAllMonitoredSources(): ChannelConfig[] {
  return MONITORED_CHANNELS;
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
