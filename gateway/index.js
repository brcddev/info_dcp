require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors());
app.use(express.json());

let fcmTokens = [];

const ESP_SECRET = process.env.ESP_SECRET || 'your_super_secret_key_123';

// Ограничитель количества уведомлений (не более 10 в минуту)
const rateLimit = new Map();

function checkRateLimit(token) {
  const now = Date.now();
  const userLimit = rateLimit.get(token) || [];
  const recent = userLimit.filter(t => now - t < 60000);
  if (recent.length >= 10) return false;
  recent.push(now);
  rateLimit.set(token, recent);
  return true;
}

// Регистрация токена
app.post('/api/register-token', (req, res) => {
  const { token } = req.body;
  if (token && !fcmTokens.includes(token)) {
    fcmTokens.push(token);
    console.log(`✅ Зарегистрирован токен: ${token.substring(0, 30)}...`);
  }
  res.json({ success: true });
});

// Отправка уведомлений
app.post('/api/send', async (req, res) => {
  // Проверка API ключа
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== ESP_SECRET) {
    console.log(`❌ Неавторизованный запрос от ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Проверка лимита
  if (!checkRateLimit(req.ip)) {
    console.log(`⚠️ Лимит превышен для ${req.ip}`);
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  const { title, body, channel, sensor } = req.body;
  
  if (fcmTokens.length === 0) {
    return res.json({ success: false, error: 'No registered tokens' });
  }
  
  // Формируем данные для FCM
  const fcmData = {
    channel: channel || 'critical'
  };
  
  // Если есть данные сенсора — добавляем их (как строку JSON)
  if (sensor && (channel === 'sensors' || sensor.value !== undefined)) {
    fcmData.sensor = JSON.stringify(sensor);
  }
  
  const message = {
    notification: { 
      title: title || (channel === 'sensors' ? '📊 Данные датчика' : 'ESP Alert'), 
      body: body || ''
    },
    data: fcmData,
    tokens: fcmTokens
  };
  
  console.log(`📤 Отправка: channel=${channel}, title=${title}`);
  if (sensor) console.log(`📊 Сенсор: ${sensor.name}=${sensor.value}${sensor.unit}`);
  
  const response = await admin.messaging().sendEachForMulticast(message);
  
  // Удаляем невалидные токены
  const invalidTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(fcmTokens[idx]);
    }
  });
  
  if (invalidTokens.length > 0) {
    fcmTokens = fcmTokens.filter(t => !invalidTokens.includes(t));
    console.log(`🗑️ Удалено ${invalidTokens.length} невалидных токенов`);
  }
  
  res.json({ success: true, results: response.responses });
});

// Получение статистики (опционально)
app.get('/api/stats', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== ESP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ 
    tokens: fcmTokens.length,
    rateLimits: Array.from(rateLimit.keys()).length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gateway on port ${PORT}`));