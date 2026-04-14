// src/components/ESPManagement.jsx
import { useEffect, useState } from 'preact/hooks';
import { authFetch } from '../api';

export const ESPManagement = () => {
  const [espList, setEspList] = useState([]);
  const [newEspId, setNewEspId] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [editingEsp, setEditingEsp] = useState(null);
  const [editApiKey, setEditApiKey] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editTelegramEnabled, setEditTelegramEnabled] = useState(false);
  const [editTelegramBotToken, setEditTelegramBotToken] = useState('');
  const [editTelegramChatId, setEditTelegramChatId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEspList = async () => {
    try {
      const res = await authFetch('/api/esp/list');
      const data = await res.json();
      setEspList(data.espList || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadEspList();
  }, []);

  const addEsp = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/esp', {
        method: 'POST',
        body: JSON.stringify({ espId: newEspId, apiKey: newApiKey, displayName: newDisplayName })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`ESP ${newEspId} добавлен`);
        setNewEspId('');
        setNewApiKey('');
        setNewDisplayName('');
        loadEspList();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  const deleteEsp = async (espId) => {
    if (!confirm(`Удалить ESP ${espId}?`)) return;
    try {
      const res = await authFetch(`/api/esp/${espId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage(`ESP ${espId} удалён`);
        loadEspList();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  const startEdit = (esp) => {
    setEditingEsp(esp.id);
    setEditApiKey(esp.apiKey || '');
    setEditDisplayName(esp.displayName || '');
    // загрузить настройки Telegram
    authFetch(`/api/esp/${esp.id}/telegram`)
      .then(res => res.json())
      .then(cfg => {
        setEditTelegramEnabled(cfg.enabled || false);
        setEditTelegramBotToken(cfg.botToken || '');
        setEditTelegramChatId(cfg.chatId || '');
      });
  };

  const saveEdit = async (espId) => {
    try {
      // обновить конфиг ESP
      await authFetch(`/api/esp/${espId}/config`, {
        method: 'PUT',
        body: JSON.stringify({ apiKey: editApiKey, displayName: editDisplayName })
      });
      // обновить настройки Telegram
      await authFetch(`/api/esp/${espId}/telegram`, {
        method: 'POST',
        body: JSON.stringify({ enabled: editTelegramEnabled, botToken: editTelegramBotToken, chatId: editTelegramChatId })
      });
      setMessage(`ESP ${espId} обновлён`);
      setEditingEsp(null);
      loadEspList();
    } catch (err) {
      setError('Ошибка обновления');
    }
  };

  return (
    <div class="esp-management">
      <h2>📡 Управление ESP</h2>
      <form onSubmit={addEsp}>
        <input type="text" placeholder="ID ESP (например, esp_001)" value={newEspId} onInput={e => setNewEspId(e.target.value)} required />
        <input type="text" placeholder="API Key" value={newApiKey} onInput={e => setNewApiKey(e.target.value)} required />
        <input type="text" placeholder="Отображаемое имя" value={newDisplayName} onInput={e => setNewDisplayName(e.target.value)} />
        <button type="submit">Добавить</button>
      </form>
      {message && <p class="success">{message}</p>}
      {error && <p class="error">{error}</p>}
      <table>
        <thead>
          <tr><th>ID</th><th>Имя</th><th>API Key</th><th>Telegram</th><th></th></tr>
        </thead>
        <tbody>
          {espList.map(esp => (
            <tr key={esp.id}>
              {editingEsp === esp.id ? (
                <>
                  <td>{esp.id}</td>
                  <td><input value={editDisplayName} onInput={e => setEditDisplayName(e.target.value)} /></td>
                  <td><input value={editApiKey} onInput={e => setEditApiKey(e.target.value)} /></td>
                  <td>
                    <label><input type="checkbox" checked={editTelegramEnabled} onChange={e => setEditTelegramEnabled(e.target.checked)} /> Вкл</label>
                    <input placeholder="Bot Token" value={editTelegramBotToken} onInput={e => setEditTelegramBotToken(e.target.value)} />
                    <input placeholder="Chat ID" value={editTelegramChatId} onInput={e => setEditTelegramChatId(e.target.value)} />
                  </td>
                  <td><button onClick={() => saveEdit(esp.id)}>Сохранить</button><button onClick={() => setEditingEsp(null)}>Отмена</button></td>
                </>
              ) : (
                <>
                  <td>{esp.id}</td>
                  <td>{esp.displayName || esp.id}</td>
                  <td>••••••••</td>
                  <td>{esp.telegram?.enabled ? '✅' : '❌'}</td>
                  <td><button onClick={() => startEdit(esp)}>✏️</button><button onClick={() => deleteEsp(esp.id)}>🗑️</button></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};