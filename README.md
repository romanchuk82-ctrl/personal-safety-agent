# Personal Safety Agent (Персональний агент локальної безпеки) 🇺🇦

[![iOS Build & Release](https://github.com/romanchuk82-ctrl/personal-safety-agent/actions/workflows/ios-build.yml/badge.svg)](https://github.com/romanchuk82-ctrl/personal-safety-agent/actions/workflows/ios-build.yml)
[![Deploy to GitHub Pages](https://github.com/romanchuk82-ctrl/personal-safety-agent/actions/workflows/deploy.yml/badge.svg)](https://romanchuk82-ctrl.github.io/personal-safety-agent/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/romanchuk82-ctrl/personal-safety-agent)

Єдиний нативний комплекс безпеки для iPhone з цілодобовим автономним 24/7 бекендом:
* **Одна іконка на iPhone** (нативний SwiftUI + WKWebView контейнер).
* **Штатний фоновий трекінг Core Location** при заблокованому екрані та під час руху авто (`activityType = .automotiveNavigation`).
* **Кастомний звук тривоги** `danger_alarm.wav` (сирена + наказ диктора *"Attention! Danger nearby!"*).
* **Пакет Apple Critical Alerts** для пробивання беззвучного режиму.

---

## 📲 Встановлення на iPhone в 1 клік (.IPA)

1. Завантажте готовий файл застосунку:
   👉 [**Завантажити PersonalSafetyAgent.ipa (Остання версія)**](https://github.com/romanchuk82-ctrl/personal-safety-agent/releases/latest/download/PersonalSafetyAgent.ipa)
2. Встановіть через **Sideloadly** (Windows / Mac) або **Scarlet / TrollStore / SideStore** (без комп'ютера).

---

## ⚡ Автономний 24/7 Backend

* **Хмарний деплой за 1 клік**: Натисніть кнопку **Deploy to Render** вгорі або скористайтеся `render.yaml`.
* **Локальний запуск на ПК**:
  * Windows: запуск `scripts\start_backend.ps1` (порт 3001)
  * Linux / macOS: `bash scripts/start_backend.sh`

---

## 🛰 Дослідження системи «Віраж» / «Віраж-Планшет»

### 1. Статус та легальність
- **«Віраж-Планшет»** — це спеціалізований закритий автоматизований комплекс ППО Повітряних Сил ЗСУ.
- **Прямого публічного або відкритого API до системи не існує**. Будь-який несанкціонований доступ або спроби сканування військових мереж є незаконними та несуть загрозу національній безпеці.

### 2. Легальні та надійні відкриті альтернативи
Personal Safety Agent використовує 100% легальний консенсусний пайплайн із 4 незалежних джерел:
1. **Офіційний канал Повітряних Сил ЗСУ (`@kpszsu`)**: Первинне авторизоване джерело траєкторій ракет, БПЛА та тактичної авіації.
2. **Радіолокаційні OSINT-пабліки з мікролокалізацією (`@vanek_nikolaev`, `@monitorwarr`)**: Точні повідомлення рівня мікрорайонів міст (наприклад: *«1х Оболонь»*, *«2х Дарницький р-н»*, *«КАБ у бік Вільнянська / Запорізького району»*).
3. **Офіційний REST API `alerts.in.ua`**: Моніторинг статусу тривог у реальному часі на рівні окремих територіальних громад (`hromada`) та районів (`raion`).
4. **Просторовий та семантичний співставитель (Gazetteer + NLP Classifier)**: Розрахунок відстані формулою Гаверсину від поточних GPS-координат до зафіксованої цілі без використання платних LLM API.

---

## 📱 Встановлення PWA на iPhone (iOS 16.4+)

Для роботи у фоні на замкненому екрані iPhone:
1. Відкрийте сайт у **Safari**.
2. Натисніть кнопку **«Поділитися»** (іконка квадрата зі стрілкою вгору).
3. Виберіть пункт **«На екран Початковий»** (Add to Home Screen).
4. Запустіть додаток з іконки на робочому столі, натисніть **«АКТИВУВАТИ»** та дозвольте сповіщення.

---

## 🛠 Технологічний стек

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Mobile / Audio**: Progressive Web App (PWA), Service Worker, Web Push API (VAPID), Web SpeechSynthesis API, Web Audio API.
- **Backend**: Next.js Serverless Routes, Spatial Haversine Distance Engine, Ukrainian Gazetteer DB.
- **Джерела**: alerts.in.ua API, Telegram OSINT Web Scraping (`@kpszsu`, `@vanek_nikolaev`, `@monitorwarr`).
