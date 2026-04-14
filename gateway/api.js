// api.js
const express = require('express');
const { registerToken, sendFCMNotification } = require('./fcm');
const { getEspData, getEspHistory, getEspList, saveEspData, initEsp } = require('./esp-storage');
const config = require('./config');
const { setTelegramConfig, getTelegramConfig } = require('./telegram');
const { getEspConfig, updateEspConfig, addEsp, deleteEsp, getAllEspConfigs } = require('./esp-config');
const { authenticateUser, generateToken, verifyToken, addUser, getUsers } = require('./auth');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Gateway is running');
});

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

// Получить конфиг всех ESP
router.get('/api/esp/config', (req, res) => {
  res.json(getAllEspConfigs());
});

// Получить конфиг конкретного ESP
router.get('/api/esp/:espId/config', (req, res) => {
  const cfg = getEspConfig(req.params.espId);
  if (!cfg) return res.status(404).json({ error: 'ESP not found' });
  res.json(cfg);
});

// Обновить конфиг ESP
router.put('/api/esp/:espId/config', (req, res) => {
  const { apiKey, displayName, telegram } = req.body;
  updateEspConfig(req.params.espId, { apiKey, displayName, telegram });
  res.json({ success: true });
});

// Добавить нового ESP
router.post('/api/esp', (req, res) => {
  const { espId, apiKey, displayName } = req.body;
  try {
    addEsp(espId, apiKey, displayName);
    initEsp(espId);
    // Создаём пустую запись, чтобы ESP сразу появился в списке
    //saveEspData(espId, { timestamp: Date.now(), initial: true });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Удалить ESP
router.delete('/api/esp/:espId', (req, res) => {
  deleteEsp(req.params.espId);
  res.json({ success: true });
});

// Публичный маршрут для логина
router.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  if (authenticateUser(username, password)) {
    const token = generateToken(username);
    res.json({ success: true, token, username, role: getUsers()[username].role });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Защищённый маршрут для проверки токена (например, при загрузке приложения)
router.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, username: req.user.username, role: req.user.role });
});

// Пример защищённого маршрута для управления ESP (только админ)
router.post('/api/esp', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  // ... добавление ESP
});

// Все остальные маршруты, требующие авторизации, обернуть в verifyToken

// api.js (добавить в конец перед module.exports)

// Смена пароля текущего пользователя
router.post('/api/auth/change-password', verifyToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const username = req.user.username;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing old or new password' });
  }
  // Проверяем старый пароль
  if (!authenticateUser(username, oldPassword)) {
    return res.status(401).json({ error: 'Invalid old password' });
  }
  // Обновляем пароль
  const users = getUsers();
  users[username].password = require('bcrypt').hashSync(newPassword, 10);
  require('fs').writeFileSync(require('path').join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// Получить список пользователей (только админ)
router.get('/api/auth/users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const users = getUsers();
  // Не отправляем хеши паролей
  const safeUsers = Object.entries(users).map(([username, data]) => ({
    username,
    role: data.role
  }));
  res.json(safeUsers);
});

// Создать нового пользователя (только админ)
router.post('/api/auth/users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { username, password, role = 'user' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  try {
    addUser(username, password, role);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Удалить пользователя (только админ, нельзя удалить самого себя)
router.delete('/api/auth/users/:username', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const username = req.params.username;
  if (username === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const users = getUsers();
  if (!users[username]) return res.status(404).json({ error: 'User not found' });
  delete users[username];
  require('fs').writeFileSync(require('path').join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
  res.json({ success: true });
});



// Скачать users.json
router.get('/api/admin/backup/users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const file = path.join(__dirname, 'users.json');
  res.download(file, `users_backup_${Date.now()}.json`);
});

// Скачать esp_config.json
router.get('/api/admin/backup/esp-config', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const file = path.join(__dirname, 'esp_config.json');
  res.download(file, `esp_config_backup_${Date.now()}.json`);
});

// Восстановить из загруженного файла (требует multipart/form-data)
const multer = require('multer');
const upload = multer({ dest: '/tmp/' });
router.post('/api/admin/restore/users', verifyToken, upload.single('file'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const tmpFile = req.file.path;
  const target = path.join(__dirname, 'users.json');
  try {
    // Проверка валидности JSON
    const data = fs.readFileSync(tmpFile, 'utf8');
    JSON.parse(data);
    fs.copyFileSync(tmpFile, target);
    // Перезагружаем модуль auth, чтобы изменения вступили в силу
    delete require.cache[require.resolve('./auth')];
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    fs.unlinkSync(tmpFile);
  }
});
// Аналогично для esp_config.json


module.exports = router;