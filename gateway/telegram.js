// telegram.js
const fetch = require('node-fetch');
const https = require('https');
const { getEspConfig, updateEspConfig } = require('./esp-config');

// Агент для принудительного IPv4
const agent = new https.Agent({
  family: 4,
  rejectUnauthorized: true
});

async function sendTelegramMessage(espId, text) {
  const espCfg = getEspConfig(espId);
  if (!espCfg || !espCfg.telegram || !espCfg.telegram.enabled) {
    return false;
  }
  const { botToken, chatId } = espCfg.telegram;
  if (!botToken || !chatId) {
    console.log(`⚠️ Не указаны botToken или chatId для ESP ${espId}`);
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      }),
      agent: agent
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

function setTelegramConfig(espId, { enabled, botToken, chatId }) {
  const current = getEspConfig(espId) || {};
  const telegram = {
    enabled: enabled !== undefined ? enabled : (current.telegram?.enabled || false),
    botToken: botToken !== undefined ? botToken : (current.telegram?.botToken || ''),
    chatId: chatId !== undefined ? chatId : (current.telegram?.chatId || '')
  };
  updateEspConfig(espId, { telegram });
}

function getTelegramConfig(espId) {
  const cfg = getEspConfig(espId);
  return cfg?.telegram || { enabled: false, botToken: '', chatId: '' };
}

module.exports = {
  sendTelegramMessage,
  setTelegramConfig,
  getTelegramConfig
};