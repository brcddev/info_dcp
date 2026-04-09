// src/components/History.jsx
export const History = ({ 
  criticalMessages = [], 
  sensorMessages = [], 
  onClearCritical, 
  onClearSensors 
}) => (
  <div>
    {/* Критические сообщения */}
    <div class="card">
      <h3>🚨 Критические сообщения</h3>
      <button onClick={onClearCritical} class="btn-small">Очистить</button>
      <div class="history-list">
        {criticalMessages.length === 0 ? (
          <p class="empty">Нет критических сообщений</p>
        ) : (
          criticalMessages.slice().reverse().map((msg, idx) => (
            <div key={idx} class={`history-item ${msg.type}`}>
              <div class="history-title">{msg.title}</div>
              <div class="history-body">{msg.body}</div>
              <div class="history-time">{new Date(msg.time).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Данные датчиков */}
    <div class="card">
      <h3>📊 Данные датчиков</h3>
      <button onClick={onClearSensors} class="btn-small">Очистить</button>
      <div class="history-list">
        {sensorMessages.length === 0 ? (
          <p class="empty">Нет данных датчиков</p>
        ) : (
          sensorMessages.slice().reverse().map((msg, idx) => (
            <div key={idx} class="history-item info">
              <div class="history-title">{msg.title}</div>
              <div class="history-body">{msg.body}</div>
              <div class="history-time">{new Date(msg.time).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);