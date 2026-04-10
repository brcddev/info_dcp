// src/websocket.js
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

export function connectWebSocket() {
  ws = new WebSocket('wss://dcp.pbord.ru/ws'); // wss:// для HTTPS

  ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    // Подписаться на канал
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'sensors' }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('WebSocket message:', data);
    
    // Отправить в приложение
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'ESP32_MESSAGE',
        ...data
      }
    }));
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    if (reconnectAttempts < maxReconnectAttempts) {
      setTimeout(() => {
        reconnectAttempts++;
        connectWebSocket();
      }, 3000 * reconnectAttempts);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

export function sendWebSocketMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}