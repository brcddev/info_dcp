// telegram-bot.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getEspList, getEspHistory } = require('./esp-storage');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

let bot = null;

// Настройки графиков
const width = 800;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function generateTemperatureGraph(espId, history) {
  if (!history || history.length === 0) return null;
  const labels = history.map(record => moment(record.timestamp).format('HH:mm'));
  const temperatures = history.map(record => record.tTank);
  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${espId} - Температура (°C)`,
        data: temperatures,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: `График температуры для ${espId}` }
      },
      scales: {
        y: { title: { display: true, text: 'Температура (°C)' } },
        x: { title: { display: true, text: 'Время' } }
      }
    }
  };
  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

function formatEspStatus(esp) {
  const lastData = esp.lastData;
  const status = lastData ? 
    `🌡️ Температура: ${lastData.tTank}°C\n💾 Heap: ${lastData.heap}\n📡 RSSI: ${lastData.rssi} dBm` : 
    '📡 Нет данных (ESP не отправлял показания)';
  const online = lastData && (Date.now() - lastData.timestamp < 600000);
  return `*${esp.displayName || esp.id}* ${online ? '✅' : '❌'}\n${status}`;
}

function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN не задан, бот не запущен');
    return;
  }
  bot = new TelegramBot(token, { polling: true });
  console.log('🤖 Telegram бот инициализирован');

  // Обработчики команд
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
      `🤖 *ESP Monitor Bot*\n\n` +
      `Я помогаю отслеживать состояние ваших ESP устройств.\n\n` +
      `Доступные команды:\n` +
      `/status — текущий статус всех ESP\n` +
      `/list — список всех ESP\n` +
      `/history [ESP_ID] — последние 5 показаний\n` +
      `/graph [ESP_ID] — график температуры за последние 6 часов\n` +
      `/help — справка`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
      `📋 *Справка по командам*\n\n` +
      `*/list* — показать все ESP\n` +
      `*/status* — текущий статус всех ESP\n` +
      `*/history* <ID> — последние показания (пример: /history esp_001)\n` +
      `*/graph* <ID> — график температуры (пример: /graph esp_001)`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const espList = getEspList();
    if (espList.length === 0) {
      bot.sendMessage(chatId, '❌ Нет зарегистрированных ESP');
      return;
    }
    let message = '*📡 Список ESP:*\n\n';
    espList.forEach(esp => {
      message += `• *${esp.displayName || esp.id}* (ID: \`${esp.id}\`)\n`;
    });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const espList = getEspList();
    if (espList.length === 0) {
      bot.sendMessage(chatId, '❌ Нет зарегистрированных ESP');
      return;
    }
    let message = '*📊 Статус ESP:*\n\n';
    espList.forEach(esp => {
      message += formatEspStatus(esp) + '\n\n';
    });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/history (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const espId = match[1].trim();
    const history = getEspHistory(espId, 5);
    if (!history || history.length === 0) {
      bot.sendMessage(chatId, `❌ Нет данных для ESP \`${espId}\``, { parse_mode: 'Markdown' });
      return;
    }
    let message = `*📜 История для ${espId}:*\n\n`;
    history.forEach(record => {
      const time = moment(record.timestamp).format('HH:mm:ss DD.MM');
      message += `🕒 ${time} — 🌡️ ${record.tTank}°C, 💾 ${record.heap} байт\n`;
    });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/graph (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const espId = match[1].trim();
    const history = getEspHistory(espId, 36);
    if (!history || history.length < 2) {
      bot.sendMessage(chatId, `❌ Недостаточно данных для построения графика ESP \`${espId}\``, { parse_mode: 'Markdown' });
      return;
    }
    try {
      const imageBuffer = await generateTemperatureGraph(espId, history);
      await bot.sendPhoto(chatId, imageBuffer, { caption: `📈 График температуры для ${espId}`, filename: 'graph.png' });
    } catch (err) {
      console.error('Ошибка генерации графика:', err);
      bot.sendMessage(chatId, '❌ Ошибка при создании графика');
    }
  });

  // Обработка неизвестных сообщений
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;
    bot.sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для списка команд.');
  });
}

module.exports = { initTelegramBot };