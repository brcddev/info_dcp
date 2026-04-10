// config.js
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  ESP_SECRET: process.env.ESP_SECRET || 'your_super_secret_key_123',
  MAX_HISTORY: 500,
  WS_PATH: '/ws'
};