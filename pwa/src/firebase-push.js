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

export async function registerServiceWorkerAndGetToken() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker зарегистрирован');
console.log('VAPID key:', import.meta.env.VITE_VAPID_PUBLIC_KEY);
console.log('Type:', typeof import.meta.env.VITE_VAPID_PUBLIC_KEY);
console.log('Length:', import.meta.env.VITE_VAPID_PUBLIC_KEY?.length);


    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('Токен FCM:', token);
      await fetch(`${import.meta.env.VITE_GATEWAY_URL}/api/register-token`, {
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

export function onForegroundMessage() {
  onMessage(messaging, (payload) => {
    console.log('Уведомление на переднем плане:', payload);
    alert(`${payload.notification?.title || 'Уведомление'}\n${payload.notification?.body || ''}`);
  });
}