export const History = ({ messages, onClear }) => (
  <div class="card">
    <h3>📜 История сообщений</h3>
    <button onClick={onClear} class="btn-small">Очистить</button>
    <div class="history-list">
      {messages.length === 0 ? (
        <p class="empty">Нет сообщений</p>
      ) : (
        messages.slice().reverse().map((msg, idx) => (
          <div key={idx} class={`history-item ${msg.type}`}>
            <div class="history-title">{msg.title}</div>
            <div class="history-body">{msg.body}</div>
            <div class="history-time">{new Date(msg.time).toLocaleString()}</div>
          </div>
        ))
      )}
    </div>
  </div>
);