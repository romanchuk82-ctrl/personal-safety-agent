// Personal Safety Agent Service Worker (iOS 16.4+ & Modern Browsers)
const CACHE_NAME = 'psa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: '⚠️ УВАГА: Локальна небезпека!',
    body: 'Виявлено загрозу поблизу вашої локації. Терміново в безпечне місце!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
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
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    tag: data.tag || 'personal-safety-alert',
    vibrate: [300, 100, 400, 100, 400, 100, 400],
    requireInteraction: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Відкрити мапу/радар' },
      { action: 'dismiss', title: 'Зрозуміло' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
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
