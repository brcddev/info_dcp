import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Только ОДНА функция
export async function registerServiceWorkerAndGetToken() {
  try {
    console.log('1. Регистрируем Service Worker...');
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('2. Service Worker зарегистрирован');

    console.log('3. Запрашиваем токен FCM...');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('4. Токен получен:', token);
      
      console.log('5. Отправляем токен на шлюз...');
      const response = await fetch(`${import.meta.env.VITE_GATEWAY_URL}/api/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, device: navigator.userAgent })
      });
      
      if (response.ok) {
        console.log('6. Токен успешно отправлен!');
        alert('✅ Токен зарегистрирован!');
      } else {
        console.error('7. Ошибка отправки:', response.status);
        alert('❌ Ошибка отправки токена');
      }
      return token;
    } else {
      console.error('Токен не получен');
      alert('❌ Не удалось получить токен FCM');
    }
  } catch (err) {
    console.error('Ошибка:', err);
    alert(`Ошибка: ${err.message}`);
  }
}

// Только ОДНА функция для foreground сообщений
export function onForegroundMessage() {
  onMessage(messaging, (payload) => {
    console.log('Уведомление на переднем плане:', payload);
    alert(`${payload.notification?.title || 'Уведомление'}\n${payload.notification?.body || ''}`);
  });
}