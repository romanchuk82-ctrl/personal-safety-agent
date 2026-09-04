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
  | 'strategic_launch';

export interface ChannelConfig {
  username: string;
  title: string;
  category: ChannelCategory;
  region: string;
  weight: number;
  priority: number; // 1 (highest) to 3
}

export const MONITORED_CHANNELS: ChannelConfig[] = [
  {
    "username": "kpszsu",
    "title": "Командування Повітряних Сил ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 1,
    "priority": 1
  },
  {
    "username": "operativnoZSU",
    "title": "Оперативний ЗСУ (Військові зведення)",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "CinCAFU",
    "title": "Головнокомандувач ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 2
  },
  {
    "username": "GeneralStaffZSU",
    "title": "Генеральний штаб ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 2
  },
  {
    "username": "pivden_mil_ua",
    "title": "Оперативне командування «Південь»",
    "category": "military_official",
    "region": "Південь",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "ok_pivnich",
    "title": "Оперативне командування «Північ»",
    "category": "military_official",
    "region": "Північ",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "StratComUA",
    "title": "СтратКом ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2
  },
  {
    "username": "DPSUkr",
    "title": "Державна прикордонна служба України",
    "category": "military_official",
    "region": "Прикордоння",
    "weight": 0.9,
    "priority": 2
  },
  {
    "username": "AFUStratCom",
    "title": "Стратегічні комунікації ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2
  },
  {
    "username": "landforcesofukraine",
    "title": "Сухопутні війська ЗСУ",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2
  },
  {
    "username": "armyinform_ua",
    "title": "АрміяInform (Офіційне медіа Міноборони)",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 2
  },
  {
    "username": "motuzka_zsu",
    "title": "ППО України / Черговий сектор",
    "category": "military_official",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "vanek_nikolaev",
    "title": "Николаевский Ванёк (Тактичний радар & загрози)",
    "category": "radar_national",
    "region": "Вся Україна / Південь",
    "weight": 0.98,
    "priority": 1
  },
  {
    "username": "monitorwarr",
    "title": "Monitor (Оперативна тактика & Авіація)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "war_monitor",
    "title": "War Monitor (Радар повітряного простору)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "eRadarrua",
    "title": "єРадар (Виявлення цілей, висоти, курси)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "air_alert_ua",
    "title": "Повітряний Простір України",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "chub_inform",
    "title": "ЧУБ Інформ (Пуски ракет & КАБ)",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "deepstateua",
    "title": "DeepState UA (Оперативна інформація)",
    "category": "radar_national",
    "region": "Фронт / Україна",
    "weight": 0.9,
    "priority": 2
  },
  {
    "username": "front1line",
    "title": "Фронт News (Тактична обстановка)",
    "category": "radar_national",
    "region": "Фронт",
    "weight": 0.88,
    "priority": 2
  },
  {
    "username": "uawarinfobot",
    "title": "UA War Radar Bot Channel",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.88,
    "priority": 2
  },
  {
    "username": "liveukraine_media",
    "title": "Live Ukraine Alerts & Radar",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.88,
    "priority": 2
  },
  {
    "username": "oper_radar",
    "title": "Оперативний Радар ППО",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "povitryani_syly",
    "title": "Повітряні Цілі / Радар ППО",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "raketa_radar",
    "title": "Радар Ракет & Шахедів",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "shahed_tracker",
    "title": "Трекер Дронів & Курси БпЛА",
    "category": "radar_national",
    "region": "Вся Україна",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "zoda_gov_ua",
    "title": "Іван Федоров / Запорізька ОВА (КАБ & РСЗВ)",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "zp_now",
    "title": "Запоріжжя Радар (ППО & Загрози)",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "zaporizhzhia_alarm",
    "title": "Запоріжжя Інфо Тактика",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "orikhiv_live",
    "title": "Оріхів / Гуляйполе фронтовий радар",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "vilniansk_info",
    "title": "Вільнянськ / Запорізький р-н Радар",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "kushuhum_radar",
    "title": "Кушугум / Балабине / Південний напрямок",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "baburka_radar",
    "title": "Хортицький р-н / Бабурка Радар",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "shevchik_radar",
    "title": "Шевченківський р-н Запоріжжя Монітор",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "dniproraion_zp",
    "title": "Дніпровський р-н / Правий берег ЗП",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "huliaipole_war",
    "title": "Гуляйпільський напрямок тактична обстановка",
    "category": "tactical_south",
    "region": "Запорізька область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "dnipropetrovskaODA",
    "title": "Сергій Лисак / Дніпропетровська ОВА",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "dnipro_radar",
    "title": "Дніпро Оперативний Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "dnipro_alerts",
    "title": "Дніпро Тактична Обстановка",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "vilkul",
    "title": "Олександр Вілкул / Кривий Ріг Захист",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "kryvyirih_radar",
    "title": "Кривий Ріг Радар ППО",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "nikopol_radar",
    "title": "Нікополь & Марганець (Загрози артобстрілу)",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "pavlohrad_radar",
    "title": "Павлоград Радар & Загрози",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "pavlohrad_live",
    "title": "Павлоград Оперативний / Західний Донбас",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "kamianske_radar",
    "title": "Камʼянське Радар ППО",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 2
  },
  {
    "username": "sinelnikovo_radar",
    "title": "Синельникове / Покровський сектор Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "samar_novomoskovsk",
    "title": "Самар (Новомосковськ) Радар",
    "category": "tactical_east",
    "region": "Дніпропетровська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "synegubov",
    "title": "Олег Синєгубов / Харківська ОВА (КАБ/С-300)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "ihor_terekhov",
    "title": "Ігор Терехов / Мер Харкова (Оперативно)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "kharkiv_radar",
    "title": "Харків Радар (Загрози КАБ & Балістика)",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "saltivka_radar",
    "title": "Салтівка / Північ Харкова Монітор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "alekseevka_kh",
    "title": "Олексіївка / Холодна Гора Радар",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "kupiansk_front",
    "title": "Купʼянськ / Вовчанськ Фронтовий Монітор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "chuhuiv_radar",
    "title": "Чугуїв / Печеніги Радар ППО",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "izium_live",
    "title": "Ізюм / Балаклія Радар",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "derhachi_radar",
    "title": "Дергачі / Золочів прикордонний монітор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "liubotyn_radar",
    "title": "Люботин / Пісочин сектор",
    "category": "tactical_east",
    "region": "Харківська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "odeskaODA",
    "title": "Олег Кіпер / Одеська ОВА",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "our_odessa",
    "title": "Одеса Радар (Дрони & Ракети Чорного моря)",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "odesa_radar",
    "title": "Одеса ППО Монітор",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "poskot_radar",
    "title": "Посьолок Котовського / Пересип Монітор",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "tairova_radar",
    "title": "Таїрова / Фонтан / Чорноморка Радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "chornomorsk_radar",
    "title": "Чорноморськ / Овідіополь Радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "yuzhne_live",
    "title": "Южне / Коблеве прибережний радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "zatoka_radar",
    "title": "Затока / Білгород-Дністровський",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "izmail_radar",
    "title": "Ізмаїл / Рені / Подунавʼя (Дрони)",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "podilsk_radar",
    "title": "Подільськ / Північ Одещини Радар",
    "category": "tactical_south",
    "region": "Одеська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "mykolaivskaODA",
    "title": "Віталій Кім / Миколаївська ОВА",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "senkevichonline",
    "title": "Олександр Сєнкевич / Мер Миколаєва",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "mykolaiv_radar",
    "title": "Миколаїв Радар ППО & Дрони",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "korabelny_nikolaev",
    "title": "Корабельний район Миколаєва Монітор",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "solyani_radar",
    "title": "Соляні / Інгульський / Варварівка",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "ochakiv_radar",
    "title": "Очаків / Куцуруб (Загрози РСЗВ & КАБ)",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "voznesensk_radar",
    "title": "Вознесенськ / Южноукраїнськ Радар",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "bashtanka_radar",
    "title": "Баштанка / Снігурівка сектор",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "pervomaisk_radar",
    "title": "Первомайськ Радар",
    "category": "tactical_south",
    "region": "Миколаївська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "sumskaODA",
    "title": "Сумська ОВА (КАБ & Прикордонні удари)",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "sumy_radar",
    "title": "Суми Радар / Тактика & КАБ",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "sumy_kovpak",
    "title": "Ковпаківський / Зарічний р-ни Суми",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "okhtyrka_radar",
    "title": "Охтирка / Тростянець Радар",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "konotop_radar",
    "title": "Конотоп / Ромни Радар",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "shostka_radar",
    "title": "Шостка / Глухів прикордонний монітор",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "bilopillia_radar",
    "title": "Білопілля / Ворожба тактична обстановка",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "krasnopillia_front",
    "title": "Краснопілля / Велика Писарівка (КАБ & РСЗВ)",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "lebedyn_live",
    "title": "Лебедин / Сумський район",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "krolevets_radar",
    "title": "Кролевець / Путивль сектор",
    "category": "tactical_north",
    "region": "Сумська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "chernigivskaODA",
    "title": "Вʼячеслав Чаус / Чернігівська ОВА",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "chernihiv_radar",
    "title": "Чернігів Радар ППО & Дрони",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "masany_chernihiv",
    "title": "Масани / Подусівка / Бобровиця (Чернігів)",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "nizhyn_radar",
    "title": "Ніжин Радар ППО",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "pryluki_radar",
    "title": "Прилуки / Південь Чернігівщини",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "novhorod_radar",
    "title": "Новгород-Сіверський / Семенівка (КАБ)",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "horodnia_radar",
    "title": "Городня / Корюківка прикордонний монітор",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "kozelets_radar",
    "title": "Козелець / Остер / Київський напрямок",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "mena_live",
    "title": "Мена / Сновськ Радар",
    "category": "tactical_north",
    "region": "Чернігівська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "poltavskaODA",
    "title": "Філіп Пронін / Полтавська ОВА",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "poltava_radar",
    "title": "Полтава Радар ППО & Шахеди",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "poltava_levada",
    "title": "Левада / Алмазний / Сади (Полтава)",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "kremenchuk_radar",
    "title": "Кременчук Радар ППО",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "myrgorod_radar",
    "title": "Миргород (Авіаційний сектор & Ракети)",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "lubny_radar",
    "title": "Лубни / Пирятин Радар",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "horishni_plavni",
    "title": "Горішні Плавні Радар",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "hadiach_radar",
    "title": "Гадяч / Північ Полтавщини",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "kobeliaky_radar",
    "title": "Кобеляки / Решетилівка коридор",
    "category": "tactical_center",
    "region": "Полтавська область",
    "weight": 0.85,
    "priority": 2
  },
  {
    "username": "vitaliyklychko",
    "title": "Віталій Кличко (Мер Києва / Оперативно)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "kievreal1",
    "title": "Київ Інфо (Радар столиці & БпЛА)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "kiev_alerts",
    "title": "Київська ОВА / Руслан Кравченко",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "boryspil_radar",
    "title": "Бориспіль Радар (Аеропорт & Східний коридор)",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.9,
    "priority": 1
  },
  {
    "username": "boryspil_live",
    "title": "Бориспіль Оперативний / Чубинське / Гора",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "brovary_radar",
    "title": "Бровари Радар ППО",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "bucha_live",
    "title": "Буча / Ірпінь / Гостомель Монітор",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2
  },
  {
    "username": "obukhiv_radar",
    "title": "Обухів / Українка / Трипілля Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "bila_tserkva_radar",
    "title": "Біла Церква Радар",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 2
  },
  {
    "username": "vasylkiv_aviation",
    "title": "Васильків / Фастів Авіаційний сектор",
    "category": "tactical_center",
    "region": "Київська область",
    "weight": 0.88,
    "priority": 1
  },
  {
    "username": "crimeanwind",
    "title": "Кримський вітер (Пуски ракет & Шахедів з Криму)",
    "category": "strategic_launch",
    "region": "Крим / Південь",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "blacksea_radar",
    "title": "Чорне Море (Носії крилатих ракет «Калібр»)",
    "category": "strategic_launch",
    "region": "Чорне море",
    "weight": 0.92,
    "priority": 1
  },
  {
    "username": "tu95ms_tracker",
    "title": "Трекер Стратегічної Авіації (ТУ-95МС / ТУ-22М3)",
    "category": "strategic_launch",
    "region": "Стратегічний моніторинг",
    "weight": 0.95,
    "priority": 1
  },
  {
    "username": "belgorod_launches",
    "title": "Бєлгородський напрямок (Пуски балістики & КАБ)",
    "category": "strategic_launch",
    "region": "Прикордонний радар",
    "weight": 0.92,
    "priority": 1
  }
];

export function getPrioritizedChannels(userOblast?: string): ChannelConfig[] {
  if (!userOblast) {
    return MONITORED_CHANNELS;
  }

  const normUserOblast = userOblast.toLowerCase();
  
  return [...MONITORED_CHANNELS].sort((a, b) => {
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
}

const telegramCache: Record<string, ChannelCache> = {};
const TG_CACHE_TTL_MS = 25000;

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

export async function fetchChannelMessages(channel: ChannelConfig): Promise<{ messages: TelegramMessage[]; error?: string }> {
  const now = Date.now();
  const cached = telegramCache[channel.username];

  if (cached && (now - cached.timestamp) < TG_CACHE_TTL_MS) {
    return { messages: cached.messages };
  }

  const targetUrl = `https://t.me/s/${channel.username}`;
  const fetchUrls = [
    targetUrl,
    `https://r.jina.ai/https://t.me/s/${channel.username}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const url of fetchUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

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

        const msgRegex = /<div class="tgme_widget_message_wrap[\s\S]*?<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time datetime="([^"]+)"/g;
        let match;

        while ((match = msgRegex.exec(html)) !== null) {
          const rawText = match[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
          const decodedText = decodeHtmlEntities(rawText);
          const timeIso = match[2];
          const unixTimestamp = new Date(timeIso).getTime();

          const id = `${channel.username}_${unixTimestamp}_${decodedText.slice(0, 15).replace(/\s+/g, '_')}`;

          if (decodedText.length > 3) {
            messages.push({
              id,
              channel: channel.username,
              channelTitle: channel.title,
              authorityWeight: channel.weight,
              text: decodedText,
              timeIso,
              unixTimestamp: isNaN(unixTimestamp) ? Date.now() : unixTimestamp
            });
          }
        }

        if (messages.length === 0 && html.length > 100) {
          const lines = html.split('\n').filter(l => l.trim().length > 10 && !l.startsWith('Title:') && !l.startsWith('URL:'));
          lines.slice(-10).forEach((line, i) => {
            const clean = line.replace(/^[*\s#->]+/, '').trim();
            if (clean.length > 5) {
              messages.push({
                id: `${channel.username}_${now}_${i}`,
                channel: channel.username,
                channelTitle: channel.title,
                authorityWeight: channel.weight,
                text: clean,
                timeIso: new Date().toISOString(),
                unixTimestamp: now - (i * 60000)
              });
            }
          });
        }

        if (messages.length > 0) {
          const recent = messages.slice(-15);
          telegramCache[channel.username] = {
            messages: recent,
            timestamp: now
          };
          return { messages: recent };
        }
      }
    } catch (err) {
      // Try next candidate proxy
    }
  }

  if (cached) return { messages: cached.messages, error: 'Fallback to cache' };
  return { messages: [], error: 'Could not fetch channel' };
}

export async function fetchAllTelegramFeeds(
  userOblast?: string,
  maxParallel: number = 28
): Promise<{ messages: TelegramMessage[]; sourceStatus: Record<string, { ok: boolean; count: number; error?: string }> }> {
  const allMessages: TelegramMessage[] = [];
  const sourceStatus: Record<string, { ok: boolean; count: number; error?: string }> = {};

  const channelsToQuery = getPrioritizedChannels(userOblast).slice(0, maxParallel);

  const results = await Promise.allSettled(
    channelsToQuery.map(ch => fetchChannelMessages(ch))
  );

  results.forEach((res, idx) => {
    const ch = channelsToQuery[idx];
    if (res.status === 'fulfilled') {
      const { messages, error } = res.value;
      allMessages.push(...messages);
      sourceStatus[ch.username] = {
        ok: messages.length > 0,
        count: messages.length,
        error
      };
    } else {
      sourceStatus[ch.username] = {
        ok: false,
        count: 0,
        error: res.reason?.message || 'Rejected'
      };
    }
  });

  allMessages.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

  return { messages: allMessages, sourceStatus };
}

export function getAllMonitoredSources(): ChannelConfig[] {
  return MONITORED_CHANNELS;
}
