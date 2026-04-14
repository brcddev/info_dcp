// websocket.js
const WebSocket = require('ws');
const { saveEspData, getEspData, getEspHistory, getEspList, registerEsp } = require('./esp-storage');
const { sendFCMNotification } = require('./fcm');
const { sendTelegramMessage } = require('./telegram');

const wsClients = new Map(); // clientId -> { ws, type, espId, lastSeen }
let nextClientId = 1;

function broadcastToClients(data, excludeTypes = []) {
  const message = JSON.stringify(data);
  for (const [id, client] of wsClients.entries()) {
    if (excludeTypes.includes(client.type)) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function sendToClient(clientId, data) {
  const client = wsClients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
  }
}

function initWebSocketServer(server, path) {
  const wss = new WebSocket.Server({ server, path });
  
  wss.on('connection', (ws, req) => {
    const clientId = nextClientId++;
    const clientIp = req.socket.remoteAddress;
    
    wsClients.set(clientId, {
      ws,
      type: 'unknown',
      espId: null,
      lastSeen: Date.now()
    });
    
    console.log(`🔌 Новое соединение #${clientId} из ${clientIp}`);
    
    // Отправляем текущий список ESP новому клиенту
    ws.send(JSON.stringify({
      type: 'init',
      espList: getEspList()
    }));
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        const client = wsClients.get(clientId);
        client.lastSeen = Date.now();
        
        // ESP аутентификация
        if (message.type === 'esp_auth') {
          client.type = 'esp';
          client.espId = message.espId || `esp_${clientId}`;
          // Регистрируем ESP в хранилище (сразу добавляем в список)
          registerEsp(client.espId);
          
          console.log(`✅ ESP аутентифицирован: ${client.espId} (client #${clientId})`);
          
          ws.send(JSON.stringify({
            type: 'auth_ok',
            message: `ESP ${client.espId} connected`,
            serverTime: Date.now()
          }));
          
          broadcastToClients({
            type: 'esp_connected',
            espId: client.espId,
            timestamp: Date.now()
          }, ['esp']);
        }
        
        // Данные от ESP
        else if (message.msg_type === 'esp_data' && client.type === 'esp') {
          const espId = client.espId;
          const record = saveEspData(espId, message.data);
          
          broadcastToClients({
            type: 'esp_data',
            espId,
            data: record,
            timestamp: Date.now()
          }, ['esp']);
          
          // Отправляем push при alarm
          if (message.data.alarm === 1) {
            await sendFCMNotification(
              '🚨 ESP ALARM!',
              `ESP ${espId}: tTank=${message.data.tTank}°C`,
              'critical',
              espId
            );
            
            const msg = `🚨 <b>ALARM на ${espId}</b>\n🌡️ tTank: ${message.data.tTank}°C\n📊 tTop: ${message.data.tTop}°C\n💾 heap: ${message.data.heap}\n📡 RSSI: ${message.data.rssi} dBm`;
            await sendTelegramMessage(espId, msg);

          }
        }
        
        // Запросы от PWA
        else if (message.type === 'get_esp_data') {
          const data = getEspData(message.espId);
          sendToClient(clientId, {
            type: 'esp_data_response',
            espId: message.espId,
            data: data || null
          });
        }
        
        else if (message.type === 'get_esp_history') {
          const history = getEspHistory(message.espId, message.limit || 100);
          sendToClient(clientId, {
            type: 'esp_history',
            espId: message.espId,
            history
          });
        }
        
        else if (message.type === 'get_all_esp') {
          sendToClient(clientId, {
            type: 'esp_list',
            espList: getEspList()
          });
        }
        
        else if (message.type === 'ping') {
          sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        }
        
      } catch (e) {
        console.error(`❌ Ошибка обработки сообщения от #${clientId}:`, e.message);
      }
    });
    
    ws.on('close', () => {
      const client = wsClients.get(clientId);
      if (client && client.type === 'esp') {
        console.log(`🔌 ESP отключился: ${client.espId}`);
        broadcastToClients({
          type: 'esp_disconnected',
          espId: client.espId,
          timestamp: Date.now()
        }, ['esp']);
      }
      wsClients.delete(clientId);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket ошибка client #${clientId}:`, error.message);
    });
  });
  
  return wss;
}

module.exports = {
  initWebSocketServer,
  broadcastToClients,
  getClientsCount: () => wsClients.size
};