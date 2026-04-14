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
////////////////////////////////////////////
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

  // Извлекаем данные (поддерживаем оба формата)
  let title = data.notification?.title || data.title || 'ESP32';
  let body = data.notification?.body || data.body || '';
  let channel = data.data?.channel || data.channel || 'critical';
  let sensor = data.data?.sensor || data.sensor || null;
  
  if (typeof sensor === 'string') {
    try {
      sensor = JSON.parse(sensor);
    } catch(e) {}
  }

  console.log('[SW] Канал:', channel, 'Сенсор:', sensor);

  // Отправляем ВСЕМ клиентам
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const message = {
          type: 'ESP32_MESSAGE',
          title: title,
          body: body,
          channel: channel,
          sensor: sensor,
          timestamp: Date.now()
        };
        console.log('[SW] Отправка клиентам:', message);
        clients.forEach(client => client.postMessage(message));
      })
  );

  // Показываем уведомление только для critical
  if (channel === 'critical') {
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: 'icons/pwa-192x192.png'
      })
    );
  }
});
////////////////////////////////////////////

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Клик по уведомлению');
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});