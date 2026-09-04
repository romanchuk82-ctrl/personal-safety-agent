// Personal Safety Agent Service Worker (iOS 16.4+ & PWA)
const CACHE_NAME = 'psa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real Web Push from Server / APNs
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 НЕБЕЗПЕКА ПОРУЧ!',
    body: 'Підтверджено загрозу поблизу вашої локації. Негайно перейдіть в укриття!',
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
    vibrate: [500, 150, 500, 150, 500, 150, 500],
    requireInteraction: true,
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: '🛡️ Відкрити додаток' },
      { action: 'dismiss', title: 'Зрозуміло' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle client messages (e.g. Schedule emergency test for locked iPhone)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_TEST_ALERT') {
    const delayMs = event.data.delayMs || 5000;
    const title = event.data.title || '🚨 ТЕСТОВЕ АВАРІЙНЕ СПОВІЩЕННЯ';
    const body = event.data.body || 'Тестова перевірка каналу сповіщення на замкнений екран пройшла успішно!';
    const voiceText = event.data.voiceText || 'Увага! Тестова перевірка пройшла успішно. Канал аварійного сповіщення активний.';

    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-192x192.png',
        tag: 'emergency-test-alert',
        vibrate: [500, 150, 500, 150, 500],
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

  if (event.action === 'dismiss') {
    return;
  }

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
