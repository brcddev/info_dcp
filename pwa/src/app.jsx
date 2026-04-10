// src/app.jsx
import { useEffect, useState } from 'preact/hooks';
import { Settings } from './components/Settings';
import { Charts } from './components/Charts';
import { History } from './components/History';
import { connectWebSocket } from './websocket';
import './app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('history');
  const [criticalMessages, setCriticalMessages] = useState([]);
  const [sensorMessages, setSensorMessages] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const [settings, setSettings] = useState({
    filterAlerts: false,
    showNotifications: true,
    maxHistory: 100
  });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [tokenStatus, setTokenStatus] = useState('');

  // ==================== ЗАГРУЗКА СОХРАНЁННЫХ ДАННЫХ ====================
  useEffect(() => {
    const savedCritical = localStorage.getItem('esp32_critical_messages');
    const savedSensors = localStorage.getItem('esp32_sensor_messages');
    const savedSensorData = localStorage.getItem('esp32_sensor_data');
    const savedSettings = localStorage.getItem('esp32_settings');

    if (savedCritical) setCriticalMessages(JSON.parse(savedCritical));
    if (savedSensors) setSensorMessages(JSON.parse(savedSensors));
    if (savedSensorData) setSensorData(JSON.parse(savedSensorData));
    if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
  }, []);
useEffect(() => {
  connectWebSocket();
}, []);
  // ==================== СОХРАНЕНИЕ ДАННЫХ ====================
  useEffect(() => {
    localStorage.setItem('esp32_critical_messages', JSON.stringify(criticalMessages.slice(-settings.maxHistory)));
    localStorage.setItem('esp32_sensor_messages', JSON.stringify(sensorMessages.slice(-settings.maxHistory)));
    localStorage.setItem('esp32_sensor_data', JSON.stringify(sensorData.slice(-200)));
    localStorage.setItem('esp32_settings', JSON.stringify(settings));
  }, [criticalMessages, sensorMessages, sensorData, settings]);

  // ==================== ОБНОВЛЕНИЕ НАСТРОЕК ====================
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // ==================== ОЧИСТКА ИСТОРИИ ====================
  const clearCriticalHistory = () => {
    setCriticalMessages([]);
    localStorage.removeItem('esp32_critical_messages');
  };

  const clearSensorsHistory = () => {
    setSensorMessages([]);
    localStorage.removeItem('esp32_sensor_messages');
    setSensorData([]);
    localStorage.removeItem('esp32_sensor_data');
  };

  // ==================== ТЕСТОВЫЕ УВЕДОМЛЕНИЯ (локальные) ====================
  const testCritical = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification('🚨 ТЕСТ КРИТИЧЕСКИЙ', {
          body: 'Это тестовое критическое сообщение!',
          icon: '/icons/pwa-192x192.png'
        });
      });
    }
  };

  const testSensor = () => {
    // Локальная имитация данных датчика (без отправки на сервер)
    const mockSensorData = {
      title: 'Датчик температуры',
      body: '22.5°C',
      channel: 'sensors',
      sensor: { name: 'DHT22', value: 22.5, unit: '°C' }
    };
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'ESP32_MESSAGE',
        title: mockSensorData.title,
        body: mockSensorData.body,
        channel: mockSensorData.channel,
        sensor: mockSensorData.sensor,
        timestamp: Date.now()
      }
    }));
  };

  // (Опционально) Реальная отправка на сервер – можно добавить отдельную кнопку
  const testSensorReal = () => {
    fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': import.meta.env.VITE_API_KEY
      },
      body: JSON.stringify({
        title: 'Датчик температуры',
        body: '22.5°C',
        channel: 'sensors',
        sensor: { name: 'DHT22', value: 22.5, unit: '°C' }
      })
    });
  };

  // ==================== УСТАНОВКА PWA ====================
  const installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  // ==================== РЕГИСТРАЦИЯ ТОКЕНА ====================
  const registerToken = async () => {
    setTokenStatus('Регистрация...');
    try {
      if (!('serviceWorker' in navigator)) {
        setTokenStatus('❌ Service Worker не поддерживается');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      console.log('SW готов:', registration);

      const { registerServiceWorkerAndGetToken } = await import('./firebase-push.js');
      const token = await registerServiceWorkerAndGetToken();

      if (token) {
        setTokenStatus('✅ Токен зарегистрирован!');
        const response = await fetch('/api/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        if (response.ok) {
          setTokenStatus('✅ Токен отправлен на сервер!');
        }
      } else {
        setTokenStatus('❌ Не удалось получить токен');
      }
    } catch (error) {
      console.error(error);
      setTokenStatus(`❌ Ошибка: ${error.message}`);
    }
    setTimeout(() => setTokenStatus(''), 5000);
  };

  // ==================== АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ ТОКЕНА ====================
  useEffect(() => {
    // Регистрируем Service Worker и запрашиваем разрешение
    const init = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker зарегистрирован:', registration);
        } catch (error) {
          console.error('Ошибка регистрации SW:', error);
        }
      }
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Разрешение на уведомления:', permission);
      }
    };
    init();
  }, []);

  // Автоматическая регистрация токена при старте (если уведомления разрешены)
  useEffect(() => {
    if (Notification.permission === 'granted') {
      registerToken();
    }
  }, []); // пустой массив – один раз при монтировании

  // Перерегистрация токена при фокусе окна (на случай, если токен изменился)
  useEffect(() => {
    const handleFocus = () => {
      if (Notification.permission === 'granted') {
        registerToken();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // ==================== ОБРАБОТЧИК СООБЩЕНИЙ ОТ SERVICE WORKER ====================
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('Получено сообщение от SW:', event.data);

      if (event.data && event.data.type === 'ESP32_MESSAGE') {
        let { title, body, channel, sensor } = event.data;

        // Коррекция: если есть sensor, но channel не sensors
        if (sensor && channel !== 'sensors') {
          console.log('Корректируем канал: было', channel, 'стало sensors');
          channel = 'sensors';
        }

        console.log('Итоговый channel:', channel);

        if (settings.filterAlerts && channel !== 'critical') return;

        const newMessage = {
          title, body,
          time: Date.now(),
          type: channel === 'critical' ? (title.includes('⚠️') ? 'warning' : 'alert') : 'info'
        };

        if (channel === 'critical') {
          setCriticalMessages(prev => [newMessage, ...prev].slice(0, settings.maxHistory));
        } else if (channel === 'sensors') {
          setSensorMessages(prev => [newMessage, ...prev].slice(0, settings.maxHistory));
          
          if (sensor) {
            // sensor уже объект с полями name, value, unit
            setSensorData(prev => [...prev, { 
              name: sensor.name || title,
              value: typeof sensor.value === 'number' ? sensor.value : parseFloat(sensor.value),
              unit: sensor.unit || '',
              time: Date.now() 
            }].slice(-200));
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    window.addEventListener('message', handleMessage);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [settings.filterAlerts, settings.maxHistory]);

  // ==================== BEFOREINSTALLPROMPT (УСТАНОВКА PWA) ====================
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ==================== RENDER ====================
  return (
    <div class="app">
      <header>
        <h1>📱 Message DCP</h1>
        <p>ESP32 Мониторинг</p>
        {deferredPrompt && (
          <button onClick={installPWA} class="btn-install">
            📲 Установить
          </button>
        )}
      </header>

      <div class="tabs">
        <button class={activeTab === 'history' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('history')}>
          📜 История
        </button>
        <button class={activeTab === 'charts' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('charts')}>
          📊 Графики
        </button>
        <button class={activeTab === 'settings' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('settings')}>
          ⚙️ Настройки
        </button>
      </div>

      <div class="content">
        {activeTab === 'history' && (
          <History
            criticalMessages={criticalMessages}
            sensorMessages={sensorMessages}
            onClearCritical={clearCriticalHistory}
            onClearSensors={clearSensorsHistory}
          />
        )}
        {activeTab === 'charts' && (
          <Charts sensorData={sensorData} />
        )}
        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            onUpdate={updateSetting}
            onTestCritical={testCritical}
            onTestSensor={testSensor}
            onRegisterToken={registerToken}
            tokenStatus={tokenStatus}
          />
        )}
      </div>

      <footer>
        <p>🚨 Критических: {criticalMessages.length} | 📊 Данных: {sensorData.length}</p>
      </footer>
    </div>
  );
}