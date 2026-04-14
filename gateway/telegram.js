// telegram.js
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'telegram_config.json');

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

// Отправка сообщения в Telegram
async function sendTelegramMessage(espId, text) {
  const espCfg = config[espId];
  if (!espCfg || !espCfg.enabled || !espCfg.botToken || !espCfg.chatId) {
    console.log(`⚠️ Telegram не настроен для ESP ${espId}`);
    return false;
  }

  const url = `https://api.telegram.org/bot${espCfg.botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: espCfg.chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    const result = await response.json();
    if (result.ok) {
      console.log(`📨 Telegram сообщение отправлено для ${espId}`);
      return true;
    } else {
      console.error(`❌ Ошибка Telegram: ${result.description}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Ошибка отправки в Telegram: ${err.message}`);
    return false;
  }
}

// Обновить конфигурацию для ESP
function setTelegramConfig(espId, { enabled, botToken, chatId }) {
  if (!config[espId]) config[espId] = {};
  config[espId].enabled = enabled;
  if (botToken !== undefined) config[espId].botToken = botToken;
  if (chatId !== undefined) config[espId].chatId = chatId;
  saveConfig();
}

function getTelegramConfig(espId) {
  return config[espId] || { enabled: false };
}

loadConfig();

module.exports = {
  sendTelegramMessage,
  setTelegramConfig,
  getTelegramConfig
};