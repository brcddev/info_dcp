import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setUser({ username: data.username, role: data.role, token });
          } else {
            localStorage.removeItem('token');
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      setUser({ username: data.username, role: data.role, token: data.token });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};