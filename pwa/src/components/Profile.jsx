// src/components/Profile.jsx
import { useState } from 'preact/hooks';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../api';

export const Profile = () => {
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Пароль успешно изменён');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => logout(), 2000); // через 2 секунды выйти
      } else {
        setError(data.error || 'Ошибка смены пароля');
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  return (
    <div class="profile">
      <h2>👤 Профиль пользователя: {user?.username}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Старый пароль</label>
          <input type="password" value={oldPassword} onInput={e => setOldPassword(e.target.value)} required />
        </div>
        <div>
          <label>Новый пароль</label>
          <input type="password" value={newPassword} onInput={e => setNewPassword(e.target.value)} required />
        </div>
        <div>
          <label>Подтверждение нового пароля</label>
          <input type="password" value={confirmPassword} onInput={e => setConfirmPassword(e.target.value)} required />
        </div>
        <button type="submit">Сменить пароль</button>
        {message && <p class="success">{message}</p>}
        {error && <p class="error">{error}</p>}
      </form>
    </div>
  );
};