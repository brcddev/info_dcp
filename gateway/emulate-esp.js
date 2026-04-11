#!/usr/bin/env node
// esp-emulator.js - Эмулятор ESP для тестирования шлюза и PWA

const WebSocket = require('ws');

// ========== КОНФИГУРАЦИЯ ==========
const WS_URL = 'wss://dcp.pbord.ru/ws';      // Адрес шлюза
// const WS_URL = 'ws://localhost:3000/ws';  // Для локального теста
const ESP_ID = 'esp_emulator_01';             // Уникальный ID ESP
const SEND_INTERVAL_MS = 5000;                // Интервал отправки данных (мс)
const USE_RANDOM_VALUES = true;               // Случайные значения или тренд
// ===================================

let ws = null;
let isAuthenticated = false;
let telemetryInterval = null;

// Текущие значения (для трендового режима)
let currentTankTemp = 45.0;
let currentTopTemp = 44.5;
let currentPressure = 1013.2;
let currentHumidity = 55.0;
let currentHeaterPower = 0;      // 0..100
let currentFlow = 0.0;

// Генерация случайных значений с нормальным распределением
function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + stdDev * z;
}

// Обновление показателей (реалистичное изменение)
function updateTelemetry() {
  if (USE_RANDOM_VALUES) {
    // Случайные значения с небольшими отклонениями
    currentTankTemp = Math.max(20, Math.min(80, currentTankTemp + (Math.random() - 0.5) * 0.3));
    currentTopTemp = Math.max(18, Math.min(78, currentTopTemp + (Math.random() - 0.5) * 0.3));
    currentPressure = Math.max(980, Math.min(1050, currentPressure + (Math.random() - 0.5) * 2));
    currentHumidity = Math.max(20, Math.min(90, currentHumidity + (Math.random() - 0.5) * 1.5));
    currentHeaterPower = Math.max(0, Math.min(100, currentHeaterPower + (Math.random() - 0.5) * 5));
    currentFlow = Math.max(0, Math.min(50, currentFlow + (Math.random() - 0.5) * 2));
  } else {
    // Трендовый режим: имитация нагрева/охлаждения
    if (currentTankTemp < 50 && currentHeaterPower > 30) {
      currentTankTemp += 0.2;
      currentTopTemp += 0.15;
    } else if (currentTankTemp > 40 && currentHeaterPower < 20) {
      currentTankTemp -= 0.15;
      currentTopTemp -= 0.12;
    }
    // Случайное изменение мощности нагревателя
    currentHeaterPower += (Math.random() - 0.5) * 8;
    currentHeaterPower = Math.max(0, Math.min(100, currentHeaterPower));
    currentFlow = Math.max(0, Math.min(50, currentFlow + (Math.random() - 0.5) * 1));
  }
}

// Формирование JSON-пакета данных ESP
function buildTelemetryPacket() {
  updateTelemetry();
  
  const packet = {
    time: Math.floor(Date.now() / 1000),
    Emul: true,
    wake_up: false,
    rssi: Math.floor(randomNormal(-45, 10)),        // -60..-30 dBm
    alarm: (currentTankTemp > 70 || currentPressure < 990) ? 1 : 0,
    missing_sensors: 0,
    mode: 4,
    proc: Math.floor(Math.random() * 10),
    old_proc: 0,
    steps_crc: 2403,
    heap: Math.floor(randomNormal(28000, 2000)),
    uptime: Math.floor(Date.now() / 1000) - 1700000000,
    mash_pump: currentFlow > 10,
    timer_rect: 0,
    tTank: parseFloat(currentTankTemp.toFixed(2)),
    tTube: -127.00,
    tTube20: -127.00,
    tTop: parseFloat(currentTopTemp.toFixed(2)),
    tDef: -127.00,
    tIn: -127.00,
    tOut: -127.00,
    tOut2: -127.00,
    tSys: 0.00,
    tStab: 55.00,
    Pressure: parseFloat(currentPressure.toFixed(2)),
    abv_tank: 0,
    Hpoint: 1023,
    PZEM: { State: false },
    Energy: "nan",
    PW_curr: "nan",
    PW_order: 0,
    PW_total: 0,
    PW_int: 0,
    PW_int_p: 0.00,
    PW_int_pr: "nan",
    PW_ext: 0,
    V_order: 0,
    V_in: 220.00,
    V_out: 0,
    RM: { State: false },
    W: {
      State: currentHeaterPower > 10,
      PWM: true,
      PWMAuto: true,
      PWMDuty: Math.floor(currentHeaterPower),
      PWMDuty2: 0,
      Flow_min: currentFlow.toFixed(2),
      Flow_tot: (Math.random() * 100).toFixed(2)
    },
    CurFreq: 0,
    proc_time: Date.now() - 1000000,
    mode_time: Date.now() - 500000
  };
  return packet;
}

// Отправка данных
function sendTelemetry() {
  if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
    console.log('⚠️ Не отправлено: соединение не готово');
    return;
  }
  const packet = buildTelemetryPacket();
  const message = {
    type: 'esp_data',
    data: packet
  };
  ws.send(JSON.stringify(message));
  console.log(`📤 Отправлено: tTank=${packet.tTank}°C, tTop=${packet.tTop}°C, Alarm=${packet.alarm}, Heater=${packet.W.PWMDuty}%`);
}

// Обработка входящих команд от шлюза (для будущих функций)
function handleCommand(cmd) {
  console.log(`📟 Получена команда: ${cmd.command}`, cmd.data);
  // Здесь можно реализовать ответ на команду
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'command_response',
      command: cmd.command,
      status: 'ok',
      result: { echo: cmd.data }
    }));
  }
}

// WebSocket соединение
function connect() {
  console.log(`🔌 Подключение к ${WS_URL}...`);
  ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    console.log('✅ WebSocket соединение установлено');
    // Аутентификация как ESP
    const authMsg = {
      type: 'esp_auth',
      espId: ESP_ID
    };
    ws.send(JSON.stringify(authMsg));
    console.log(`🔐 Отправлена аутентификация для ${ESP_ID}`);
  });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      console.log(`📩 Получено: ${msg.type}`);
      
      if (msg.type === 'auth_ok') {
        console.log('✅ ESP аутентифицирован успешно');
        isAuthenticated = true;
        // Запускаем периодическую отправку телеметрии
        if (telemetryInterval) clearInterval(telemetryInterval);
        telemetryInterval = setInterval(sendTelemetry, SEND_INTERVAL_MS);
        console.log(`📡 Отправка данных каждые ${SEND_INTERVAL_MS/1000} секунд`);
      }
      
      if (msg.type === 'command') {
        handleCommand(msg);
      }
      
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (e) {
      console.error('Ошибка парсинга сообщения:', e.message);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket ошибка:', error.message);
  });
  
  ws.on('close', (code, reason) => {
    console.log(`❌ Соединение закрыто: ${code} - ${reason || 'нет причины'}`);
    isAuthenticated = false;
    if (telemetryInterval) clearInterval(telemetryInterval);
    // Попытка переподключения через 5 секунд
    setTimeout(() => {
      console.log('🔄 Переподключение...');
      connect();
    }, 5000);
  });
}

// Обработка завершения процесса (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n🛑 Завершение работы эмулятора...');
  if (telemetryInterval) clearInterval(telemetryInterval);
  if (ws) ws.close();
  process.exit(0);
});

// Старт
console.log(`
╔══════════════════════════════════════════════════════╗
║          ESP Emulator for Gateway Testing            ║
╠══════════════════════════════════════════════════════╣
║  ESP ID: ${ESP_ID}
║  URL: ${WS_URL}
║  Interval: ${SEND_INTERVAL_MS/1000} sec
║  Random mode: ${USE_RANDOM_VALUES ? 'ON' : 'TREND'}
╚══════════════════════════════════════════════════════╝
`);
connect();