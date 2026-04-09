import { useEffect, useState } from 'preact/hooks';

export function App() {
  const [status, setStatus] = useState('');

  const testLocalNotification = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification('🔔 Тест', {
        body: 'Если вы видите это уведомление — всё работает!',
        icon: '/icons/pwa-192x192.png',
        vibrate: [200, 100, 200]
      });
      setStatus('✅ Уведомление отправлено!');
    } else {
      setStatus('❌ Service Worker не поддерживается');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Message DCP</h1>
      <button 
        onClick={testLocalNotification}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        🔔 Тест уведомления
      </button>
      <p style={{ marginTop: '20px', color: status.includes('✅') ? 'green' : 'gray' }}>
        {status || 'Нажмите кнопку для теста'}
      </p>
    </div>
  );
}