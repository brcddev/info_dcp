import { useEffect } from 'preact/hooks';
import { registerServiceWorkerAndGetToken, onForegroundMessage } from './firebase-push';

export function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerServiceWorkerAndGetToken();
      onForegroundMessage();
    }
  }, []);

  return <div>Ваше приложение</div>;
}