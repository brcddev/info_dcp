// src/main.jsx
import { render } from 'preact';
import { AuthProvider } from './contexts/AuthContext';
import { App } from './App';

render(
  <AuthProvider>
    <App />
  </AuthProvider>,
  document.getElementById('app')
);