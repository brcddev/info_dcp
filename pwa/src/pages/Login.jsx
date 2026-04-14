import { useState } from 'preact/hooks';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (!ok) setError('Неверный логин или пароль');
  };

  return (
    <div class="login-container">
      <div class="login-card">
        <h1>📱 Message DCP</h1>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Логин" value={username} onInput={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Пароль" value={password} onInput={e => setPassword(e.target.value)} />
          <button type="submit">Войти</button>
          {error && <p class="error">{error}</p>}
        </form>
      </div>
    </div>
  );
};