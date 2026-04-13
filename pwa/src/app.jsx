// src/app.jsx
import { useEffect, useState } from 'preact/hooks';
import { ESPSelector } from './components/ESPSelector';
import { connectWebSocket, onMessage } from './websocket';
import { Charts } from './components/Charts';
import { History } from './components/History';
import { Settings } from './components/Settings.jsx'
import './app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('history');
  const [selectedEsp, setSelectedEsp] = useState(null);
  const [espLastData, setEspLastData] = useState(null);
  const [espHistory, setEspHistory] = useState([]);
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

  // Подключение WebSocket
  useEffect(() => {
    connectWebSocket();
    
// Внутри useEffect с onMessage
onMessage((data) => {
  console.log('WS message:', data.type, data);

  if (data.type === 'esp_data_response' && data.espId === selectedEsp) {
    setEspLastData(data.data);
  }
  
if (data.type === 'esp_history' && data.espId === selectedEsp) {
  const history = data.history || [];
  setEspHistory(history);
  
  // Все точки для графиков
  const allPoints = [];
  history.forEach(record => {
    const ts = record.timestamp;
    if (record.tTank !== undefined) allPoints.push({ name: 'Температура бака', value: record.tTank, unit: '°C', time: ts });
    if (record.tTop !== undefined) allPoints.push({ name: 'Температура верха', value: record.tTop, unit: '°C', time: ts });
    if (record.Pressure !== undefined && record.Pressure !== 0) allPoints.push({ name: 'Давление', value: record.Pressure, unit: 'гПа', time: ts });
    if (record.heap !== undefined) allPoints.push({ name: 'Heap (память)', value: record.heap, unit: 'байт', time: ts });
    if (record.rssi !== undefined) allPoints.push({ name: 'RSSI', value: record.rssi, unit: 'dBm', time: ts });
    if (record.W?.PWMDuty !== undefined) allPoints.push({ name: 'Мощность нагревателя', value: record.W.PWMDuty, unit: '%', time: ts });
  });
  setSensorData(allPoints.slice(-200));
  
  // Только alarm для ленты датчиков
const alarmHistory = history.filter(r => r.alarm === 1).map(record => ({
  title: `🚨 ALARM на ${selectedEsp}`,
  body: `tTank=${record.tTank}°C, tTop=${record.tTop}°C, давление=${record.Pressure} гПа`,
  time: record.timestamp,
  type: 'alert'
}));
  setSensorMessages(alarmHistory.slice(-settings.maxHistory));
}
  
  if (data.type === 'esp_data' && data.espId === selectedEsp) {
    setEspLastData(data.data);
    
    // Добавляем точку в график
    setSensorData(prev => [...prev.slice(-199), {
      name: 'Температура бака',
      value: data.data.tTank,
      unit: '°C',
      time: Date.now()
    }]);
    
    // В историю датчиков только если alarm
    if (data.data.alarm === 1) {
      const alarmMessage = {
        title: `🚨 ALARM на ${data.espId}`,
        body: `tTank=${data.data.tTank}°C, tTop=${data.data.tTop}°C, давление=${data.data.Pressure} гПа`,
        time: Date.now(),
        type: 'alert'
      };
      setSensorMessages(prev => [alarmMessage, ...prev].slice(0, settings.maxHistory));
    }
  }
  
  
if (data.type === 'esp_data' && data.espId === selectedEsp) {
  setEspLastData(data.data);
  
  // Добавляем точки для всех датчиков
  const now = Date.now();
  const newPoints = [];
  
  if (data.data.tTank !== undefined) {
    newPoints.push({ name: 'Температура бака', value: data.data.tTank, unit: '°C', time: now });
  }
  if (data.data.tTop !== undefined) {
    newPoints.push({ name: 'Температура верха', value: data.data.tTop, unit: '°C', time: now });
  }
  if (data.data.Pressure !== undefined && data.data.Pressure !== 0) {
    newPoints.push({ name: 'Давление', value: data.data.Pressure, unit: 'гПа', time: now });
  }
  if (data.data.heap !== undefined) {
    newPoints.push({ name: 'Heap (память)', value: data.data.heap, unit: 'байт', time: now });
  }
  if (data.data.rssi !== undefined) {
    newPoints.push({ name: 'RSSI', value: data.data.rssi, unit: 'dBm', time: now });
  }
  if (data.data.W?.PWMDuty !== undefined) {
    newPoints.push({ name: 'Мощность нагревателя', value: data.data.W.PWMDuty, unit: '%', time: now });
  }
  
  setSensorData(prev => [...prev, ...newPoints].slice(-200));
  
  // В историю датчиков добавляем только критическое событие
  if (data.data.alarm === 1) {
    const alarmMessage = {
      title: `🚨 ALARM на ${data.espId}`,
      body: `tTank=${data.data.tTank}°C, tTop=${data.data.tTop}°C, давление=${data.data.Pressure} гПа`,
      time: Date.now(),
      type: 'alert'
    };
    setSensorMessages(prev => [alarmMessage, ...prev].slice(0, settings.maxHistory));
  }
}



});
  }, [selectedEsp]);

  // Обработка выбора ESP
  const handleSelectEsp = (espId) => {
    setSelectedEsp(espId);
  };







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
      //console.log('Получено сообщение от SW:', event.data);

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
        {deferredPrompt && <button onClick={installPWA} class="btn-install">📲 Установить</button>}
      </header>

      {/* Выбор ESP */}
      <ESPSelector selectedEsp={selectedEsp} onSelectEsp={setSelectedEsp} />

      {/* Информация о выбранном ESP */}
      {selectedEsp && espLastData && (
        <div class="esp-info">
          <h3>📊 {selectedEsp}</h3>
          <div class="esp-grid">
            <div class="esp-card"><span class="label">Температура бака</span><span class="value">{espLastData.tTank}°C</span></div>
            <div class="esp-card"><span class="label">Температура верха</span><span class="value">{espLastData.tTop}°C</span></div>
            <div class="esp-card"><span class="label">Heap</span><span class="value">{espLastData.heap} bytes</span></div>
            <div class="esp-card"><span class="label">RSSI</span><span class="value">{espLastData.rssi} dBm</span></div>
            <div class="esp-card"><span class="label">Alarm</span><span class={espLastData.alarm === 1 ? 'alarm' : 'ok'}>{espLastData.alarm === 1 ? '🚨 ACTIVE' : 'OK'}</span></div>
          </div>
        </div>
      )}

      {/* Табы */}
      <div class="tabs">
        <button class={activeTab === 'history' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('history')}>📜 История</button>
        <button class={activeTab === 'charts' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('charts')}>📊 Графики</button>
        <button class={activeTab === 'settings' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('settings')}>⚙️ Настройки</button>
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