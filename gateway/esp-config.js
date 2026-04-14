const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'esp_config.json');

let config = {};

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } else {
    config = {};
  }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Проверка API-ключа для ESP
function authenticateEsp(espId, apiKey) {
  const esp = config[espId];
  if (!esp) return false;
  return esp.apiKey === apiKey;
}

// Получить отображаемое имя ESP
function getEspDisplayName(espId) {
  return config[espId]?.displayName || espId;
}

// Получить конфиг ESP (для Telegram и пр.)
function getEspConfig(espId) {
  return config[espId] || null;
}

// Обновить конфиг ESP (через API)
function updateEspConfig(espId, data) {
  if (!config[espId]) config[espId] = {};
  if (data.apiKey !== undefined) config[espId].apiKey = data.apiKey;
  if (data.displayName !== undefined) config[espId].displayName = data.displayName;
  if (data.telegram) {
    config[espId].telegram = {
      ...config[espId].telegram,
      ...data.telegram
    };
  }
  saveConfig();
}

// Добавить нового ESP
function addEsp(espId, apiKey, displayName) {
  if (config[espId]) throw new Error('ESP already exists');
  config[espId] = {
    apiKey,
    displayName: displayName || espId,
    telegram: { enabled: false, botToken: '', chatId: '' }
  };
  saveConfig();
}

// Удалить ESP
function deleteEsp(espId) {
  delete config[espId];
  saveConfig();
}

loadConfig();

module.exports = {
  authenticateEsp,
  getEspDisplayName,
  getEspConfig,
  updateEspConfig,
  addEsp,
  deleteEsp,
  getAllEspConfigs: () => config
};