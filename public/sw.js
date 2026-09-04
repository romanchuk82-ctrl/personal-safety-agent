// Personal Safety Agent Service Worker (Ajax-style voice notification support)
const CACHE_NAME = 'psa-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Web Push event from server
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 УВАГА: Локальна небезпека!',
    body: 'Пройдіть в укриття. Зафіксовано загрозу поблизу вашого району.',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-192x192.png',
    tag: 'personal-safety-alert',
    data: {}
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed.notification) {
        data = { ...data, ...parsed.notification };
      } else {
        data = { ...data, ...parsed };
      }
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './icons/icon-192x192.png',
    badge: data.badge || './icons/icon-192x192.png',
    tag: data.tag || 'personal-safety-alert',
    sound: 'default',
    vibrate: [400, 200, 400, 200, 400],
    requireInteraction: true,
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: '🛡️ Відкрити додаток' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle scheduled test notification for locked iPhone
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_TEST_ALERT') {
    const delayMs = event.data.delayMs || 5000;
    const title = event.data.title || '🚨 ТЕСТОВЕ ГОЛОСОВЕ СПОВІЩЕННЯ';
    const body = event.data.body || 'Кириле, сповіщення на замкнений екран надійшло успішно!';
    const voiceText = event.data.voiceText || 'Увага! Тестове сповіщення системи безпеки. Голосовий супровід активний.';

    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-192x192.png',
        tag: 'emergency-test-alert',
        sound: 'default',
        vibrate: [400, 200, 400, 200, 400],
        requireInteraction: true,
        renotify: true,
        data: {
          url: './',
          voiceText: voiceText,
          isTest: true
        },
        actions: [
          { action: 'open', title: '🛡️ Перевірити' }
        ]
      });
    }, delayMs);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('personal-safety-agent') || client.url.includes(urlToOpen)) {
          if (event.notification.data && event.notification.data.voiceText) {
            client.postMessage({
              type: 'TRIGGER_VOICE_ALERT',
              voiceText: event.notification.data.voiceText
            });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
