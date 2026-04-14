import { useEffect, useState } from 'preact/hooks';
//import { fetchApi, sendApiRequest } from '../api'; // вспомогательные функции
import { authFetch as fetchApi } from '../api';

export const ESPManagement = () => {
  const [espList, setEspList] = useState([]);
  const [editingEsp, setEditingEsp] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Загрузка списка ESP с их конфигами
  useEffect(() => {
    loadEspList();
  }, []);

  const loadEspList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/esp/list'); // получает список с lastData и displayName? Нужно расширить
      const data = await res.json();
      // Загрузим также конфиги для каждого ESP (или объединим в одном запросе)
      const configs = await fetch('/api/esp/config').then(r => r.json());
      const enriched = data.espList.map(esp => ({
        ...esp,
        config: configs[esp.id] || { apiKey: '', displayName: esp.id, telegram: { enabled: false, botToken: '', chatId: '' } }
      }));
      setEspList(enriched);
    } catch (err) {
      console.error('Failed to load ESP list', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (espId) => {
    if (confirm(`Удалить ESP ${espId}?`)) {
      await sendApiRequest(`/api/esp/${espId}`, 'DELETE');
      loadEspList();
    }
  };

  const handleSave = async (espId, data) => {
    await sendApiRequest(`/api/esp/${espId}/config`, 'PUT', data);
    loadEspList();
    setEditingEsp(null);
  };

  const handleAdd = async (newEsp) => {
    await sendApiRequest('/api/esp', 'POST', newEsp);
    loadEspList();
    setShowAddForm(false);
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div class="esp-management">
      <h3>Управление ESP</h3>
      <button onClick={() => setShowAddForm(true)}>➕ Добавить ESP</button>
      {showAddForm && <AddEspForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />}
      <table class="esp-table">
        <thead><tr><th>ID</th><th>Отображаемое имя</th><th>API Key</th><th>Telegram</th><th>Действия</th></tr></thead>
        <tbody>
          {espList.map(esp => (
            <tr key={esp.id}>
              <td>{esp.id}</td>
              <td>{esp.config.displayName}</td>
              <td>••••••••</td>
              <td>{esp.config.telegram?.enabled ? '✅ Вкл' : '❌ Выкл'}</td>
              <td>
                <button onClick={() => setEditingEsp(esp)}>✏️</button>
                <button onClick={() => handleDelete(esp.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editingEsp && <EditEspForm esp={editingEsp} onSave={handleSave} onCancel={() => setEditingEsp(null)} />}
    </div>
  );
};

// Форма добавления ESP
const AddEspForm = ({ onAdd, onCancel }) => {
  const [espId, setEspId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ espId, apiKey, displayName: displayName || espId });
  };

  return (
    <form onSubmit={handleSubmit} class="esp-form">
      <h4>Добавить ESP</h4>
      <input placeholder="ESP ID (уникальный)" value={espId} onChange={e => setEspId(e.target.value)} required />
      <input placeholder="API Key (секретный)" value={apiKey} onChange={e => setApiKey(e.target.value)} required />
      <input placeholder="Отображаемое имя (опционально)" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      <button type="submit">Сохранить</button>
      <button type="button" onClick={onCancel}>Отмена</button>
    </form>
  );
};

// Форма редактирования ESP
const EditEspForm = ({ esp, onSave, onCancel }) => {
  const [displayName, setDisplayName] = useState(esp.config.displayName);
  const [apiKey, setApiKey] = useState(esp.config.apiKey);
  const [telegramEnabled, setTelegramEnabled] = useState(esp.config.telegram?.enabled || false);
  const [botToken, setBotToken] = useState(esp.config.telegram?.botToken || '');
  const [chatId, setChatId] = useState(esp.config.telegram?.chatId || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(esp.id, {
      displayName,
      apiKey,
      telegram: { enabled: telegramEnabled, botToken, chatId }
    });
  };

  return (
    <form onSubmit={handleSubmit} class="esp-form">
      <h4>Редактировать {esp.id}</h4>
      <label>Отображаемое имя:</label>
      <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
      <label>API Key:</label>
      <input value={apiKey} onChange={e => setApiKey(e.target.value)} />
      <label><input type="checkbox" checked={telegramEnabled} onChange={e => setTelegramEnabled(e.target.checked)} /> Включить Telegram уведомления</label>
      {telegramEnabled && (
        <>
          <input placeholder="Bot Token" value={botToken} onChange={e => setBotToken(e.target.value)} />
          <input placeholder="Chat ID" value={chatId} onChange={e => setChatId(e.target.value)} />
        </>
      )}
      <button type="submit">Сохранить</button>
      <button type="button" onClick={onCancel}>Отмена</button>
    </form>
  );
};