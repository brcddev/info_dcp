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
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Данные:', data);
    } catch(e) {
      console.error('[SW] Ошибка парсинга:', e);
    }
  }

  // Извлекаем заголовок и тело
  let title = data.notification?.title || data.title || 'ESP32';
  let body = data.notification?.body || data.body || '';
  let icon = data.icon || data.notification?.icon || '/icons/pwa-192x192.png';
  
  // 🔑 Ключевое: извлекаем channel (может быть в корне или в data)
  let channel = data.channel || data.data?.channel || 'critical';
  
  // Извлекаем sensor (может быть объектом или строкой JSON)
  let sensor = data.sensor || data.data?.sensor || null;
  if (typeof sensor === 'string') {
    try {
      sensor = JSON.parse(sensor);
    } catch(e) {}
  }

  console.log('[SW] Канал:', channel, 'Сенсор:', sensor);

  // Отправляем сообщение клиентам
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const message = {
          type: 'ESP32_MESSAGE',
          title, body, channel, sensor,
          timestamp: Date.now()
        };
        clients.forEach(client => client.postMessage(message));
      })
  );

  // Показываем уведомление только для critical
  if (channel === 'critical') {
    event.waitUntil(
      self.registration.showNotification(title, {
        body, icon, badge: '/icons/pwa-192x192.png',
        vibrate: [200, 100, 200], requireInteraction: true
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