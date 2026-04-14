// src/api.js
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

// Если в ESPManagement.jsx используется fetchApi, добавим alias
export const fetchApi = authFetch;