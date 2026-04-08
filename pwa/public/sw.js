// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.notification?.body || 'Сообщение от ESP',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.notification?.title || 'ESP уведомление', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});