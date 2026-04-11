// src/websocket.js
let ws = null;
let reconnectAttempts = 0;
let messageHandlers = [];
let espListHandlers = [];

export function connectWebSocket() {
  ws = new WebSocket('wss://dcp.pbord.ru/ws');
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    // Запросить список ESP
    sendMessage({ type: 'get_all_esp' });
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('WebSocket message:', data.type);
    
    if (data.type === 'esp_list') {
      espListHandlers.forEach(fn => fn(data.espList));
    }
    
    messageHandlers.forEach(fn => fn(data));
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    setTimeout(() => {
      reconnectAttempts++;
      connectWebSocket();
    }, 3000 * Math.min(reconnectAttempts, 5));
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

export function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function onEspList(callback) {
  espListHandlers.push(callback);
}

export function onMessage(callback) {
  messageHandlers.push(callback);
}

export function getEspData(espId) {
  sendMessage({ type: 'get_esp_data', espId });
}

export function getEspHistory(espId, limit = 100) {
  sendMessage({ type: 'get_esp_history', espId, limit });
}