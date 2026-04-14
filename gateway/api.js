// api.js
const express = require('express');
const { registerToken, sendFCMNotification } = require('./fcm');
const { getEspData, getEspHistory, getEspList, saveEspData } = require('./esp-storage');
const config = require('./config');
const { setTelegramConfig, getTelegramConfig } = require('./telegram');

const router = express.Router();

// Регистрация FCM токена
router.post('/api/register-token', (req, res) => {
  const { token } = req.body;
  registerToken(token);
  res.json({ success: true });
});

// Отправка уведомления (push + сохранение данных, если это ESP)
router.post('/api/send', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== config.ESP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, body, channel, sensor, espId } = req.body;

  // Если передан espId, считаем это данными от ESP (сохраняем в историю)
  if (espId && (sensor || title)) {
    const espData = {
      tTank: sensor?.value || 0,
      tTop: sensor?.value || 0,
      heap: 0,
      rssi: 0,
      alarm: channel === 'critical' ? 1 : 0,
      ...(sensor && { [sensor.name]: sensor.value })
    };
    saveEspData(espId, espData);
  }

  // Отправляем FCM уведомление, если есть токены
  const fcmResult = await sendFCMNotification(title, body, channel, espId, sensor);
  res.json({ success: true, results: fcmResult?.responses });
});

// Приём данных от ESP через REST (альтернатива WebSocket)
router.post('/api/esp/data', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== config.ESP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const espId = req.headers['x-esp-id'] || req.body.espId || 'unknown';
  const data = req.body;
  saveEspData(espId, data);
  res.json({ success: true, espId });
});

// Получить список ESP
router.get('/api/esp/list', (req, res) => {
  res.json({ espList: getEspList() });
});

// Получить последние данные ESP
router.get('/api/esp/:espId/last', (req, res) => {
  const data = getEspData(req.params.espId);
  if (!data) return res.status(404).json({ error: 'ESP not found' });
  res.json(data);
});

// Получить историю ESP
router.get('/api/esp/:espId/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const history = getEspHistory(req.params.espId, limit);
  res.json({ espId: req.params.espId, history });
});

// Статистика
router.get('/api/esp/stats', (req, res) => {
  const stats = {};
  const espList = getEspList();
  for (const esp of espList) {
    stats[esp.id] = {
      lastUpdate: esp.lastData?.timestamp,
      tTank: esp.lastData?.tTank,
      heap: esp.lastData?.heap
    };
  }
  res.json(stats);
});


// Получить настройки Telegram для ESP
router.get('/api/esp/:espId/telegram', (req, res) => {
  const cfg = getTelegramConfig(req.params.espId);
  res.json(cfg);
});

// Обновить настройки Telegram для ESP
router.post('/api/esp/:espId/telegram', (req, res) => {
  const { enabled, botToken, chatId } = req.body;
  setTelegramConfig(req.params.espId, { enabled, botToken, chatId });
  res.json({ success: true });
});



module.exports = router;