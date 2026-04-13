// index.js
const express = require('express');
const cors = require('cors');
const http = require('http');

const config = require('./config');
const apiRouter = require('./api');
const { initWebSocketServer } = require('./websocket');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(apiRouter);

const server = http.createServer(app);

// Инициализация WebSocket
initWebSocketServer(server, config.WS_PATH);

server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║         ESP GATEWAY SERVER STARTED               ║
╠══════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${config.PORT}         ║
║  WebSocket: ws://localhost:${config.PORT}${config.WS_PATH}   ║
║                                                   ║
║  ESP подключение: WebSocket + auth               ║
║  PWA подключение: WebSocket + REST API           ║
╚══════════════════════════════════════════════════╝
  `);
});