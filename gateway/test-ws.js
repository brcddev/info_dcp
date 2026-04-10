#!/usr/bin/env node
// test-ws.js - тестирование WebSocket шлюза

const WebSocket = require('ws');

// Настройки
const WS_URL = 'ws://dcp.pbord.ru/ws';
// const WS_URL = 'ws://localhost:3000/ws'; // для локального теста

let clientId = null;

function connect() {
  console.log(`🔌 Подключение к ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    console.log('✅ WebSocket соединение установлено');
    
    // 1. Отправляем запрос на получение списка ESP
    sendMessage(ws, { type: 'get_all_esp' });
    
    // 2. Через 2 секунды отправляем тестовое сообщение (как PWA)
    setTimeout(() => {
      console.log('\n📤 Запрос данных ESP (пример)');
      sendMessage(ws, { type: 'get_esp_data', espId: 'esp_001' });
    }, 2000);
    
    // 3. Через 4 секунды запрос истории
    setTimeout(() => {
      console.log('\n📤 Запрос истории ESP');
      sendMessage(ws, { type: 'get_esp_history', espId: 'esp_001', limit: 5 });
    }, 4000);
    
    // 4. Эмуляция ESP (только для теста, закомментировано)
     setTimeout(() => {
       console.log('\n🔐 Аутентификация как ESP');
       sendMessage(ws, { type: 'esp_auth', espId: 'test_esp_002' });
     }, 6000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`\n📩 Получено сообщение (${new Date().toLocaleTimeString()}):`);
      console.log(JSON.stringify(message, null, 2));
      
      // Обработка инициализации
      if (message.type === 'init') {
        console.log(`\n📋 Инициализация: получен список ESP (${message.espList?.length || 0} устройств)`);
      }
      
      // ESP подключился
      if (message.type === 'esp_connected') {
        console.log(`\n🟢 ESP ${message.espId} подключился`);
      }
      
      if (message.type === 'esp_data') {
        console.log(`\n📊 Данные от ESP ${message.espId}: tTank=${message.data?.tTank}°C`);
      }
      
    } catch (e) {
      console.log(`\n📩 Получено бинарное сообщение (длина: ${data.length})`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket ошибка:', error.message);
  });
  
  ws.on('close', (code, reason) => {
    console.log(`❌ Соединение закрыто: код ${code}, причина: ${reason || 'нет'}`);
    // Попробуем переподключиться через 5 секунд
    setTimeout(() => {
      console.log('\n🔄 Переподключение...');
      connect();
    }, 5000);
  });
}

function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    console.log(`📤 Отправлено: ${JSON.stringify(message)}`);
  } else {
    console.log('⚠️ Соединение не открыто');
  }
}

// Запуск
connect();

// Поддержка ввода команд в консоли (интерактивный режим)
process.stdin.on('data', (input) => {
  const cmd = input.toString().trim();
  if (cmd === 'exit') {
    process.exit(0);
  }
  console.log(`\n📝 Команда не распознана. Доступные команды: exit`);
});