export const Settings = ({ settings, onUpdate, onTestCritical, onTestSensor, onRegisterToken, tokenStatus }) => (
  <div class="card">
    <h3>⚙️ Настройки</h3>
    <div class="setting-item">
      <label>
        <input type="checkbox" checked={settings.filterAlerts} onChange={(e) => onUpdate('filterAlerts', e.target.checked)} />
        Только критические сообщения
      </label>
    </div>
    <div class="setting-item">
      <label>
        <input type="checkbox" checked={settings.showNotifications} onChange={(e) => onUpdate('showNotifications', e.target.checked)} />
        Показывать уведомления для критических сообщений
      </label>
    </div>
    <div class="setting-item">
      <label>Максимум сообщений в истории: </label>
      <input type="number" min="10" max="200" value={settings.maxHistory} onChange={(e) => onUpdate('maxHistory', parseInt(e.target.value))} />
    </div>
    <div class="setting-buttons">
      <button onClick={onTestCritical} class="btn-critical">🚨 Тест критического</button>
      <button onClick={onTestSensor} class="btn-sensor">📊 Тест датчика</button>
    </div>
    
    {/* Новая кнопка регистрации токена */}
    <div class="setting-divider"></div>
    <h4>🔐 Управление устройством</h4>
    <div class="setting-item">
      <button onClick={onRegisterToken} class="btn-register">
        📱 Зарегистрировать токен
      </button>
      {tokenStatus && <span class="token-status">{tokenStatus}</span>}
    </div>
  </div>
);