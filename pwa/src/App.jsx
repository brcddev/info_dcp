import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { MainApp } from './MainApp'; // ваш основной компонент

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <div class="loading">Загрузка...</div>;
  return user ? <MainApp /> : <Login />;
}