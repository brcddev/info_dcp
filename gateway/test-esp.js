const WebSocket = require('ws');

const ws = new WebSocket('wss://dcp.pbord.ru/ws');

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Аутентификация как ESP
  const authMsg = {
    type: 'esp_auth',
    espId: 'test_esp_001'
  };
  ws.send(JSON.stringify(authMsg));
  console.log('📤 Sent: esp_auth');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('📩 Received:', msg.type);
  
  if (msg.type === 'auth_ok') {
    console.log('✅ ESP authenticated successfully');
    
    // Через 2 секунды отправим тестовые данные
    setTimeout(() => {
      const telemetry = {
        type: 'esp_data',
        data: {
          time: Math.floor(Date.now() / 1000),
          tTank: 23.5,
          tTop: 23.2,
          heap: 29848,
          rssi: -35,
          alarm: 0
        }
      };
      ws.send(JSON.stringify(telemetry));
      console.log('📤 Sent: esp_data');
    }, 2000);
  }
  
  if (msg.type === 'command') {
    console.log('📟 Command from gateway:', msg.command, msg.data);
    // Ответ на команду
    ws.send(JSON.stringify({
      type: 'command_response',
      command: msg.command,
      status: 'ok'
    }));
  }
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', () => {
  console.log('❌ Disconnected');
});