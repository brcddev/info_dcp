// src/components/Backup.jsx
import { useState } from 'preact/hooks';
import { authFetch } from '../api';

export const Backup = () => {
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreType, setRestoreType] = useState('users');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const downloadBackup = async (type) => {
    const res = await authFetch(`/api/admin/backup/${type}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const restoreBackup = async () => {
    if (!restoreFile) return;
    const formData = new FormData();
    formData.append('file', restoreFile);
    try {
      const res = await authFetch(`/api/admin/restore/${restoreType}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Восстановлен ${restoreType}.json`);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка восстановления');
    }
  };

  return (
    <div class="backup">
      <h2>💾 Резервное копирование</h2>
      <div>
        <button onClick={() => downloadBackup('users')}>Скачать users.json</button>
        <button onClick={() => downloadBackup('esp-config')}>Скачать esp_config.json</button>
      </div>
      <h3>Восстановление</h3>
      <select value={restoreType} onChange={e => setRestoreType(e.target.value)}>
        <option value="users">users.json</option>
        <option value="esp-config">esp_config.json</option>
      </select>
      <input type="file" onChange={e => setRestoreFile(e.target.files[0])} />
      <button onClick={restoreBackup} disabled={!restoreFile}>Восстановить</button>
      {message && <p class="success">{message}</p>}
      {error && <p class="error">{error}</p>}
    </div>
  );
};