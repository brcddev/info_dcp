// public/sw.js
const CACHE_NAME = 'msg-dcp-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Установка');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Активация');
  event.waitUntil(self.clients.claim());
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  console.log('[SW] Push получено');
  
  let title = 'ESP32';
  let body = 'Новое сообщение';
  let icon = '/icons/pwa-192x192.png';
  let channel = 'critical'; // critical или sensors
  let sensor = null;
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Данные:', data);
      title = data.title || data.notification?.title || title;
      body = data.body || data.notification?.body || body;
      icon = data.icon || data.notification?.icon || icon;
      channel = data.channel || data.notification?.channel || 'critical';
      sensor = data.sensor || null;
    } catch (e) {
      body = event.data.text();
    }
  }
  
  // Отправляем сообщение всем открытым клиентам
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const message = { 
          type: 'ESP32_MESSAGE', 
          title, 
          body, 
          channel,
          sensor, 
          timestamp: Date.now() 
        };
        clients.forEach(client => client.postMessage(message));
      })
  );
  
  // Показываем уведомление ТОЛЬКО для critical канала
  if (channel === 'critical') {
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: icon,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: '/', title, body, channel }
      })
    );
  }
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Клик по уведомлению');
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});