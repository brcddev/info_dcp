require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const WebSocket = require('ws');
const http = require('http');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' }); // WebSocket на /ws

let fcmTokens = [];
const wsClients = new Set(); // Храним WebSocket клиентов

// --- WebSocket обработчики ---
wss.on('connection', (ws, req) => {
  console.log(`✅ WebSocket клиент подключен: ${req.socket.remoteAddress}`);
  wsClients.add(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Получено от WebSocket:', message);
      
      // Обработка команд от клиента
      if (message.action === 'subscribe') {
        ws.channel = message.channel; // Сохраняем подписку
        ws.send(JSON.stringify({ status: 'ok', message: 'Subscribed to ' + message.channel }));
      }
    } catch (e) {
      console.error('Ошибка парсинга WebSocket сообщения:', e);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket клиент отключен');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket ошибка:', error);
  });
});

// Функция broadcast через WebSocket
function broadcastToWebSocketClients(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// --- Существующие REST API ---
app.post('/api/register-token', (req, res) => {
  const { token } = req.body;
  if (token && !fcmTokens.includes(token)) {
    fcmTokens.push(token);
    console.log(`✅ Зарегистрирован токен: ${token.substring(0, 30)}...`);
  }
  res.json({ success: true });
});

app.post('/api/send', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ESP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, body, channel, sensor } = req.body;
  
  // Отправляем уведомление через WebSocket (в реальном времени)
  broadcastToWebSocketClients({
    type: 'notification',
    title, body, channel, sensor,
    timestamp: Date.now()
  });

  if (fcmTokens.length === 0) {
    return res.json({ success: false, error: 'No registered tokens' });
  }

  const fcmData = { channel: channel || 'critical' };
  if (sensor) fcmData.sensor = JSON.stringify(sensor);

  const message = {
    notification: { title: title || 'ESP Alert', body: body || '' },
    data: fcmData,
    tokens: fcmTokens
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  res.json({ success: true, results: response.responses });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ HTTP сервер на порту ${PORT}`);
  console.log(`✅ WebSocket сервер на ws://dcp.pbord.ru/ws`);
});