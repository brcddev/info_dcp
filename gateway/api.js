// api.js
const express = require('express');
const { registerToken } = require('./fcm');
const { getEspData, getEspHistory, getEspList } = require('./esp-storage');
const config = require('./config');

const router = express.Router();

// Регистрация FCM токена
router.post('/api/register-token', (req, res) => {
  const { token } = req.body;
  registerToken(token);
  res.json({ success: true });
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

// api.js - добавить новый endpoint
const { exportHistoryToCSV } = require('./esp-storage');

// Экспорт истории в CSV
router.get('/api/esp/:espId/export', (req, res) => {
  const csvPath = exportHistoryToCSV(req.params.espId);
  if (csvPath) {
    res.download(csvPath);
  } else {
    res.status(404).json({ error: 'No data for this ESP' });
  }
});

// Получить статистику по истории
router.get('/api/esp/:espId/stats', (req, res) => {
  const history = getEspHistory(req.params.espId);
  if (history.length === 0) {
    return res.json({ error: 'No data' });
  }
  
  const temps = history.map(r => r.tTank).filter(v => v > -100);
  const stats = {
    count: history.length,
    tTank: {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((a,b) => a + b, 0) / temps.length,
      last: temps[temps.length - 1]
    },
    period: {
      from: new Date(history[0].timestamp).toISOString(),
      to: new Date(history[history.length - 1].timestamp).toISOString()
    }
  };
  res.json(stats);
});

module.exports = router;