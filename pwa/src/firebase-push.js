import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Ваш конфиг из Firebase Console
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Регистрация сервис‑воркера (его создадим чуть позже)
export async function registerServiceWorkerAndGetToken() {
  try {
    // Регистрируем кастомный service worker (не тот, что генерирует vite-plugin-pwa по умолчанию)
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker зарегистрирован');

    // Запрашиваем разрешение и получаем токен FCM
    const token = await getToken(messaging, {
      vapidKey: 'ВАШ_VAPID_ПУБЛИЧНЫЙ_КЛЮЧ',
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('Токен FCM:', token);
      // Отправляем токен на ваш шлюз (чтобы шлюз знал, кому слать уведомления)
      await fetch('https://ваш-шлюз.com/api/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, device: navigator.userAgent })
      });
      return token;
    } else {
      console.error('Не удалось получить токен');
    }
  } catch (err) {
    console.error('Ошибка регистрации push:', err);
  }
}

// Обработка уведомлений, когда приложение открыто
export function onForegroundMessage() {
  onMessage(messaging, (payload) => {
    console.log('Уведомление на переднем плане:', payload);
    // Здесь можно показать своё уведомление (например, через alert или кастомный тост)
    alert(`${payload.notification.title}\n${payload.notification.body}`);
  });
}