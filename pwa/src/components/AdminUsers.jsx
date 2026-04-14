// src/components/AdminUsers.jsx
import { useEffect, useState } from 'preact/hooks';
import { authFetch } from '../api';
import { useAuth } from '../contexts/AuthContext';

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = () => {
    authFetch('/api/auth/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const addUser = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Пользователь ${newUsername} добавлен`);
        setNewUsername('');
        setNewPassword('');
        loadUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  const deleteUser = async (username) => {
    if (username === currentUser.username) {
      setError('Нельзя удалить самого себя');
      return;
    }
    if (!confirm(`Удалить пользователя ${username}?`)) return;
    try {
      const res = await authFetch(`/api/auth/users/${username}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage(`Пользователь ${username} удалён`);
        loadUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  return (
    <div class="admin-users">
      <h2>👥 Управление пользователями</h2>
      <form onSubmit={addUser}>
        <input type="text" placeholder="Логин" value={newUsername} onInput={e => setNewUsername(e.target.value)} required />
        <input type="password" placeholder="Пароль" value={newPassword} onInput={e => setNewPassword(e.target.value)} required />
        <button type="submit">Добавить</button>
      </form>
      {message && <p class="success">{message}</p>}
      {error && <p class="error">{error}</p>}
      <table>
        <thead>
          <tr><th>Логин</th><th>Роль</th><th></th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.username}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td><button onClick={() => deleteUser(u.username)} disabled={u.username === currentUser.username}>Удалить</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};