// src/app.jsx
import { useEffect, useState } from 'preact/hooks';
import { Settings } from './components/Settings';
import './app.css';

// Компонент истории (отдельно для critical и sensors)
const History = ({ criticalMessages, sensorMessages, onClearCritical, onClearSensors }) => (
  <div>
    <div class="card">
      <h3>🚨 Критические сообщения</h3>
      <button onClick={onClearCritical} class="btn-small">Очистить</button>
      <div class="history-list">
        {criticalMessages.length === 0 ? (
          <p class="empty">Нет критических сообщений</p>
        ) : (
          criticalMessages.slice().reverse().map((msg, idx) => (
            <div key={idx} class={`history-item ${msg.type}`}>
              <div class="history-title">{msg.title}</div>
              <div class="history-body">{msg.body}</div>
              <div class="history-time">{new Date(msg.time).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
    
    <div class="card">
      <h3>📊 Данные датчиков</h3>
      <button onClick={onClearSensors} class="btn-small">Очистить</button>
      <div class="history-list">
        {sensorMessages.length === 0 ? (
          <p class="empty">Нет данных датчиков</p>
        ) : (
          sensorMessages.slice().reverse().map((msg, idx) => (
            <div key={idx} class="history-item info">
              <div class="history-title">{msg.title}</div>
              <div class="history-body">{msg.body}</div>
              <div class="history-time">{new Date(msg.time).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

// Компонент графиков датчиков
const Charts = ({ sensorData }) => (
  <div class="card">
    <h3>📊 Графики датчиков</h3>
    <div class="sensor-list">
      {sensorData.length === 0 ? (
        <p class="empty">Нет данных датчиков</p>
      ) : (
        sensorData.slice(-20).map((data, idx) => (
          <div key={idx} class="sensor-item">
            <span class="sensor-name">{data.name}</span>
            <span class="sensor-value">{data.value} {data.unit}</span>
            <div class="sensor-bar" style={{ width: `${Math.min(100, data.value / 10)}%` }}></div>
            <div class="sensor-time">{new Date(data.time).toLocaleTimeString()}</div>
          </div>
        ))
      )}
    </div>
  </div>
);

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

  // Загрузка сохранённых данных
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

  // Сохранение данных
  useEffect(() => {
    localStorage.setItem('esp32_critical_messages', JSON.stringify(criticalMessages.slice(-settings.maxHistory)));
    localStorage.setItem('esp32_sensor_messages', JSON.stringify(sensorMessages.slice(-settings.maxHistory)));
    localStorage.setItem('esp32_sensor_data', JSON.stringify(sensorData.slice(-200)));
    localStorage.setItem('esp32_settings', JSON.stringify(settings));
  }, [criticalMessages, sensorMessages, sensorData, settings]);

  // Обновление настроек
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Очистка истории
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

  // Тестовые уведомления
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
    // Отправляем данные датчика через fetch
    fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Датчик температуры',
        body: '22.5°C',
        channel: 'sensors',
        sensor: { name: 'DHT22', value: 22.5, unit: '°C' }
      })
    });
  };

  // Установка PWA
  const installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  // Обработка сообщений от Service Worker
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('Получено сообщение от SW:', event.data);
      
      if (event.data && event.data.type === 'ESP32_MESSAGE') {
        const { title, body, channel, sensor } = event.data;
        
        // Фильтрация (только для critical)
        if (settings.filterAlerts && channel !== 'critical') {
          return;
        }
        
        const newMessage = {
          title,
          body,
          time: Date.now(),
          type: channel === 'critical' ? (title.includes('⚠️') ? 'warning' : 'alert') : 'info'
        };
        
        if (channel === 'critical') {
          setCriticalMessages(prev => [newMessage, ...prev].slice(0, settings.maxHistory));
        } else if (channel === 'sensors') {
          setSensorMessages(prev => [newMessage, ...prev].slice(0, settings.maxHistory));
          
          // Если есть данные датчика
          if (sensor) {
            setSensorData(prev => [...prev, { ...sensor, time: Date.now() }].slice(-200));
          }
        }
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      window.addEventListener('message', handleMessage);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [settings.filterAlerts, settings.maxHistory]);

  // Обработка beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Регистрация Service Worker
  useEffect(() => {
    const initServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker зарегистрирован:', registration);
          
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('Разрешение на уведомления:', permission);
          }
        } catch (error) {
          console.error('Ошибка регистрации SW:', error);
        }
      }
    };
    
    initServiceWorker();
  }, []);

const [tokenStatus, setTokenStatus] = useState('');

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